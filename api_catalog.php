<?php
/**
 * api_catalog.php
 * Endpoint público e administrativo para consultar e governar o Catálogo Comercial Local Oficial.
 * Fase C.5.3 / C.5.4 / C.5.4.1 - Integração Frontend, CRUD Operacional e Correção de Persistência
 */

require_once __DIR__ . '/env_loader.php';
require_once __DIR__ . '/catalog_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

// Configuração de CORS seguro
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
    header('Access-Control-Allow-Origin: ' . (empty($requestOrigin) ? '*' : $requestOrigin));
} else {
    header('Access-Control-Allow-Origin: ' . $ALLOWED_ORIGIN_ENV);
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function validateAdminSecret($value, $secret)
{
    if (!$value || !$secret) {
        return false;
    }
    $dailyToken = hash('sha256', $secret . date('Y-m-d'));
    return hash_equals($secret, $value) || hash_equals($dailyToken, $value);
}

$rawInput = file_get_contents("php://input");
$jsonData = json_decode($rawInput, true) ?? [];
$action = $jsonData['action'] ?? ($_GET['action'] ?? 'list');

// Leitura pública (GET / action=list sem admin_secret)
if ($_SERVER['REQUEST_METHOD'] === 'GET' || ($action === 'list' && empty($jsonData['admin_secret']))) {
    $catalog = loadCommercialCatalog();
    $systems = $catalog['systems'] ?? [];

    $publicSystems = [];
    foreach ($systems as $slug => $sys) {
        $publicSystems[$slug] = [
            'id' => $sys['id'] ?? $slug,
            'title' => $sys['name'] ?? $sys['title'] ?? $slug,
            'name' => $sys['name'] ?? $slug,
            'subtitle' => $sys['subtitle'] ?? '',
            'description' => $sys['subtitle'] ?? $sys['description'] ?? '',
            'status' => $sys['commercial_status'] ?? $sys['status'] ?? 'active',
            'commercial_status' => $sys['commercial_status'] ?? $sys['status'] ?? 'active',
            'publicPath' => $sys['public_path'] ?? $sys['publicPath'] ?? $slug,
            'public_path' => $sys['public_path'] ?? $slug,
            'saas_recommended' => !empty($sys['saas_recommended']),
            'standard_ml_allowed' => !empty($sys['standard_ml_allowed']),
            'offline_standalone_fallback' => $sys['offline_standalone_fallback'] ?? null,
            'allowed_channels' => $sys['allowed_channels'] ?? [],
            'allowed_commercial_models' => $sys['allowed_commercial_models'] ?? [],
            'lifetime_plans' => $sys['lifetime_plans'] ?? [],
            'saas_plans' => $sys['saas_plans'] ?? [],
            'operational_notes' => $sys['operational_notes'] ?? ''
        ];
    }

    echo json_encode([
        'status' => 'success',
        'source' => 'local_official',
        'data' => $publicSystems,
        'version' => $catalog['version'] ?? '1.0.0'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Ações Administrativas (POST exigem segredo)
$ADMIN_SECRET = env('ADMIN_SECRET');
if (!validateAdminSecret($jsonData['admin_secret'] ?? '', $ADMIN_SECRET)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Acesso negado: credenciais inválidas.']);
    exit;
}

$catalogFile = __DIR__ . '/api_data/products_catalog.json';
if (!file_exists($catalogFile)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Arquivo do catálogo local não encontrado.']);
    exit;
}

$catalogRaw = file_get_contents($catalogFile);
$catalogData = json_decode($catalogRaw, true);

if (!$catalogData || !isset($catalogData['systems'])) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Estrutura do catálogo JSON inválida.']);
    exit;
}

// Função de Backup Automático antes de gravação
function backupCatalogFile($catalogFile, $rawContent)
{
    $timestamp = date('Ymd_His');
    $backupPath = __DIR__ . "/api_data/products_catalog.backup.{$timestamp}.json";
    file_put_contents($backupPath, $rawContent);
}

if ($action === 'save_system') {
    $rawSlug = trim((string) ($jsonData['slug'] ?? ''));
    $slug = strtolower(preg_replace('/[^a-zA-Z0-9\-]/', '', $rawSlug));

    if (empty($slug)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Slug do sistema inválido ou vazio.']);
        exit;
    }

    $isNew = !empty($jsonData['is_new']);

    if ($isNew && isset($catalogData['systems'][$slug])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Já existe um sistema cadastrado com o slug informado.']);
        exit;
    }

    $name = trim((string) ($jsonData['name'] ?? $slug));
    $subtitle = trim((string) ($jsonData['subtitle'] ?? ''));
    $publicPath = strtolower(trim((string) ($jsonData['public_path'] ?? $slug)));
    $commercialStatus = ($jsonData['commercial_status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';
    $saasRecommended = !empty($jsonData['saas_recommended']);
    $standardMlAllowed = !empty($jsonData['standard_ml_allowed']);
    $operationalNotes = trim((string) ($jsonData['operational_notes'] ?? ''));

    // Sanitização e validação de Canais e Modelos Comerciais por allowlists fixas
    $channelAllowlist = ['mercadolivre', 'direct', 'landing_page', 'admin_saas'];
    $modelAllowlist = ['ml_lifetime', 'direct_lifetime', 'pro_lifetime', 'trial', 'online_essential', 'online_premium', 'project_custom_brand'];

    $inputChannels = is_array($jsonData['allowed_channels'] ?? null) ? $jsonData['allowed_channels'] : null;
    $inputModels = is_array($jsonData['allowed_commercial_models'] ?? null) ? $jsonData['allowed_commercial_models'] : null;

    $existingSys = $catalogData['systems'][$slug] ?? [];

    if ($inputChannels !== null) {
        $allowedChannels = array_values(array_filter($inputChannels, function ($ch) use ($channelAllowlist) {
            return in_array($ch, $channelAllowlist, true);
        }));
    } else {
        $allowedChannels = $existingSys['allowed_channels'] ?? $channelAllowlist;
    }

    if ($inputModels !== null) {
        $allowedModels = array_values(array_filter($inputModels, function ($m) use ($modelAllowlist) {
            return in_array($m, $modelAllowlist, true);
        }));
    } else {
        $allowedModels = $existingSys['allowed_commercial_models'] ?? $modelAllowlist;
    }

    // Regras Especiais Canônicas para Gastro
    if ($slug === 'gestao-gastro') {
        $saasRecommended = true;
        $standardMlAllowed = false;
        $allowedChannels = array_values(array_diff($allowedChannels, ['mercadolivre']));
        $allowedModels = array_values(array_diff($allowedModels, ['ml_lifetime']));
    }

    $priceEssential = (float) ($jsonData['price_essential'] ?? 0);
    $pricePremium = (float) ($jsonData['price_premium'] ?? 0);

    $priceMl = (float) ($jsonData['price_ml'] ?? 97.00);
    $priceDirect = (float) ($jsonData['price_direct'] ?? 299.90);
    $pricePro = (float) ($jsonData['price_pro'] ?? 599.90);

    // Estrutura de Planos SaaS
    $saasPlans = $existingSys['saas_plans'] ?? [];
    if (!isset($saasPlans['online_essential'])) {
        $saasPlans['online_essential'] = [
            'code' => 'basic',
            'name' => 'Online Essencial',
            'billing_model' => 'monthly',
            'monthly_price' => $priceEssential,
            'max_devices' => 3,
            'max_users' => 12,
            'modules' => ['agenda', 'clientes', 'caixa', 'financeiro', 'estoque', 'suporte']
        ];
    } else {
        $saasPlans['online_essential']['monthly_price'] = $priceEssential;
    }

    if (!isset($saasPlans['online_premium'])) {
        $saasPlans['online_premium'] = [
            'code' => 'premium',
            'name' => 'Online Premium',
            'billing_model' => 'monthly',
            'monthly_price' => $pricePremium,
            'max_devices' => 10,
            'max_users' => 50,
            'modules' => ['agenda', 'clientes', 'caixa', 'financeiro', 'estoque', 'relatorios_bi', 'suporte']
        ];
    } else {
        $saasPlans['online_premium']['monthly_price'] = $pricePremium;
    }

    // Estrutura Canônica de Planos Vitalícios (Fase C.5.4.1: Usa base_price)
    $lifetimePlans = $existingSys['lifetime_plans'] ?? [];

    if (!isset($lifetimePlans['ml_lifetime'])) {
        $lifetimePlans['ml_lifetime'] = [
            'code' => 'ml_lifetime',
            'name' => 'Produto ML Vitalício',
            'base_price' => $priceMl,
            'billing_model' => 'one_time',
            'max_devices' => 1,
            'max_users' => 1,
            'features' => ['pdv_local', 'agendamento', 'caixa', 'financeiro', 'suporte_padrao']
        ];
    } else {
        $lifetimePlans['ml_lifetime']['base_price'] = $priceMl;
        unset($lifetimePlans['ml_lifetime']['price']);
    }

    if (!isset($lifetimePlans['direct_lifetime'])) {
        $lifetimePlans['direct_lifetime'] = [
            'code' => 'direct_lifetime',
            'name' => 'Site Vitalício',
            'base_price' => $priceDirect,
            'billing_model' => 'one_time',
            'max_devices' => 3,
            'max_users' => 3,
            'features' => ['pdv_local', 'agendamento', 'caixa', 'financeiro', 'relatorios_avancados', 'suporte_prioritario']
        ];
    } else {
        $lifetimePlans['direct_lifetime']['base_price'] = $priceDirect;
        unset($lifetimePlans['direct_lifetime']['price']);
    }

    if (!isset($lifetimePlans['pro_lifetime'])) {
        $lifetimePlans['pro_lifetime'] = [
            'code' => 'pro_lifetime',
            'name' => 'Pro Vitalício',
            'base_price' => $pricePro,
            'billing_model' => 'one_time',
            'max_devices' => 5,
            'max_users' => 10,
            'features' => ['pdv_local', 'agendamento', 'caixa', 'financeiro', 'relatorios_bi', 'suporte_vip']
        ];
    } else {
        $lifetimePlans['pro_lifetime']['base_price'] = $pricePro;
        unset($lifetimePlans['pro_lifetime']['price']);
    }

    // Merge seguro: Preserva todos os campos canônicos preexistentes (trial_config, project_custom_brand_config, etc.)
    $updatedSystem = $existingSys;

    $updatedSystem['id'] = $slug;
    $updatedSystem['name'] = $name;
    $updatedSystem['subtitle'] = $subtitle;
    $updatedSystem['public_path'] = $publicPath;
    $updatedSystem['commercial_status'] = $commercialStatus;
    $updatedSystem['saas_recommended'] = $saasRecommended;
    $updatedSystem['standard_ml_allowed'] = $standardMlAllowed;
    $updatedSystem['allowed_channels'] = $allowedChannels;
    $updatedSystem['allowed_commercial_models'] = $allowedModels;
    $updatedSystem['saas_plans'] = $saasPlans;
    $updatedSystem['operational_notes'] = $operationalNotes;

    // Regra canônica de planos vitalícios e offline_standalone_fallback
    if ($slug === 'gestao-gastro') {
        $updatedSystem['lifetime_plans'] = (object) []; // Garante objeto de chave/valor {} no JSON
        if (!isset($updatedSystem['offline_standalone_fallback'])) {
            $updatedSystem['offline_standalone_fallback'] = [
                'permitted' => true,
                'requires_custom_infrastructure' => true,
                'note' => 'Versão estritamente offline/standalone permitida apenas como atendimento presencial/específico de infraestrutura sob demanda.'
            ];
        }
    } else {
        $updatedSystem['lifetime_plans'] = $lifetimePlans;
        if (!array_key_exists('offline_standalone_fallback', $updatedSystem)) {
            $updatedSystem['offline_standalone_fallback'] = null;
        }
    }

    // Se for um NOVO sistema ($isNew), inicializa estruturas canônicas padrão para campos não expostos na UI
    if ($isNew) {
        if (!isset($updatedSystem['trial_config'])) {
            $updatedSystem['trial_config'] = [
                'enabled' => true,
                'days' => 7,
                'max_devices' => 1,
                'max_users' => 2
            ];
        }
        if (!isset($updatedSystem['project_custom_brand_config'])) {
            $updatedSystem['project_custom_brand_config'] = [
                'enabled' => true,
                'name' => 'Projeto com Marca',
                'description' => 'Personalização de marca, domínio próprio e suporte exclusivo'
            ];
        }
    }

    // Faz backup automático antes de salvar
    backupCatalogFile($catalogFile, $catalogRaw);

    $catalogData['systems'][$slug] = $updatedSystem;
    $catalogData['updated_at'] = date('c');

    $newRaw = json_encode($catalogData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($catalogFile, $newRaw);

    echo json_encode([
        'status' => 'success',
        'message' => 'Sistema salvo com sucesso no catálogo.',
        'data' => $updatedSystem
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($action === 'toggle_status') {
    $slug = trim((string) ($jsonData['slug'] ?? ''));
    if (!isset($catalogData['systems'][$slug])) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Sistema não encontrado no catálogo.']);
        exit;
    }

    $newStatus = ($jsonData['commercial_status'] ?? '') === 'active' ? 'active' : 'inactive';

    // Faz backup automático antes de salvar
    backupCatalogFile($catalogFile, $catalogRaw);

    $catalogData['systems'][$slug]['commercial_status'] = $newStatus;
    $catalogData['updated_at'] = date('c');

    $newRaw = json_encode($catalogData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($catalogFile, $newRaw);

    echo json_encode([
        'status' => 'success',
        'message' => "Status do sistema {$slug} alterado para {$newStatus} com sucesso."
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Ação administrativa inválida.']);
exit;
