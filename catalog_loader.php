<?php
/**
 * catalog_loader.php
 * Helper centralizado para carregar e consultar o Catálogo Comercial Local Oficial.
 * Fase C.5.2 / C.5.2.1 - Integração Backend e Ajuste de Permissões por Contexto
 */

function loadCommercialCatalog() {
    static $cachedCatalog = null;
    if ($cachedCatalog !== null) {
        return $cachedCatalog;
    }

    $jsonPath = __DIR__ . '/api_data/products_catalog.json';

    $fallbackCatalog = [
        'version' => '1.0.0-fallback',
        'systems' => [
            'gestao-barbearia' => [
                'id' => 'gestao-barbearia',
                'name' => 'Gestão Barbearia',
                'commercial_status' => 'active',
                'saas_recommended' => false,
                'standard_ml_allowed' => true,
                'allowed_channels' => ['mercadolivre', 'direct', 'landing_page', 'admin_saas'],
                'allowed_commercial_models' => ['ml_lifetime', 'direct_lifetime', 'pro_lifetime', 'trial', 'online_essential', 'online_premium', 'project_custom_brand'],
                'saas_plans' => [
                    'online_essential' => ['code' => 'basic', 'name' => 'Online Essencial', 'monthly_price' => 59.90],
                    'online_premium' => ['code' => 'premium', 'name' => 'Online Premium', 'monthly_price' => 99.00]
                ]
            ],
            'gestao-beleza' => [
                'id' => 'gestao-beleza',
                'name' => 'Gestão Beleza',
                'commercial_status' => 'active',
                'saas_recommended' => false,
                'standard_ml_allowed' => true,
                'allowed_channels' => ['mercadolivre', 'direct', 'landing_page', 'admin_saas'],
                'allowed_commercial_models' => ['ml_lifetime', 'direct_lifetime', 'pro_lifetime', 'trial', 'online_essential', 'online_premium', 'project_custom_brand'],
                'saas_plans' => [
                    'online_essential' => ['code' => 'basic', 'name' => 'Online Essencial', 'monthly_price' => 59.90],
                    'online_premium' => ['code' => 'premium', 'name' => 'Online Premium', 'monthly_price' => 99.00]
                ]
            ],
            'gestao-assistencia' => [
                'id' => 'gestao-assistencia',
                'name' => 'Gestão Assistência',
                'commercial_status' => 'active',
                'saas_recommended' => false,
                'standard_ml_allowed' => true,
                'allowed_channels' => ['mercadolivre', 'direct', 'landing_page', 'admin_saas'],
                'allowed_commercial_models' => ['ml_lifetime', 'direct_lifetime', 'pro_lifetime', 'trial', 'online_essential', 'online_premium', 'project_custom_brand'],
                'saas_plans' => [
                    'online_essential' => ['code' => 'basic', 'name' => 'Online Essencial', 'monthly_price' => 97.90],
                    'online_premium' => ['code' => 'premium', 'name' => 'Online Premium', 'monthly_price' => 149.90]
                ]
            ],
            'gestao-gastro' => [
                'id' => 'gestao-gastro',
                'name' => 'Gestão Gastro',
                'commercial_status' => 'active',
                'saas_recommended' => true,
                'standard_ml_allowed' => false,
                'allowed_channels' => ['direct', 'landing_page', 'admin_saas'],
                'allowed_commercial_models' => ['trial', 'online_essential', 'online_premium', 'project_custom_brand'],
                'offline_standalone_fallback' => [
                    'permitted' => true,
                    'requires_custom_infrastructure' => true
                ],
                'saas_plans' => [
                    'online_essential' => ['code' => 'basic', 'name' => 'Online Essencial', 'monthly_price' => 89.00],
                    'online_premium' => ['code' => 'premium', 'name' => 'Online Premium', 'monthly_price' => 189.00]
                ]
            ]
        ]
    ];

    if (!file_exists($jsonPath)) {
        $cachedCatalog = $fallbackCatalog;
        return $cachedCatalog;
    }

    $rawContent = @file_get_contents($jsonPath);
    if (empty($rawContent)) {
        $cachedCatalog = $fallbackCatalog;
        return $cachedCatalog;
    }

    $decoded = json_decode($rawContent, true);
    if (!is_array($decoded) || empty($decoded['systems']) || !is_array($decoded['systems'])) {
        $cachedCatalog = $fallbackCatalog;
        return $cachedCatalog;
    }

    $cachedCatalog = $decoded;
    return $cachedCatalog;
}

function getCommercialSystems() {
    $catalog = loadCommercialCatalog();
    return $catalog['systems'] ?? [];
}

function getCommercialSystem($systemSlug) {
    $systems = getCommercialSystems();
    return $systems[$systemSlug] ?? null;
}

function isSystemStandardMLAllowed($systemSlug) {
    $system = getCommercialSystem($systemSlug);
    if (!$system) {
        return false;
    }
    return !empty($system['standard_ml_allowed']);
}

function isOfflineFallbackPermitted($systemSlug) {
    $system = getCommercialSystem($systemSlug);
    if (!$system || empty($system['offline_standalone_fallback'])) {
        return false;
    }
    return !empty($system['offline_standalone_fallback']['permitted']);
}

function isSystemAllowedForModel($systemSlug, $modelCode) {
    $system = getCommercialSystem($systemSlug);
    if (!$system || empty($system['allowed_commercial_models']) || !is_array($system['allowed_commercial_models'])) {
        return false;
    }
    return in_array($modelCode, $system['allowed_commercial_models'], true);
}

function getAllowedSystemsForML() {
    $systems = getCommercialSystems();
    $allowed = [];
    foreach ($systems as $slug => $config) {
        if (!empty($config['standard_ml_allowed'])) {
            $allowed[] = $slug;
        }
    }
    return $allowed;
}

function getAllowedSystemsForLicenseGeneration() {
    $systems = getCommercialSystems();
    $allowed = [];
    foreach ($systems as $slug => $config) {
        if (!empty($config['standard_ml_allowed']) || isOfflineFallbackPermitted($slug)) {
            $allowed[] = $slug;
        }
    }
    return $allowed;
}

function getAllowedSystemsForLeads() {
    $systems = getCommercialSystems();
    $allowed = [];
    foreach ($systems as $slug => $config) {
        $status = $config['commercial_status'] ?? 'active';
        if ($status === 'active') {
            $allowed[] = $slug;
        }
    }
    return !empty($allowed) ? $allowed : array_keys($systems);
}

function getDefaultSystemId() {
    return 'gestao-barbearia';
}
