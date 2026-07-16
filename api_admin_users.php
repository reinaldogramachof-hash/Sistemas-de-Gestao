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
        'Content-Type: application/json'
    ];

    // Chaves sb_secret atuais nao sao JWTs: elas devem seguir apenas no apikey.
    // A chave service_role legada continua exigindo Authorization para bypass de RLS.
    if (!str_starts_with($SUPABASE_KEY, 'sb_secret_')) {
        $headers[] = "Authorization: Bearer $SUPABASE_KEY";
    }
    if (in_array($method, ['POST', 'PATCH'], true)) {
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

    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&role=eq.owner&active=eq.true&select=user_id';
    $res = supabase_admin_request('GET', $endpoint);

    if ($res['code'] === 200 && !empty($res['data'])) {
        return count($res['data']);
    }
    return 0;
}

// VALIDA PROVA DE LICENÇA ATIVA
function validate_license_proof($licenseKey, $requestEmail, $tenantId) {
    global $fileLicenses;
    
    if (empty($licenseKey) || empty($requestEmail) || empty($tenantId)) {
        return false;
    }

    $db = getDB($fileLicenses);

    if (!isset($db[$licenseKey])) {
        return false;
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
    $licenseTenant = trim((string)($license['tenant_id'] ?? ''));
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

    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&role=eq.owner&active=eq.true&select=user_id';
    $res = supabase_admin_request('GET', $endpoint);

    if ($res['code'] !== 200) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Erro ao consultar banco de dados.']);
        exit;
    }

    $hasOwner = !empty($res['data']);
    echo json_encode(['status' => 'success', 'has_owner' => $hasOwner]);
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
    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . urlencode($tenantId) . '&role=eq.owner&active=eq.true&select=user_id';
    $checkOwner = supabase_admin_request('GET', $endpoint);
    if (!empty($checkOwner['data'])) {
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
            // Se não tem vínculo, prossegue para criar o vínculo abaixo
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

// SE CHEGOU AQUI E A ACTION NÃO COMBINOU
http_response_code(404);
echo json_encode(['status' => 'error', 'message' => 'Ação não encontrada.']);
exit;
