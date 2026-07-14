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
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
                    'modules' => ['pdv', 'mesas_garcom_mobile', 'caixa', 'dashboard', 'cardapio', 'financeiro', 'estoque', 'manual', 'configuracao', 'suporte']
                ],
                'premium' => [
                    'name' => 'Premium',
                    'license_type' => 'monthly',
                    'modules' => ['pdv', 'mesas_garcom_mobile', 'caixa', 'dashboard', 'cardapio', 'financeiro', 'estoque', 'manual', 'configuracao', 'suporte', 'kds', 'relatorios_avancados']
                ],
                'trial' => [
                    'name' => 'Trial',
                    'license_type' => 'trial',
                    'modules' => ['pdv', 'mesas_garcom_mobile', 'caixa', 'dashboard', 'cardapio', 'financeiro', 'estoque', 'manual', 'configuracao', 'suporte']
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

    $slugAvailability = checkTenantSlugAvailable($slug);
    if (!$slugAvailability['ok']) {
        echo json_encode(['status' => 'error', 'message' => $slugAvailability['message'], 'details' => $slugAvailability['details'] ?? null]);
        exit;
    }
    if (!$slugAvailability['available']) {
        echo json_encode(['status' => 'error', 'message' => 'Slug ja esta em uso. Escolha outro identificador publico.']);
        exit;
    }

    $tempPassword = generateLicenseKey(); // Senha inicial amigável (temporária)
    $licenseKey = generateLicenseKey();
    $planConfig = $catalog[$system]['plans'][$plan];
    $expiresAt = $planConfig['license_type'] === 'trial' ? gmdate('c', strtotime('+14 days')) : null;

    // 1. Criar Usuário (Admin) no Auth
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
        $rollbackOk = $rollbackRes['code'] >= 200 && $rollbackRes['code'] < 300;

        echo json_encode([
            'status' => 'error',
            'message' => $rollbackOk ? 'Falha na criacao do banco (rollback Auth realizado)' : 'Falha na criacao do banco e rollback Auth nao confirmado',
            'details' => $rpcError,
            'rollback_auth_deleted' => $rollbackOk
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
