<?php
/**
 * api_catalog.php
 * Endpoint público/seguro para expor o Catálogo Comercial Local Oficial ao Painel Admin.
 * Fase C.5.3 - Integração Frontend Admin com o Catálogo Local
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

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$catalog = loadCommercialCatalog();
$systems = $catalog['systems'] ?? [];

$publicSystems = [];
foreach ($systems as $slug => $sys) {
    $publicSystems[$slug] = [
        'id' => $sys['id'] ?? $slug,
        'title' => $sys['name'] ?? $sys['title'] ?? $slug,
        'name' => $sys['name'] ?? $slug,
        'description' => $sys['subtitle'] ?? $sys['description'] ?? '',
        'status' => $sys['commercial_status'] ?? $sys['status'] ?? 'active',
        'publicPath' => $sys['public_path'] ?? $sys['publicPath'] ?? $slug,
        'saas_recommended' => !empty($sys['saas_recommended']),
        'standard_ml_allowed' => !empty($sys['standard_ml_allowed']),
        'offline_standalone_fallback' => $sys['offline_standalone_fallback'] ?? null,
        'allowed_channels' => $sys['allowed_channels'] ?? [],
        'allowed_commercial_models' => $sys['allowed_commercial_models'] ?? [],
        'lifetime_plans' => $sys['lifetime_plans'] ?? [],
        'saas_plans' => $sys['saas_plans'] ?? []
    ];
}

echo json_encode([
    'status' => 'success',
    'source' => 'local_official',
    'data' => $publicSystems,
    'version' => $catalog['version'] ?? '1.0.0'
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
exit;
