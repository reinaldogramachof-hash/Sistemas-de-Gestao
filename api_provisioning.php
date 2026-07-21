<?php
require_once __DIR__ . '/env_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

// --- CORS ---
$ALLOWED_ORIGIN_ENV = env('ALLOWED_ORIGIN', '*');
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$baseDomain = parse_url($ALLOWED_ORIGIN_ENV, PHP_URL_HOST) ?? 'sistemasdegestao.tech';

if (
    $ALLOWED_ORIGIN_ENV === '*' ||
    empty($requestOrigin) ||
    str_contains($requestOrigin, $baseDomain) ||
    str_contains($requestOrigin, 'localhost') ||
    str_contains($requestOrigin, '127.0.0.1')
) {
    $corsOrigin = empty($requestOrigin) ? '*' : $requestOrigin;
} else {
    $corsOrigin = $ALLOWED_ORIGIN_ENV;
}

header("Access-Control-Allow-Origin: $corsOrigin");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. CONFIG
$ADMIN_SECRET = env('ADMIN_SECRET');
$SUPABASE_URL = env('SUPABASE_URL');
$SUPABASE_KEY = env('SUPABASE_SERVICE_KEY');
$PUBLIC_BASE_URL = env('PUBLIC_BASE_URL', 'https://sistemasdegestao.tech');

// 2. CAPTURA DE DADOS
$rawInput = file_get_contents("php://input");
$jsonData = json_decode($rawInput, true) ?? [];

function validateAdminSecret($value, $secret)
{
    if (!$value || !$secret) {
        return false;
    }
    $dailyToken = hash('sha256', $secret . date('Y-m-d'));
    return hash_equals($secret, $value) || hash_equals($dailyToken, $value);
}

if (!validateAdminSecret($jsonData['admin_secret'] ?? '', $ADMIN_SECRET)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Acesso Negado']);
    exit;
}

$action = $jsonData['action'] ?? '';

// FUNÇÕES SUPABASE (cURL)
function supabase_request($method, $endpoint, $body = null)
{
    global $SUPABASE_URL, $SUPABASE_KEY;

    $url = rtrim($SUPABASE_URL, '/') . $endpoint;
    $ch = curl_init($url);

    $headers = [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $SUPABASE_KEY",
        "Content-Type: application/json"
    ];

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, 1);
        $headers[] = "Prefer: return=representation";
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    } elseif ($method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        $headers[] = "Prefer: return=representation";
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    } elseif ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        $headers[] = "Prefer: return=representation";
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
    }

    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'data' => json_decode($response, true),
        'error' => $curlError,
        'raw' => $response
    ];
}

// Geração de chave de licença (SaaS)
function generateLicenseKey()
{
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $key = '';
    for ($i = 0; $i < 4; $i++) {
        $segment = '';
        for ($j = 0; $j < 4; $j++) {
            $segment .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $key .= $segment . ($i < 3 ? '-' : '');
    }
    return $key;
}

function normalizeSlug($slug)
{
    $slug = strtolower(trim($slug));
    $slug = preg_replace('/[^a-z0-9-]+/', '-', $slug);
    $slug = preg_replace('/-+/', '-', $slug);
    return trim($slug, '-');
}

// =========================================================================
// REGRAS DE IMPACTO DO CATÁLOGO SAAS (GOVERNANÇA):
// 1. Alteração de plano padrão afeta apenas novos provisionamentos.
// 2. Clientes já provisionados utilizam cópia local em public.tenant_modules.
// 3. Alteração em cliente ativo deve ser feita por módulo/tenant no futuro.
// =========================================================================
function getSaasCatalog()
{
    return [
        'gestao-gastro' => [
            'name' => 'Gestão Gastro',
            'path' => 'gestao-gastro',
            'plans' => [
                'basic' => [
                    'name' => 'Básico',
                    'license_type' => 'monthly',
                    'modules' => ['pdv', 'mesas_garcom_mobile', 'caixa', 'dashboard', 'cardapio', 'financeiro', 'estoque', 'manual', 'configuracao', 'suporte', 'seguranca', 'evolucao']
                ],
                'premium' => [
                    'name' => 'Premium',
                    'license_type' => 'monthly',
                    'modules' => ['pdv', 'mesas_garcom_mobile', 'caixa', 'dashboard', 'cardapio', 'financeiro', 'estoque', 'manual', 'configuracao', 'suporte', 'kds', 'relatorios_avancados', 'seguranca', 'evolucao']
                ],
                'trial' => [
                    'name' => 'Trial',
                    'license_type' => 'trial',
                    'modules' => ['pdv', 'mesas_garcom_mobile', 'caixa', 'dashboard', 'cardapio', 'financeiro', 'estoque', 'manual', 'configuracao', 'suporte', 'seguranca', 'evolucao']
                ]
            ]
        ],
        'gestao-barbearia' => [
            'name' => 'Gestão Barbearia',
            'path' => 'gestao-barbearia',
            'plans' => [
                'basic' => ['name' => 'Básico', 'license_type' => 'monthly', 'modules' => ['agenda', 'caixa', 'clientes', 'servicos', 'profissionais', 'relatorios', 'suporte']],
                'premium' => ['name' => 'Premium Online', 'license_type' => 'monthly', 'modules' => ['agenda', 'caixa', 'clientes', 'servicos', 'profissionais', 'relatorios', 'comissoes', 'agendamento_online', 'suporte']],
                'trial' => ['name' => 'Trial', 'license_type' => 'trial', 'modules' => ['agenda', 'caixa', 'clientes', 'servicos', 'profissionais', 'relatorios', 'suporte']]
            ]
        ],
        'gestao-beleza' => [
            'name' => 'Gestão Beleza',
            'path' => 'gestao-beleza',
            'plans' => [
                'basic' => ['name' => 'Básico', 'license_type' => 'monthly', 'modules' => ['agenda', 'caixa', 'clientes', 'servicos', 'estoque', 'suporte']],
                'premium' => ['name' => 'Premium', 'license_type' => 'monthly', 'modules' => ['agenda', 'caixa', 'clientes', 'servicos', 'estoque', 'pacotes', 'relatorios', 'suporte']],
                'trial' => ['name' => 'Trial', 'license_type' => 'trial', 'modules' => ['agenda', 'caixa', 'clientes', 'servicos', 'estoque', 'suporte']]
            ]
        ]
    ];
}

function checkTenantSlugAvailable($slug)
{
    $res = supabase_request('GET', '/rest/v1/tenants?select=id&slug=eq.' . rawurlencode($slug) . '&limit=1');

    if (!empty($res['error'])) {
        return ['ok' => false, 'available' => false, 'message' => 'Falha ao validar disponibilidade do slug.', 'details' => $res['error']];
    }

    if ($res['code'] >= 400) {
        return ['ok' => false, 'available' => false, 'message' => 'Falha ao validar disponibilidade do slug.', 'details' => $res['data'] ?? $res['raw']];
    }

    return ['ok' => true, 'available' => empty($res['data'])];
}

function getTenantBySlug($slug)
{
    $res = supabase_request('GET', '/rest/v1/tenants?select=*,licenses(license_key,status)&slug=eq.' . rawurlencode($slug) . '&limit=1');
    if ($res['code'] >= 400 || !empty($res['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar tenant existente.', 'details' => $res['error'] ?? $res['data']];
    }
    return ['ok' => true, 'tenant' => $res['data'][0] ?? null];
}

function tenantHasActiveLicense(array $tenant)
{
    $licenses = is_array($tenant['licenses'] ?? null) ? $tenant['licenses'] : [];
    foreach ($licenses as $license) {
        if (($license['status'] ?? '') === 'active') {
            return true;
        }
    }
    return false;
}

function findAuthUserByEmail($email)
{
    $res = supabase_request('GET', '/auth/v1/admin/users?page=1&per_page=1000');
    if ($res['code'] >= 400 || !empty($res['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar usuários Auth.', 'details' => $res['error'] ?? $res['data']];
    }

    foreach (($res['data']['users'] ?? []) as $user) {
        if (strtolower($user['email'] ?? '') === strtolower($email)) {
            return ['ok' => true, 'user' => $user];
        }
    }

    return ['ok' => true, 'user' => null];
}

function authUserCanBeReusedForTenant($userId, $tenantId)
{
    $res = supabase_request('GET', '/rest/v1/tenant_members?select=tenant_id&user_id=eq.' . rawurlencode($userId));
    if ($res['code'] >= 400 || !empty($res['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar vínculos do usuário Auth.', 'details' => $res['error'] ?? $res['data']];
    }

    foreach (($res['data'] ?? []) as $membership) {
        if (($membership['tenant_id'] ?? '') !== $tenantId) {
            return ['ok' => true, 'reusable' => false];
        }
    }

    return ['ok' => true, 'reusable' => true];
}

function cleanupOrphanTenantForProvisioning(array $tenant, $email)
{
    $tenantId = $tenant['id'] ?? '';
    if ($tenantId === '') {
        return ['ok' => false, 'message' => 'Tenant invalido para limpeza de provisionamento.'];
    }

    if (tenantHasActiveLicense($tenant)) {
        return ['ok' => false, 'message' => 'Nao e permitido limpar tenant com licenca ativa.'];
    }

    $authLookup = findAuthUserByEmail($email);
    if (!$authLookup['ok']) {
        return $authLookup;
    }

    $authUserId = $authLookup['user']['id'] ?? '';
    if ($authUserId !== '') {
        $reuseCheck = authUserCanBeReusedForTenant($authUserId, $tenantId);
        if (!$reuseCheck['ok']) {
            return $reuseCheck;
        }
        if (!$reuseCheck['reusable']) {
            return ['ok' => false, 'message' => 'Este e-mail pertence a outro tenant e nao pode ser removido automaticamente.'];
        }
    }

    $cleanupEndpoints = [
        '/rest/v1/licenses?tenant_id=eq.' . rawurlencode($tenantId),
        '/rest/v1/tenant_modules?tenant_id=eq.' . rawurlencode($tenantId),
        '/rest/v1/tenant_members?tenant_id=eq.' . rawurlencode($tenantId)
    ];

    foreach ($cleanupEndpoints as $endpoint) {
        $res = supabase_request('DELETE', $endpoint);
        if ($res['code'] >= 400 || !empty($res['error'])) {
            return ['ok' => false, 'message' => 'Falha ao limpar vestigios do tenant.', 'details' => $res['error'] ?? $res['data']];
        }
    }

    if ($authUserId !== '') {
        $deleteUser = supabase_request('DELETE', '/auth/v1/admin/users/' . rawurlencode($authUserId));
        if ($deleteUser['code'] >= 400 && $deleteUser['code'] !== 404) {
            return ['ok' => false, 'message' => 'Falha ao remover usuario Auth antigo.', 'details' => $deleteUser['error'] ?? $deleteUser['data']];
        }
    }

    $metadata = is_array($tenant['metadata'] ?? null) ? $tenant['metadata'] : [];
    $metadata['provisioning_cleanup_at'] = gmdate('c');
    $metadata['provisioning_cleanup_reason'] = 'orphan_tenant_reset';

    $patchTenant = supabase_request('PATCH', '/rest/v1/tenants?id=eq.' . rawurlencode($tenantId), [
        'status' => 'active',
        'metadata' => $metadata,
        'updated_at' => gmdate('c')
    ]);
    if ($patchTenant['code'] >= 400 || !empty($patchTenant['error'])) {
        return ['ok' => false, 'message' => 'Falha ao registrar limpeza do tenant.', 'details' => $patchTenant['error'] ?? $patchTenant['data']];
    }

    return ['ok' => true];
}

function findOrCreateCustomer($name, $email)
{
    $res = supabase_request('GET', '/rest/v1/customers?select=id&email=eq.' . rawurlencode(strtolower($email)) . '&limit=1');
    if ($res['code'] >= 400 || !empty($res['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar cliente.', 'details' => $res['error'] ?? $res['data']];
    }

    $existing = $res['data'][0] ?? null;
    if ($existing) {
        $patch = supabase_request('PATCH', '/rest/v1/customers?id=eq.' . rawurlencode($existing['id']), [
            'name' => $name,
            'status' => 'active',
            'updated_at' => gmdate('c')
        ]);
        if ($patch['code'] >= 400 || !empty($patch['error'])) {
            return ['ok' => false, 'message' => 'Falha ao atualizar cliente.', 'details' => $patch['error'] ?? $patch['data']];
        }
        return ['ok' => true, 'customer_id' => $existing['id']];
    }

    $create = supabase_request('POST', '/rest/v1/customers', [
        'name' => $name,
        'email' => strtolower($email),
        'status' => 'active'
    ]);
    if ($create['code'] >= 400 || !empty($create['error']) || empty($create['data'][0]['id'])) {
        return ['ok' => false, 'message' => 'Falha ao criar cliente.', 'details' => $create['error'] ?? $create['data']];
    }
    return ['ok' => true, 'customer_id' => $create['data'][0]['id']];
}

function getActiveSystemAndPlan($systemSlug, $planSlug)
{
    $systemRes = supabase_request('GET', '/rest/v1/systems?select=id,slug,name,metadata&slug=eq.' . rawurlencode($systemSlug) . '&status=eq.active&limit=1');
    if ($systemRes['code'] >= 400 || !empty($systemRes['error']) || empty($systemRes['data'][0]['id'])) {
        return ['ok' => false, 'message' => 'Sistema SaaS ativo nao encontrado.', 'details' => $systemRes['error'] ?? $systemRes['data']];
    }
    $system = $systemRes['data'][0];

    $planRes = supabase_request('GET', '/rest/v1/plans?select=id,slug,name,billing_model,max_devices&system_id=eq.' . rawurlencode($system['id']) . '&slug=eq.' . rawurlencode($planSlug) . '&status=eq.active&limit=1');
    if ($planRes['code'] >= 400 || !empty($planRes['error']) || empty($planRes['data'][0]['id'])) {
        return ['ok' => false, 'message' => 'Plano SaaS ativo nao encontrado.', 'details' => $planRes['error'] ?? $planRes['data']];
    }

    return ['ok' => true, 'system' => $system, 'plan' => $planRes['data'][0]];
}

function upsertTenantMember($tenantId, $userId)
{
    $endpoint = '/rest/v1/tenant_members?tenant_id=eq.' . rawurlencode($tenantId) . '&user_id=eq.' . rawurlencode($userId) . '&limit=1';
    $existing = supabase_request('GET', $endpoint);
    if ($existing['code'] >= 400 || !empty($existing['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar vinculo administrativo.', 'details' => $existing['error'] ?? $existing['data']];
    }

    if (!empty($existing['data'])) {
        $patch = supabase_request('PATCH', '/rest/v1/tenant_members?tenant_id=eq.' . rawurlencode($tenantId) . '&user_id=eq.' . rawurlencode($userId), [
            'role' => 'owner',
            'active' => true
        ]);
        if ($patch['code'] >= 400 || !empty($patch['error'])) {
            return ['ok' => false, 'message' => 'Falha ao atualizar vinculo administrativo.', 'details' => $patch['error'] ?? $patch['data']];
        }
        return ['ok' => true];
    }

    $create = supabase_request('POST', '/rest/v1/tenant_members', [
        'tenant_id' => $tenantId,
        'user_id' => $userId,
        'role' => 'owner',
        'active' => true
    ]);
    if ($create['code'] >= 400 || !empty($create['error'])) {
        return ['ok' => false, 'message' => 'Falha ao criar vinculo administrativo.', 'details' => $create['error'] ?? $create['data']];
    }
    return ['ok' => true];
}

function upsertTenantModule($tenantId, $planId, array $module)
{
    $moduleKey = $module['module_key'] ?? '';
    if ($moduleKey === '') {
        return ['ok' => true];
    }

    $endpoint = '/rest/v1/tenant_modules?tenant_id=eq.' . rawurlencode($tenantId) . '&module_key=eq.' . rawurlencode($moduleKey) . '&limit=1';
    $existing = supabase_request('GET', $endpoint);
    if ($existing['code'] >= 400 || !empty($existing['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar modulo do tenant.', 'details' => $existing['error'] ?? $existing['data']];
    }

    $payload = [
        'tenant_id' => $tenantId,
        'module_key' => $moduleKey,
        'module_name' => $module['module_name'] ?? $moduleKey,
        'source_plan_id' => $planId,
        'enabled' => true,
        'updated_at' => gmdate('c')
    ];

    if (!empty($existing['data'])) {
        $patch = supabase_request('PATCH', '/rest/v1/tenant_modules?tenant_id=eq.' . rawurlencode($tenantId) . '&module_key=eq.' . rawurlencode($moduleKey), $payload);
        if ($patch['code'] >= 400 || !empty($patch['error'])) {
            return ['ok' => false, 'message' => 'Falha ao atualizar modulo do tenant.', 'details' => $patch['error'] ?? $patch['data']];
        }
        return ['ok' => true];
    }

    unset($payload['updated_at']);
    $create = supabase_request('POST', '/rest/v1/tenant_modules', $payload);
    if ($create['code'] >= 400 || !empty($create['error'])) {
        return ['ok' => false, 'message' => 'Falha ao criar modulo do tenant.', 'details' => $create['error'] ?? $create['data']];
    }
    return ['ok' => true];
}

function ensureGastroTables($tenantId)
{
    for ($i = 1; $i <= 12; $i++) {
        $existing = supabase_request('GET', '/rest/v1/restaurant_tables?tenant_id=eq.' . rawurlencode($tenantId) . '&number=eq.' . $i . '&select=id&limit=1');
        if ($existing['code'] >= 400 || !empty($existing['error'])) {
            return ['ok' => false, 'message' => 'Falha ao consultar mesas do tenant.', 'details' => $existing['error'] ?? $existing['data']];
        }
        if (empty($existing['data'])) {
            $create = supabase_request('POST', '/rest/v1/restaurant_tables', [
                'tenant_id' => $tenantId,
                'number' => $i,
                'status' => 'livre'
            ]);
            if ($create['code'] >= 400 || !empty($create['error'])) {
                return ['ok' => false, 'message' => 'Falha ao criar mesas iniciais.', 'details' => $create['error'] ?? $create['data']];
            }
        }
    }
    return ['ok' => true];
}

function recoverExistingTenantProvisioning(array $tenant, $userId, $name, $email, $systemSlug, $planSlug, $licenseKey, array $planConfig, array $modules, $expiresAt)
{
    $tenantId = $tenant['id'] ?? '';
    if ($tenantId === '') {
        return ['ok' => false, 'message' => 'Tenant existente invalido para recuperacao.'];
    }

    $catalogRows = getActiveSystemAndPlan($systemSlug, $planSlug);
    if (!$catalogRows['ok']) {
        return $catalogRows;
    }
    $system = $catalogRows['system'];
    $plan = $catalogRows['plan'];

    $customer = findOrCreateCustomer($name, $email);
    if (!$customer['ok']) {
        return $customer;
    }

    $metadata = is_array($tenant['metadata'] ?? null) ? $tenant['metadata'] : [];
    $metadata['plan_slug'] = $planSlug;
    $metadata['recovered_from_orphan'] = true;
    $metadata['recovered_at'] = gmdate('c');

    $tenantPatch = supabase_request('PATCH', '/rest/v1/tenants?id=eq.' . rawurlencode($tenantId), [
        'name' => $name,
        'customer_id' => $customer['customer_id'],
        'system_id' => $system['id'],
        'status' => 'active',
        'metadata' => $metadata,
        'updated_at' => gmdate('c')
    ]);
    if ($tenantPatch['code'] >= 400 || !empty($tenantPatch['error'])) {
        return ['ok' => false, 'message' => 'Falha ao recuperar tenant existente.', 'details' => $tenantPatch['error'] ?? $tenantPatch['data']];
    }

    $member = upsertTenantMember($tenantId, $userId);
    if (!$member['ok']) {
        return $member;
    }

    $licenseRes = supabase_request('POST', '/rest/v1/licenses', [
        'license_key' => $licenseKey,
        'customer_id' => $customer['customer_id'],
        'tenant_id' => $tenantId,
        'system_id' => $system['id'],
        'plan_id' => $plan['id'],
        'status' => 'active',
        'sales_channel' => 'direct',
        'license_type' => $planConfig['license_type'],
        'payment_model' => $planConfig['license_type'] === 'trial' ? 'trial' : 'recurring',
        'max_devices' => $plan['max_devices'] ?? null,
        'activation_email' => strtolower($email),
        'expires_at' => $expiresAt,
        'metadata' => [
            'plan_slug' => $planSlug,
            'system_slug' => $systemSlug,
            'recovered_existing_tenant' => true
        ]
    ]);
    if ($licenseRes['code'] >= 400 || !empty($licenseRes['error'])) {
        return ['ok' => false, 'message' => 'Falha ao criar licenca do tenant recuperado.', 'details' => $licenseRes['error'] ?? $licenseRes['data']];
    }

    $moduleRes = supabase_request('GET', '/rest/v1/plan_modules?select=module_key,module_name&plan_id=eq.' . rawurlencode($plan['id']) . '&enabled=eq.true');
    if ($moduleRes['code'] >= 400 || !empty($moduleRes['error'])) {
        return ['ok' => false, 'message' => 'Falha ao consultar modulos do plano.', 'details' => $moduleRes['error'] ?? $moduleRes['data']];
    }

    foreach (($moduleRes['data'] ?? []) as $module) {
        if (!empty($modules) && !in_array($module['module_key'] ?? '', $modules, true)) {
            continue;
        }
        $upsertModule = upsertTenantModule($tenantId, $plan['id'], $module);
        if (!$upsertModule['ok']) {
            return $upsertModule;
        }
    }

    if ($systemSlug === 'gestao-gastro') {
        $tables = ensureGastroTables($tenantId);
        if (!$tables['ok']) {
            return $tables;
        }
    }

    supabase_request('POST', '/rest/v1/saas_audit_logs', [
        'actor_user_id' => $userId,
        'action' => 'tenant.recovered_from_orphan',
        'customer_id' => $customer['customer_id'],
        'tenant_id' => $tenantId,
        'system_id' => $system['id'],
        'payload' => [
            'system_slug' => $systemSlug,
            'plan_slug' => $planSlug,
            'license_key' => $licenseKey
        ]
    ]);

    return ['ok' => true, 'tenant_id' => $tenantId];
}

if ($action === 'systems_catalog') {
    if (!validateAdminSecret($jsonData['admin_secret'] ?? '', $ADMIN_SECRET)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acesso Negado']);
        exit;
    }
    if (!$SUPABASE_URL || !$SUPABASE_KEY) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Supabase não configurado no servidor.']);
        exit;
    }
    
    $res = supabase_request('GET', '/rest/v1/systems?select=*,plans(*,plan_modules(*))');
    
    if ($res['code'] >= 400 || !empty($res['error'])) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Erro ao consultar o Supabase.',
            'details' => $res['error'] ?? $res['data']
        ]);
        exit;
    }
    
    echo json_encode([
        'status' => 'success',
        'source' => 'supabase',
        'data' => $res['data']
    ]);
    exit;
}

if ($action === 'saas_clients') {
    if (!validateAdminSecret($jsonData['admin_secret'] ?? '', $ADMIN_SECRET)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acesso Negado']);
        exit;
    }
    if (!$SUPABASE_URL || !$SUPABASE_KEY) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Supabase nao configurado no servidor.']);
        exit;
    }

    $endpoint = '/rest/v1/tenants?select=id,name,slug,status,created_at,systems(slug,name,metadata),customers(name,email),licenses(license_key,status,license_type,payment_model,expires_at,created_at,device_id,plans(code,name)),tenant_modules(module_key,enabled)&order=created_at.desc&limit=100';
    $res = supabase_request('GET', $endpoint);

    if ($res['code'] >= 400 || !empty($res['error'])) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Erro ao consultar clientes SaaS no Supabase.',
            'details' => $res['error'] ?? $res['data']
        ]);
        exit;
    }

    $clients = [];
    foreach (($res['data'] ?? []) as $tenant) {
        $system = $tenant['systems'] ?? [];
        $customer = $tenant['customers'] ?? [];
        $licenses = is_array($tenant['licenses'] ?? null) ? $tenant['licenses'] : [];
        $modules = is_array($tenant['tenant_modules'] ?? null) ? $tenant['tenant_modules'] : [];
        $activeLicenses = array_values(array_filter($licenses, fn($item) => ($item['status'] ?? '') === 'active'));
        $license = $activeLicenses[0] ?? ($licenses[0] ?? []);
        $plan = $license['plans'] ?? [];
        $systemSlug = $system['slug'] ?? '';
        $metadata = is_array($system['metadata'] ?? null) ? $system['metadata'] : [];
        $publicPath = $metadata['public_path'] ?? $systemSlug;
        $slug = $tenant['slug'] ?? '';
        $licenseKey = $license['license_key'] ?? '';
        $licenseStatus = $license['status'] ?? '';
        $operationalStatus = $licenseKey === '' ? 'sem_licenca' : ($licenseStatus ?: ($tenant['status'] ?? 'active'));

        $clients[] = [
            'tenant_id' => $tenant['id'] ?? '',
            'name' => $tenant['name'] ?? ($customer['name'] ?? ''),
            'slug' => $slug,
            'email' => $customer['email'] ?? '',
            'status' => $operationalStatus,
            'tenant_status' => $tenant['status'] ?? 'active',
            'system_slug' => $systemSlug,
            'system_name' => $system['name'] ?? $systemSlug,
            'plan_code' => $plan['code'] ?? '',
            'plan_name' => $plan['name'] ?? '',
            'license_key' => $licenseKey,
            'license_status' => $licenseStatus,
            'license_type' => $license['license_type'] ?? '',
            'device_id' => $license['device_id'] ?? '',
            'created_at' => $tenant['created_at'] ?? '',
            'modules_count' => count(array_filter($modules, fn($module) => !empty($module['enabled']))),
            'public_link' => ($publicPath && $slug) ? rtrim($PUBLIC_BASE_URL, '/') . '/' . trim($publicPath, '/') . '/' . $slug : ''
        ];
    }

    echo json_encode([
        'status' => 'success',
        'data' => $clients
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'provision_tenant') {
    $name = trim($jsonData['name'] ?? '');
    $slug = trim($jsonData['slug'] ?? '');
    $email = trim($jsonData['email'] ?? '');
    $system = trim($jsonData['system'] ?? 'gestao-gastro');
    $plan = trim($jsonData['plan'] ?? 'basic');
    $catalog = getSaasCatalog();
    $slug = normalizeSlug($slug);

    if (!$name || !$slug || !$email) {
        echo json_encode(['status' => 'error', 'message' => 'Nome, Slug e Email são obrigatórios.']);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'E-mail do administrador inválido.']);
        exit;
    }
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
        echo json_encode(['status' => 'error', 'message' => 'Slug publico invalido. Use letras, numeros e hifens.']);
        exit;
    }
    if (!isset($catalog[$system])) {
        echo json_encode(['status' => 'error', 'message' => 'Sistema base nao permitido para provisionamento.']);
        exit;
    }
    if (!isset($catalog[$system]['plans'][$plan])) {
        echo json_encode(['status' => 'error', 'message' => 'Plano inicial nao permitido para este sistema.']);
        exit;
    }

    if (!$SUPABASE_URL || !$SUPABASE_KEY) {
        echo json_encode(['status' => 'error', 'message' => 'Supabase não configurado no servidor.']);
        exit;
    }

    $existingTenant = null;
    $slugAvailability = checkTenantSlugAvailable($slug);
    if (!$slugAvailability['ok']) {
        echo json_encode(['status' => 'error', 'message' => $slugAvailability['message'], 'details' => $slugAvailability['details'] ?? null]);
        exit;
    }
    if (!$slugAvailability['available']) {
        $tenantLookup = getTenantBySlug($slug);
        if (!$tenantLookup['ok']) {
            echo json_encode(['status' => 'error', 'message' => $tenantLookup['message'], 'details' => $tenantLookup['details'] ?? null]);
            exit;
        }
        $existingTenant = $tenantLookup['tenant'];
        if (!$existingTenant || tenantHasActiveLicense($existingTenant)) {
            echo json_encode(['status' => 'error', 'message' => 'Slug ja esta em uso por um cliente com licenca ativa. Escolha outro identificador publico.']);
            exit;
        }
    }

    $tempPassword = generateLicenseKey(); // Senha inicial amigável (temporária)
    $licenseKey = generateLicenseKey();
    $planConfig = $catalog[$system]['plans'][$plan];
    $expiresAt = $planConfig['license_type'] === 'trial' ? gmdate('c', strtotime('+14 days')) : null;

    // 1. Criar Usuário (Admin) no Auth
    if ($existingTenant) {
        $cleanup = cleanupOrphanTenantForProvisioning($existingTenant, $email);
        if (!$cleanup['ok']) {
            echo json_encode([
                'status' => 'error',
                'message' => $cleanup['message'] ?? 'Falha ao limpar vestigios do tenant antes do provisionamento.',
                'details' => $cleanup['details'] ?? null
            ]);
            exit;
        }
    }

    $userRes = supabase_request('POST', '/auth/v1/admin/users', [
        'email' => $email,
        'password' => $tempPassword,
        'email_confirm' => true,
        'app_metadata' => [
            'role' => 'tenant_admin',
            'system_id' => $system,
            'must_change_password' => true
        ]
    ]);

    if ($userRes['code'] >= 400 && $existingTenant) {
        $authLookup = findAuthUserByEmail($email);
        if ($authLookup['ok'] && !empty($authLookup['user']['id'])) {
            $reuseCheck = authUserCanBeReusedForTenant($authLookup['user']['id'], $existingTenant['id']);
            if ($reuseCheck['ok'] && $reuseCheck['reusable']) {
                $existingAppMetadata = is_array($authLookup['user']['app_metadata'] ?? null) ? $authLookup['user']['app_metadata'] : [];
                $existingUserMetadata = is_array($authLookup['user']['user_metadata'] ?? null) ? $authLookup['user']['user_metadata'] : [];
                $existingAppMetadata['role'] = 'tenant_admin';
                $existingAppMetadata['system_id'] = $system;
                $existingAppMetadata['must_change_password'] = true;
                $existingUserMetadata['display_name'] = $name;

                $userUpdate = supabase_request('PUT', '/auth/v1/admin/users/' . rawurlencode($authLookup['user']['id']), [
                    'email' => $email,
                    'password' => $tempPassword,
                    'email_confirm' => true,
                    'app_metadata' => $existingAppMetadata,
                    'user_metadata' => $existingUserMetadata
                ]);

                if ($userUpdate['code'] < 400 && empty($userUpdate['error'])) {
                    $userRes = ['code' => 200, 'data' => ['id' => $authLookup['user']['id']]];
                }
            }
        }
    }

    if ($userRes['code'] >= 400) {
        // Se usuário já existe, o Supabase retorna um código 4xx ou 422.
        echo json_encode(['status' => 'error', 'message' => 'Falha ao criar usuário. Talvez o email já exista?', 'details' => $userRes['data']]);
        exit;
    }

    $userId = $userRes['data']['id'] ?? $userRes['data'][0]['id'] ?? null;

    if (!$userId) {
        echo json_encode(['status' => 'error', 'message' => 'Erro interno: ID de usuário nulo após criação no Auth.']);
        exit;
    }

    // 2. Chamar RPC Transacional no banco
    if ($existingTenant) {
        $recovery = recoverExistingTenantProvisioning($existingTenant, $userId, $name, $email, $system, $plan, $licenseKey, $planConfig, $planConfig['modules'], $expiresAt);
        if (!$recovery['ok']) {
            $rollbackRes = supabase_request('DELETE', '/auth/v1/admin/users/' . $userId);
            $rollbackOk = ($rollbackRes['code'] >= 200 && $rollbackRes['code'] < 300) || $rollbackRes['code'] === 404;

            echo json_encode([
                'status' => 'error',
                'message' => $rollbackOk ? 'Falha ao recuperar tenant existente (usuario Auth limpo)' : 'Falha ao recuperar tenant existente e rollback Auth nao confirmado',
                'details' => $recovery['details'] ?? $recovery['message'],
                'rollback_auth_deleted' => $rollbackOk,
                'rollback_http_code' => $rollbackRes['code']
            ]);
            exit;
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Cliente recuperado e provisionado com sucesso!',
            'recovered_existing_tenant' => true,
            'credentials' => [
                'email' => $email,
                'password' => $tempPassword,
                'slug' => $slug,
                'license_key' => $licenseKey,
                'modules' => $planConfig['modules'],
                'link' => rtrim($PUBLIC_BASE_URL, '/') . "/{$catalog[$system]['path']}/{$slug}"
            ]
        ]);
        exit;
    }

    $rpcPayload = [
        'p_user_id' => $userId,
        'p_customer_name' => $name,
        'p_customer_email' => $email,
        'p_tenant_name' => $name,
        'p_tenant_slug' => $slug,
        'p_system_id' => $system,
        'p_plan_id' => $plan,
        'p_license_key' => $licenseKey,
        'p_license_type' => $planConfig['license_type'],
        'p_modules' => $planConfig['modules'],
        'p_expires_at' => $expiresAt
    ];

    $rpcRes = supabase_request('POST', '/rest/v1/rpc/provision_saas_tenant', $rpcPayload);

    // 3. Verificação de Sucesso (Se sucesso for false na resposta do RPC ou código HTTP de erro)
    $rpcSuccess = false;
    $rpcError = '';

    if ($rpcRes['code'] >= 200 && $rpcRes['code'] < 300) {
        if (isset($rpcRes['data']['success']) && $rpcRes['data']['success'] === true) {
            $rpcSuccess = true;
        } else {
            $rpcError = $rpcRes['data']['error'] ?? 'Erro desconhecido na RPC.';
        }
    } else {
        $rpcError = json_encode($rpcRes['data']);
    }

    // 4. Rollback compensatório (se o banco falhou, deleta o Auth)
    if (!$rpcSuccess) {
        // Compensa: deleta o usuário criado
        $rollbackRes = supabase_request('DELETE', '/auth/v1/admin/users/' . $userId);
        $rollbackOk = ($rollbackRes['code'] >= 200 && $rollbackRes['code'] < 300) || $rollbackRes['code'] === 404;

        echo json_encode([
            'status' => 'error',
            'message' => $rollbackOk ? 'Falha na criacao do banco (usuario Auth limpo)' : 'Falha na criacao do banco e rollback Auth nao confirmado',
            'details' => $rpcError,
            'rollback_auth_deleted' => $rollbackOk,
            'rollback_http_code' => $rollbackRes['code']
        ]);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Cliente provisionado com sucesso!',
        'credentials' => [
            'email' => $email,
            'password' => $tempPassword,
            'slug' => $slug,
            'license_key' => $licenseKey,
            'modules' => $planConfig['modules'],
            'link' => rtrim($PUBLIC_BASE_URL, '/') . "/{$catalog[$system]['path']}/{$slug}"
        ]
    ]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Ação inválida.']);
exit;
