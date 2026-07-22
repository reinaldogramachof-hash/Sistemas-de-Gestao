<?php
// API V12.2 - SECURE ADMIN USERS & FIRST ACCESS HARDENING
require_once __DIR__ . '/env_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

// --- CORS RÍGIDO (V12.2) ---
// Adota allowlist exata configurada no ambiente (ALLOWED_ORIGIN)
$ALLOWED_ORIGIN_ENV = env('ALLOWED_ORIGIN', 'https://sistemasdegestao.tech');
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!empty($requestOrigin) && $requestOrigin === $ALLOWED_ORIGIN_ENV) {
    header("Access-Control-Allow-Origin: $requestOrigin");
} else {
    header("Access-Control-Allow-Origin: $ALLOWED_ORIGIN_ENV");
}
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. VERIFICAÇÃO DOS SEGREDOS CRÍTICOS DO SUPABASE
$SUPABASE_URL = env('SUPABASE_URL');
$SUPABASE_KEY = env('SUPABASE_SERVICE_KEY');
$normalizedSupabaseUrl = strtolower((string) $SUPABASE_URL);
$normalizedSupabaseKey = strtolower((string) $SUPABASE_KEY);

if (
    empty($SUPABASE_URL) || 
    empty($SUPABASE_KEY) || 
    str_contains($normalizedSupabaseUrl, 'sua-url') ||
    str_contains($normalizedSupabaseKey, 'sua-service-role') ||
    str_contains($normalizedSupabaseKey, 'substitua')
) {
    http_response_code(503);
    echo json_encode(['status' => 'error', 'message' => 'Serviço temporariamente indisponível.']);
    exit;
}

// 2. CAPTURA DE DADOS
$rawInput = file_get_contents("php://input");
$jsonData = json_decode($rawInput, true) ?? [];
$action = $jsonData['action'] ?? '';

// --- ARQUIVOS DE DADOS E LOGS ---
$fileLicenses = __DIR__ . '/api_data/database_licenses_secure.json';
$fileAuditLogs = __DIR__ . '/api_data/audit_logs.json';

// --- HELPERS ---
function getDB($file)
{
    if (!file_exists($file))
        return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?? [];
}

function log_denied_attempt($msg)
{
    global $fileAuditLogs;
    $db = [];
    if (file_exists($fileAuditLogs)) {
        $content = file_get_contents($fileAuditLogs);
        $db = json_decode($content, true) ?? [];
    }
    $db[] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        'message' => $msg
    ];
    if (count($db) > 500) {
        array_shift($db);
    }
    if (!is_dir(dirname($fileAuditLogs))) {
        mkdir(dirname($fileAuditLogs), 0755, true);
    }
    file_put_contents($fileAuditLogs, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// REQUISÃO SUPABASE COM SERVICE ROLE
function supabase_http_request($method, $url, array $headers, $body = null)
{
    $payload = $body === null ? null : json_encode($body);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        if (defined('CURL_IPRESOLVE_V4')) {
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        }
        if ($payload !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        return ['code' => $httpCode, 'raw' => $response ?: '', 'error' => $error];
    }

    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $payload ?? '',
        'ignore_errors' => true,
        'timeout' => 30,
    ]]);
    $response = @file_get_contents($url, false, $context);
    $responseHeaders = $http_response_header ?? [];
    $statusLine = $responseHeaders[0] ?? '';
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);

    return [
        'code' => isset($matches[1]) ? (int) $matches[1] : 0,
        'raw' => $response === false ? '' : $response,
        'error' => $response === false ? 'Falha na comunicação HTTP com o Supabase.' : '',
    ];
}

function supabase_admin_request($method, $endpoint, $body = null)
{
    global $SUPABASE_URL, $SUPABASE_KEY;

    $headers = [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $SUPABASE_KEY",
        'Content-Type: application/json'
    ];
    if (in_array($method, ['POST', 'PATCH', 'PUT'], true)) {
        $headers[] = 'Prefer: return=representation';
    }

    $result = supabase_http_request($method, rtrim($SUPABASE_URL, '/') . $endpoint, $headers, $body);
    return [
        'code' => $result['code'],
        'data' => json_decode($result['raw'], true),
        'error' => $result['error'],
        'raw' => $result['raw']
    ];
}

function sanitize_audit_metadata($metadata)
{
    if (!is_array($metadata)) return [];

    $safe = [];
    $blocked = '/password|token|secret|license|email|phone|name|description|observation|customer|item|address/i';
    foreach (array_slice($metadata, 0, 20, true) as $key => $value) {
        $key = substr(preg_replace('/[^a-z0-9_.-]/i', '_', (string)$key), 0, 48);
        if ($key === '' || preg_match($blocked, $key)) continue;
        if (is_bool($value) || is_int($value) || is_float($value)) {
            $safe[$key] = $value;
        } elseif (is_string($value)) {
            $safe[$key] = substr($value, 0, 120);
        }
    }
    return $safe;
}

function write_saas_audit($actorUserId, $tenantId, $action, array $payload = [])
{
    $safeAction = preg_replace('/[^a-z0-9_.-]/i', '_', substr((string)$action, 0, 80));
    $correlationId = trim((string)($payload['correlation_id'] ?? ''));
    $safePayload = [
        'correlation_id' => substr($correlationId !== '' ? $correlationId : bin2hex(random_bytes(8)), 0, 64),
        'metadata' => sanitize_audit_metadata($payload['metadata'] ?? []),
    ];
    $tenant = supabase_admin_request('GET', '/rest/v1/tenants?select=customer_id,system_id&id=eq.' . urlencode($tenantId) . '&limit=1');
    $tenantRow = ($tenant['code'] === 200 && !empty($tenant['data'][0])) ? $tenant['data'][0] : [];
    return supabase_admin_request('POST', '/rest/v1/saas_audit_logs', [
        'actor_user_id' => $actorUserId,
        'action' => $safeAction,
        'customer_id' => $tenantRow['customer_id'] ?? null,
        'tenant_id' => $tenantId,
        'system_id' => $tenantRow['system_id'] ?? null,
        'payload' => $safePayload,
    ]);
}

function is_valid_private_lan_origin($origin)
{
    if ($origin === '') return true;
    $parts = parse_url($origin);
    if (!is_array($parts)) return false;
    if (!in_array($parts['scheme'] ?? '', ['http', 'https'], true)) return false;
    if (!isset($parts['host'], $parts['port']) || isset($parts['user']) || isset($parts['pass'])) return false;
    if (($parts['path'] ?? '') !== '' || isset($parts['query']) || isset($parts['fragment'])) return false;

    $host = (string)$parts['host'];
    $port = (int)$parts['port'];
    if ($port < 1 || $port > 65535 || filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) === false) return false;

    return preg_match('/^10\./', $host) === 1
        || preg_match('/^192\.168\./', $host) === 1
        || preg_match('/^172\.(1[6-9]|2\d|3[01])\./', $host) === 1;
}

// VALIDA TOKEN JWT DO USUÁRIO LOGADO
function get_authenticated_user($jwt) {
    global $SUPABASE_URL, $SUPABASE_KEY;

    if (empty($jwt)) return null;

    $headers = [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $jwt"
    ];

    $result = supabase_http_request('GET', rtrim($SUPABASE_URL, '/') . '/auth/v1/user', $headers);
    if ($result['code'] === 200) {
        return json_decode($result['raw'], true);
    }
    return null;
}

// CONSULTA O CARGO REAL DE QUALQUE MEMBRO NO TENANT
function get_member_role($userId, $tenantId) {
    if (!$userId || !$tenantId) return null;

    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&user_id=eq.' . urlencode($userId);
    $res = supabase_admin_request('GET', $endpoint);

    if ($res['code'] === 200 && !empty($res['data'])) {
        return $res['data'][0]; // Retorna role, active, display_name, etc.
    }
    return null;
}

// RETORNA A QUANTIDADE DE OWNERS ATIVOS NO TENANT
function count_active_owners($tenantId) {
    if (!$tenantId) return 0;

    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&role=eq.owner&active=eq.true&select=user_id,display_name';
    $res = supabase_admin_request('GET', $endpoint);

    if ($res['code'] === 200 && !empty($res['data'])) {
        return count($res['data']);
    }
    return 0;
}

// VALIDA PROVA DE LICENÇA ATIVA
function get_auth_admin_user($userId) {
    if (!$userId) return null;

    $res = supabase_admin_request('GET', '/auth/v1/admin/users/' . urlencode($userId));
    if ($res['code'] === 200 && !empty($res['data'])) {
        return $res['data'];
    }
    return null;
}

function owner_requires_first_access($userId) {
    $authUser = get_auth_admin_user($userId);
    if (!$authUser) return false;

    $appMetadata = is_array($authUser['app_metadata'] ?? null) ? $authUser['app_metadata'] : [];
    return !empty($appMetadata['must_change_password']);
}

function normalizeTenantSlugValue($slug)
{
    return preg_replace('/[^a-z0-9-]/', '', strtolower(trim((string)$slug)));
}

function resolveKnownTenantId($slug)
{
    return null;
}

function getLicenseTenantId(array $license)
{
    return $license['tenant_id'] ?? resolveKnownTenantId($license['tenant_slug'] ?? '');
}

function validate_saas_license_proof($licenseKey, $requestEmail, $tenantId) {
    if (empty($licenseKey) || empty($requestEmail) || empty($tenantId)) {
        return false;
    }

    $endpoint = '/rest/v1/licenses?select=license_key,status,expires_at,tenant_id,activation_email,customers(email)&license_key=eq.'
        . rawurlencode($licenseKey)
        . '&tenant_id=eq.'
        . rawurlencode($tenantId)
        . '&limit=1';
    $res = supabase_admin_request('GET', $endpoint);

    if ($res['code'] !== 200 || empty($res['data'][0])) {
        return false;
    }

    $license = $res['data'][0];
    $status = $license['status'] ?? '';
    if (!empty($license['expires_at']) && time() > strtotime($license['expires_at'])) {
        $status = 'expired';
    }
    if ($status !== 'active') {
        return false;
    }

    $customer = $license['customers'] ?? [];
    $licenseEmail = strtolower(trim((string)($license['activation_email'] ?? $customer['email'] ?? '')));
    $requestEmailNormalized = strtolower(trim((string)$requestEmail));

    return $licenseEmail !== '' && $requestEmailNormalized !== '' && hash_equals($licenseEmail, $requestEmailNormalized);
}

function validate_license_proof($licenseKey, $requestEmail, $tenantId) {
    global $fileLicenses;
    
    if (empty($licenseKey) || empty($requestEmail) || empty($tenantId)) {
        return false;
    }

    $db = getDB($fileLicenses);

    if (!isset($db[$licenseKey])) {
        return validate_saas_license_proof($licenseKey, $requestEmail, $tenantId);
    }

    $license = $db[$licenseKey];

    // 1. Licença deve estar ativa
    $status = $license['status'] ?? '';
    if (!empty($license['expiration_date'])) {
        $exp = strtotime($license['expiration_date']);
        if (time() > $exp) {
            $status = 'expired';
        }
    }

    if ($status !== 'active') {
        return false;
    }

    // 2. O tenant retornado pela licença é o tenant solicitado
    $licenseTenant = trim((string)getLicenseTenantId($license));
    if ($licenseTenant === '' || !hash_equals(strtolower($licenseTenant), strtolower(trim($tenantId)))) {
        return false;
    }

    // 3. O e-mail informado corresponde ao e-mail proprietário da licença
    $licenseEmail = strtolower(trim((string)($license['email_activation'] ?? $license['owner_email'] ?? '')));
    $requestEmailNormalized = strtolower(trim((string)$requestEmail));

    if ($licenseEmail === '' || $requestEmailNormalized === '' || !hash_equals($licenseEmail, $requestEmailNormalized)) {
        return false;
    }

    return true;
}

// --- ROTAS DO FLUXO OPERACIONAL ---

// ACTION 1: VERIFICA SE EXISTE PROPRIETÁRIO (OWNER) NO TENANT
if ($action === 'get_owner_status') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $licenseKey = trim($jsonData['license_key'] ?? '');
    $email = trim($jsonData['email'] ?? '');

    // Validação estrita de prova de licença ativa no servidor
    if (!validate_license_proof($licenseKey, $email, $tenantId)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Prova de licença ativa inválida ou não autorizada.']);
        exit;
    }

    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&role=eq.owner&active=eq.true&select=user_id,display_name';
    $res = supabase_admin_request('GET', $endpoint);

    if ($res['code'] !== 200) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao consultar banco de dados.']);
        exit;
    }

    $owner = $res['data'][0] ?? null;
    $hasOwner = !empty($owner);
    $setupRequired = $hasOwner && owner_requires_first_access($owner['user_id'] ?? '');
    $response = [
        'status' => 'success',
        'has_owner' => $hasOwner && !$setupRequired
    ];
    if ($setupRequired) {
        $response['setup_required'] = true;
    }
    if (!empty($owner['display_name'])) {
        $response['owner_name'] = $owner['display_name'];
    }
    echo json_encode($response);
    exit;
}

// ACTION 2: CRIA O PRIMEIRO PROPRIETÁRIO (PRIMEIRO ACESSO)
if ($action === 'create_owner') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $licenseKey = trim($jsonData['license_key'] ?? '');
    $email = trim($jsonData['email'] ?? '');
    $name = trim($jsonData['name'] ?? '');
    $password = trim($jsonData['password'] ?? '');

    // Validação estrita de prova de licença ativa no servidor
    if (!validate_license_proof($licenseKey, $email, $tenantId)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Prova de licença ativa inválida ou não autorizada.']);
        exit;
    }

    if (empty($name) || empty($password)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Todos os campos são obrigatórios.']);
        exit;
    }

    // 1. Verifica se já existe owner ativo no tenant
    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&role=eq.owner&active=eq.true&select=user_id,display_name';
    $checkOwner = supabase_admin_request('GET', $endpoint);
    if (!empty($checkOwner['data'])) {
        $existingOwner = $checkOwner['data'][0];
        $existingOwnerId = $existingOwner['user_id'] ?? '';

        if (owner_requires_first_access($existingOwnerId)) {
            $authUser = get_auth_admin_user($existingOwnerId);
            $existingAppMetadata = is_array($authUser['app_metadata'] ?? null) ? $authUser['app_metadata'] : [];
            $existingUserMetadata = is_array($authUser['user_metadata'] ?? null) ? $authUser['user_metadata'] : [];
            $existingAppMetadata['must_change_password'] = false;
            $existingUserMetadata['display_name'] = $name;

            $updateUserRes = supabase_admin_request('PUT', '/auth/v1/admin/users/' . urlencode($existingOwnerId), [
                'email' => $email,
                'password' => $password,
                'email_confirm' => true,
                'app_metadata' => $existingAppMetadata,
                'user_metadata' => $existingUserMetadata
            ]);

            if ($updateUserRes['code'] >= 400) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Erro ao atualizar senha do primeiro acesso.']);
                exit;
            }

            $memberUpdateEndpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&user_id=eq.' . urlencode($existingOwnerId);
            $memberUpdateRes = supabase_admin_request('PATCH', $memberUpdateEndpoint, ['display_name' => $name]);
            if ($memberUpdateRes['code'] >= 400) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Senha criada, mas nao foi possivel atualizar o nome administrativo.']);
                exit;
            }

            echo json_encode(['status' => 'success', 'message' => 'Primeiro acesso configurado com sucesso!']);
            exit;
        }

        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Este restaurante já possui um proprietário ativo cadastrado.']);
        exit;
    }

    // 2. Cria o usuário no Supabase Auth
    $userPayload = [
        'email' => $email,
        'password' => $password,
        'email_confirm' => true,
        'user_metadata' => [
            'display_name' => $name
        ]
    ];
    $userRes = supabase_admin_request('POST', '/auth/v1/admin/users', $userPayload);

    if ($userRes['code'] >= 400) {
        // Trata duplicidade de e-mail no Auth do Supabase retornando 409
        if ($userRes['code'] === 422 || (isset($userRes['data']['msg']) && str_contains($userRes['data']['msg'], 'already exists'))) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Uma conta com este e-mail já existe no sistema.']);
        } else {
            http_response_code($userRes['code']);
            echo json_encode([
                'status' => 'error',
                'message' => $userRes['data']['msg'] ?? 'Erro ao criar conta de proprietário.'
            ]);
        }
        exit;
    }

    $newUserId = $userRes['data']['id'] ?? null;
    if (!$newUserId) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro interno ao recuperar ID do usuário criado.']);
        exit;
    }

    // 3. Cria o vínculo em tenant_members
    $memberPayload = [
        'tenant_id' => $tenantId,
        'user_id' => $newUserId,
        'role' => 'owner',
        'active' => true,
        'display_name' => $name
    ];
    $memberRes = supabase_admin_request('POST', '/rest/v1/tenant_members', $memberPayload);

    if ($memberRes['code'] >= 400) {
        // Rollback do usuário Auth para manter consistência absoluta
        supabase_admin_request('DELETE', '/auth/v1/admin/users/' . $newUserId);

        // Se falhou por conflito de chave única ou restrição de banco, retorna 409
        if ($memberRes['code'] === 409 || (isset($memberRes['data']['message']) && str_contains($memberRes['data']['message'], 'duplicate'))) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'message' => 'Este restaurante já possui um proprietário ativo cadastrado.']);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Erro ao criar vínculo administrativo no restaurante.']);
        }
        exit;
    }

    echo json_encode(['status' => 'success', 'message' => 'Proprietária cadastrada com sucesso!']);
    exit;
}

// CAPTURA DO JWT PARA ROTAS PROTEGIDAS DE EQUIPE
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$jwt = '';
if (preg_match('/Bearer\s(\S+)/i', $authHeader, $matches)) {
    $jwt = $matches[1];
}

$authUser = get_authenticated_user($jwt);
if (!$authUser) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Sessão administrativa expirada ou inválida.']);
    exit;
}
$adminUserId = $authUser['id'];

if ($action === 'validate_member_access') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $requiredRole = trim($jsonData['required_role'] ?? '');

    if (empty($tenantId)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Tenant ID e obrigatorio.']);
        exit;
    }

    $member = get_member_role($adminUserId, $tenantId);
    if (!$member) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Usuario nao esta ativo neste restaurante.']);
        exit;
    }

    if ($member['active'] !== true) {
        write_saas_audit($adminUserId, $tenantId, 'comanda_access_denied', ['metadata' => ['reason' => 'inactive_member']]);
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Usuario nao esta ativo neste restaurante.']);
        exit;
    }

    $allowedRoles = ['owner', 'admin', 'cashier', 'waiter'];
    if (!in_array($member['role'] ?? '', $allowedRoles, true)) {
        write_saas_audit($adminUserId, $tenantId, 'comanda_access_denied', ['metadata' => ['reason' => 'role_mismatch']]);
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Usuario nao possui cargo valido neste restaurante.']);
        exit;
    }

    if ($requiredRole !== '' && $requiredRole !== 'team' && ($member['role'] ?? '') !== $requiredRole) {
        write_saas_audit($adminUserId, $tenantId, 'comanda_access_denied', ['metadata' => ['reason' => 'role_mismatch_specific']]);
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Usuario nao possui o cargo especifico requerido.']);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'member' => [
            'user_id' => $adminUserId,
            'tenant_id' => $tenantId,
            'role' => $member['role'] ?? '',
            'active' => (bool)($member['active'] ?? false),
            'display_name' => $member['display_name'] ?? ''
        ]
    ]);
    exit;
}

if ($action === 'get_waiter_access_settings') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $member = get_member_role($adminUserId, $tenantId);
    if (!$tenantId || !$member || ($member['active'] ?? false) !== true) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissao negada.']);
        exit;
    }
    $res = supabase_admin_request('GET', '/rest/v1/tenants?select=metadata&id=eq.' . urlencode($tenantId) . '&limit=1');
    if ($res['code'] !== 200) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'message' => 'Configuracao temporariamente indisponivel.']);
        exit;
    }
    $metadata = ($res['code'] === 200 && !empty($res['data'][0]['metadata']) && is_array($res['data'][0]['metadata'])) ? $res['data'][0]['metadata'] : [];
    echo json_encode(['status' => 'success', 'settings' => $metadata['waiter_access'] ?? []]);
    exit;
}

if ($action === 'save_waiter_access_settings') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $member = get_member_role($adminUserId, $tenantId);
    if (!$tenantId || !$member || ($member['active'] ?? false) !== true || !in_array($member['role'] ?? '', ['owner', 'admin'], true)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Apenas proprietario ou administrador pode alterar o acesso dos garçons.']);
        exit;
    }
    $input = is_array($jsonData['settings'] ?? null) ? $jsonData['settings'] : [];
    $mode = ($input['waiterAccessMode'] ?? 'local') === 'external' ? 'external' : 'local';
    $origin = trim((string)($input['waiterLocalOrigin'] ?? ''));
    if (strlen($origin) > 180 || !is_valid_private_lan_origin($origin)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Endereco de rede local invalido.']);
        exit;
    }
    $updated = supabase_admin_request('POST', '/rest/v1/rpc/set_tenant_waiter_access_settings', [
        'p_tenant_id' => $tenantId,
        'p_settings' => ['waiterAccessMode' => $mode, 'waiterLocalOrigin' => $origin],
    ]);
    if ($updated['code'] >= 400) {
        http_response_code(503);
        echo json_encode(['status' => 'error', 'message' => 'Falha ao salvar configuracao de acesso.']);
        exit;
    }
    if (($updated['data'] ?? false) !== true) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Restaurante nao encontrado.']);
        exit;
    }
    write_saas_audit($adminUserId, $tenantId, 'waiter_access_configuration_updated', ['metadata' => ['mode' => $mode, 'has_lan_origin' => $origin !== '']]);
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'write_audit_event') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $member = get_member_role($adminUserId, $tenantId);
    if (!$tenantId || !$member || ($member['active'] ?? false) !== true) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissao negada.']);
        exit;
    }
    $event = is_array($jsonData['event'] ?? null) ? $jsonData['event'] : [];
    $actionName = 'client.' . trim((string)($event['action'] ?? 'operational_event'));
    $metadata = is_array($event['metadata'] ?? null) ? $event['metadata'] : [];
    write_saas_audit($adminUserId, $tenantId, $actionName, ['correlation_id' => $event['correlation_id'] ?? '', 'metadata' => $metadata]);
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'update_my_profile') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $name = trim($jsonData['name'] ?? '');
    $phone = trim($jsonData['phone'] ?? '');

    if (empty($tenantId) || empty($name)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Tenant ID e nome sao obrigatorios.']);
        exit;
    }

    $requester = get_member_role($adminUserId, $tenantId);
    if (!$requester || $requester['active'] !== true) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissao negada.']);
        exit;
    }

    $currentMetadata = is_array($authUser['user_metadata'] ?? null) ? $authUser['user_metadata'] : [];
    $currentMetadata['display_name'] = $name;
    $currentMetadata['phone'] = $phone;

    $userUpdateRes = supabase_admin_request('PUT', '/auth/v1/admin/users/' . urlencode($adminUserId), [
        'user_metadata' => $currentMetadata
    ]);

    if ($userUpdateRes['code'] >= 400) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao atualizar dados do administrador.']);
        exit;
    }

    $memberEndpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&user_id=eq.' . urlencode($adminUserId);
    $memberUpdateRes = supabase_admin_request('PATCH', $memberEndpoint, ['display_name' => $name]);
    if ($memberUpdateRes['code'] >= 400) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Dados do Auth atualizados, mas falha ao atualizar o vinculo administrativo.']);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Dados do administrador atualizados com sucesso.',
        'profile' => [
            'name' => $name,
            'phone' => $phone
        ]
    ]);
    exit;
}

// ACTION 3: CRIA MEMBRO DA EQUIPE (RESTRITO POR CARGO)
if ($action === 'create_member') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $name = trim($jsonData['name'] ?? '');
    $email = trim($jsonData['email'] ?? '');
    $password = trim($jsonData['password'] ?? '');
    $role = trim($jsonData['role'] ?? 'waiter'); // waiter, cashier, admin

    if (empty($tenantId) || empty($name) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Todos os campos são obrigatórios.']);
        exit;
    }

    if (!in_array($role, ['waiter', 'cashier', 'admin'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Função inválida.']);
        exit;
    }

    // 1. Consulta o cargo real do solicitante no tenant
    $requester = get_member_role($adminUserId, $tenantId);
    if (!$requester || $requester['active'] !== true) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou cadastrar membro sem cargo ativo no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissão negada.']);
        exit;
    }

    // 2. Restrições de privilégios de criação:
    // - Ninguém cria owner por essa rota
    if ($role === 'owner') {
        log_denied_attempt("Tentativa negada de criar owner: usuario $adminUserId tentou cadastrar uma owner no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Não é permitido criar um proprietário por esta rota.']);
        exit;
    }

    // - admin cria somente cashier e waiter
    if ($requester['role'] === 'admin' && $role === 'admin') {
        log_denied_attempt("Tentativa negada de criar admin: admin $adminUserId tentou cadastrar outro admin no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Administradores não possuem permissão para cadastrar outros administradores.']);
        exit;
    }

    // - Apenas owner ou admin podem criar membros
    if (!in_array($requester['role'], ['owner', 'admin'])) {
        log_denied_attempt("Tentativa negada de criar membro: cargo {$requester['role']} (usuario $adminUserId) tentou cadastrar membro no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Seu cargo não possui permissão para cadastrar colaboradores.']);
        exit;
    }

    // 3. Cria usuário no Supabase Auth
    $userPayload = [
        'email' => $email,
        'password' => $password,
        'email_confirm' => true,
        'user_metadata' => [
            'display_name' => $name
        ]
    ];
    $userRes = supabase_admin_request('POST', '/auth/v1/admin/users', $userPayload);

    $isExistingUser = false;
    $newUserId = null;

    if ($userRes['code'] >= 400) {
        $isAlreadyExists = $userRes['code'] === 422 || (isset($userRes['data']['msg']) && str_contains($userRes['data']['msg'], 'already exists'));
        
        if ($isAlreadyExists) {
            // Usuário já existe no Auth. Vamos tentar recuperá-lo pelo e-mail
            $authUsersRes = supabase_admin_request('GET', '/auth/v1/admin/users');
            $existingUser = null;
            if ($authUsersRes['code'] === 200 && isset($authUsersRes['data']['users'])) {
                foreach ($authUsersRes['data']['users'] as $u) {
                    if (isset($u['email']) && strtolower($u['email']) === strtolower($email)) {
                        $existingUser = $u;
                        break;
                    }
                }
            }

            if (!$existingUser) {
                http_response_code(409);
                echo json_encode(['status' => 'error', 'message' => 'Um colaborador com este e-mail já existe no sistema Auth, mas não pôde ser recuperado.']);
                exit;
            }

            $newUserId = $existingUser['id'];
            $isExistingUser = true;

            // Verifica se o usuário já tem algum vínculo em tenant_members
            $endpoint = '/rest/v1/tenant_members?user_id=eq.' . urlencode($newUserId);
            $checkMembers = supabase_admin_request('GET', $endpoint);

            if ($checkMembers['code'] === 200 && !empty($checkMembers['data'])) {
                $membership = $checkMembers['data'][0];
                
                // Se já estiver vinculado a este tenant
                if ($membership['tenant_id'] === $tenantId) {
                    http_response_code(409);
                    echo json_encode(['status' => 'error', 'message' => 'Este colaborador já está cadastrado e vinculado a este restaurante.']);
                    exit;
                } else {
                    // Pertence a outro tenant/restaurante
                    log_denied_attempt("Acesso negado: proprietario tentou vincular usuario $newUserId que pertence a outro tenant (" . $membership['tenant_id'] . ").");
                    http_response_code(403);
                    echo json_encode(['status' => 'error', 'message' => 'Este e-mail pertence a um usuário de outro restaurante e não pode ser vinculado.']);
                    exit;
                }
            }
            // Se nao tem vinculo, atualiza a senha informada e prossegue para criar o vinculo abaixo.
            $existingMetadata = is_array($existingUser['user_metadata'] ?? null) ? $existingUser['user_metadata'] : [];
            $existingMetadata['display_name'] = $name;
            $existingUpdateRes = supabase_admin_request('PUT', '/auth/v1/admin/users/' . urlencode($newUserId), [
                'email' => $email,
                'password' => $password,
                'email_confirm' => true,
                'user_metadata' => $existingMetadata
            ]);

            if ($existingUpdateRes['code'] >= 400) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'O e-mail ja existia, mas nao foi possivel atualizar a senha de acesso.']);
                exit;
            }
        } else {
            // Outro erro de criação no Auth
            http_response_code($userRes['code']);
            echo json_encode([
                'status' => 'error',
                'message' => $userRes['data']['msg'] ?? 'Erro ao criar conta de colaborador.'
            ]);
            exit;
        }
    } else {
        $newUserId = $userRes['data']['id'] ?? null;
    }

    if (!$newUserId) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro interno ao recuperar ID do colaborador.']);
        exit;
    }

    // 4. Cria o vínculo em tenant_members
    $memberPayload = [
        'tenant_id' => $tenantId,
        'user_id' => $newUserId,
        'role' => $role,
        'active' => true,
        'display_name' => $name
    ];
    $memberRes = supabase_admin_request('POST', '/rest/v1/tenant_members', $memberPayload);

    if ($memberRes['code'] >= 400) {
        // Rollback do usuário Auth apenas se ele foi criado nesta chamada
        if (!$isExistingUser) {
            supabase_admin_request('DELETE', '/auth/v1/admin/users/' . $newUserId);
        }

        $rawDetail = $memberRes['data']['message'] ?? json_encode($memberRes['data']);
        log_denied_attempt("Falha ao vincular colaborador $newUserId no tenant $tenantId. Code {$memberRes['code']} - $rawDetail");

        // Mapeia erros técnicos do banco para mensagens operacionais limpas
        $errMsg = 'Não foi possível vincular o colaborador ao restaurante.';
        if (str_contains($rawDetail, 'role_check') || str_contains($rawDetail, 'check constraint')) {
            $errMsg = 'Função inválida: o papel informado não é suportado pelo sistema. Verifique e tente novamente.';
        } elseif (str_contains($rawDetail, 'duplicate') || str_contains($rawDetail, 'unique')) {
            $errMsg = 'Este colaborador já está cadastrado neste restaurante.';
        }

        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => $errMsg]);
        exit;
    }

    echo json_encode(['status' => 'success', 'message' => 'Colaborador adicionado com sucesso!']);
    exit;
}

// ACTION 4: ATIVA/DESATIVA ACESSO DE UM MEMBRO DE EQUIPE (RESTRITO POR CARGO)
if ($action === 'toggle_member_status') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $targetUserId = trim($jsonData['user_id'] ?? '');
    $active = (bool)($jsonData['active'] ?? false);

    if (empty($tenantId) || empty($targetUserId)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Tenant ID e User ID do colaborador são obrigatórios.']);
        exit;
    }

    // Não permite desativar a si próprio para evitar bloqueio acidental
    if ($adminUserId === $targetUserId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Você não pode desativar o seu próprio acesso.']);
        exit;
    }

    // 1. Consulta cargo do solicitante no tenant
    $requester = get_member_role($adminUserId, $tenantId);
    if (!$requester || $requester['active'] !== true) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou alterar status de membro sem cargo ativo no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissão negada.']);
        exit;
    }

    // 2. Consulta cargo do usuário alvo no tenant
    $target = get_member_role($targetUserId, $tenantId);
    if (!$target) {
        // Não permitir alteração de usuário que não pertença ao tenant
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou alterar status do usuario $targetUserId que nao pertence ao tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Colaborador não encontrado ou não pertence a este restaurante.']);
        exit;
    }

    // 3. Restrições de privilégios de alteração:
    // - admin não pode alterar, ativar ou desativar owner ou outro admin
    if ($requester['role'] === 'admin' && in_array($target['role'], ['owner', 'admin'])) {
        log_denied_attempt("Acesso negado: admin $adminUserId tentou alterar status de {$target['role']} $targetUserId no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Administradores não possuem permissão para alterar status de outros administradores ou proprietários.']);
        exit;
    }

    // - Ninguém pode desativar a última owner ativa
    if ($target['role'] === 'owner' && !$active) {
        if (count_active_owners($tenantId) <= 1) {
            log_denied_attempt("Acesso negado: usuario $adminUserId tentou desativar a unica owner ativa ($targetUserId) no tenant $tenantId.");
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Não é permitido desativar o último proprietário ativo do restaurante.']);
            exit;
        }
    }

    // - Apenas owner ou admin podem gerenciar membros
    if (!in_array($requester['role'], ['owner', 'admin'])) {
        log_denied_attempt("Acesso negado: cargo {$requester['role']} (usuario $adminUserId) tentou alterar status do colaborador $targetUserId no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Seu cargo não possui permissão para gerenciar a equipe.']);
        exit;
    }

    // 4. Atualiza status na tabela tenant_members
    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&user_id=eq.' . urlencode($targetUserId);
    $patchRes = supabase_admin_request('PATCH', $endpoint, ['active' => $active]);

    if ($patchRes['code'] >= 400) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao atualizar status do colaborador.']);
        exit;
    }

    echo json_encode(['status' => 'success', 'message' => 'Status do colaborador atualizado com sucesso!']);
    exit;
}

// ACTION 5: EDITA DADOS DE ACESSO DE UM MEMBRO DE EQUIPE (RESTRITO POR CARGO)
if ($action === 'update_member') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $targetUserId = trim($jsonData['user_id'] ?? '');
    $name = trim($jsonData['name'] ?? '');
    $role = trim($jsonData['role'] ?? '');
    $active = (bool)($jsonData['active'] ?? true);
    $password = trim($jsonData['password'] ?? '');

    $allowedRoles = ['waiter', 'cashier', 'admin'];
    if (empty($tenantId) || empty($targetUserId) || empty($name) || !in_array($role, $allowedRoles, true)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Informe nome, funcao, tenant e colaborador validos.']);
        exit;
    }

    if ($password !== '' && strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'A nova senha deve ter pelo menos 6 caracteres.']);
        exit;
    }

    $requester = get_member_role($adminUserId, $tenantId);
    if (!$requester || $requester['active'] !== true || !in_array($requester['role'], ['owner', 'admin'], true)) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou editar membro sem permissao ativa no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissao negada para gerenciar equipe.']);
        exit;
    }

    $target = get_member_role($targetUserId, $tenantId);
    if (!$target) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou editar usuario $targetUserId fora do tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Colaborador nao encontrado neste restaurante.']);
        exit;
    }

    if ($requester['role'] === 'admin' && in_array($target['role'], ['owner', 'admin'], true)) {
        log_denied_attempt("Acesso negado: admin $adminUserId tentou editar {$target['role']} $targetUserId no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Administradores nao podem editar outros administradores ou proprietarios.']);
        exit;
    }

    if ($requester['role'] === 'admin' && $role === 'admin') {
        log_denied_attempt("Acesso negado: admin $adminUserId tentou promover $targetUserId a admin no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Somente proprietarios podem conceder acesso de administrador.']);
        exit;
    }

    if ($target['role'] === 'owner' && ($role !== 'admin' || !$active) && count_active_owners($tenantId) <= 1) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou remover ou desativar o unico owner ativo $targetUserId no tenant $tenantId.");
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Nao e permitido remover ou desativar o ultimo proprietario ativo.']);
        exit;
    }

    $authUser = get_auth_admin_user($targetUserId);
    if (!$authUser) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Usuario de autenticacao nao encontrado.']);
        exit;
    }

    $metadata = $authUser['user_metadata'] ?? [];
    $metadata['display_name'] = $name;
    $authPayload = ['user_metadata' => $metadata];
    if ($password !== '') {
        $authPayload['password'] = $password;
        $authPayload['email_confirm'] = true;
    }

    $authUpdateRes = supabase_admin_request('PUT', '/auth/v1/admin/users/' . urlencode($targetUserId), $authPayload);
    if ($authUpdateRes['code'] >= 400) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao atualizar dados de acesso do colaborador.']);
        exit;
    }

    $memberEndpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&user_id=eq.' . urlencode($targetUserId);
    $memberPayload = [
        'display_name' => $name,
        'role' => $role,
        'active' => $active
    ];
    $memberUpdateRes = supabase_admin_request('PATCH', $memberEndpoint, $memberPayload);
    if ($memberUpdateRes['code'] >= 400) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao atualizar vinculo do colaborador.']);
        exit;
    }

    echo json_encode(['status' => 'success', 'message' => 'Colaborador atualizado com sucesso!']);
    exit;
}

// ACTION: EXCLUI MEMBRO DA EQUIPE DEFINITIVAMENTE
if ($action === 'delete_member') {
    $tenantId = trim($jsonData['tenant_id'] ?? '');
    $targetUserId = trim($jsonData['user_id'] ?? '');

    if (empty($tenantId) || empty($targetUserId)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Tenant ID e User ID sao obrigatorios.']);
        exit;
    }

    if ($adminUserId === $targetUserId) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Nao e permitido excluir a propria conta por esta via.']);
        exit;
    }

    $requester = get_member_role($adminUserId, $tenantId);
    if (!$requester || $requester['active'] !== true || !in_array($requester['role'], ['owner', 'admin'], true)) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou excluir membro sem permissao ativa no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Permissao negada para gerenciar equipe.']);
        exit;
    }

    $target = get_member_role($targetUserId, $tenantId);
    if (!$target) {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou excluir usuario $targetUserId fora do tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Colaborador nao encontrado neste restaurante.']);
        exit;
    }

    if ($target['role'] === 'owner') {
        log_denied_attempt("Acesso negado: usuario $adminUserId tentou excluir owner $targetUserId no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Nao e permitido excluir o proprietario do restaurante.']);
        exit;
    }

    if ($requester['role'] === 'admin' && $target['role'] === 'admin') {
        log_denied_attempt("Acesso negado: admin $adminUserId tentou excluir admin $targetUserId no tenant $tenantId.");
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Administradores nao podem excluir outros administradores.']);
        exit;
    }

    // Exclui do Auth. O CASCADE vai limpar de tenant_members.
    $authDelRes = supabase_admin_request('DELETE', '/auth/v1/admin/users/' . urlencode($targetUserId));
    if ($authDelRes['code'] >= 400) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao excluir colaborador do sistema.']);
        exit;
    }

    write_saas_audit($adminUserId, $tenantId, 'member_deleted', ['metadata' => ['deleted_user_id' => $targetUserId, 'role' => $target['role']]]);
    echo json_encode(['status' => 'success', 'message' => 'Colaborador excluido com sucesso.']);
    exit;
}

// SE CHEGOU AQUI E A ACTION NÃO COMBINOU
http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Ação não encontrada.']);
exit;
