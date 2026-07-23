<?php
// API V11.8 - PROFESSIONAL FULL (SECURE ENV + CORS DYNAMIC)
require_once __DIR__ . '/env_loader.php';
require_once __DIR__ . '/catalog_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

// --- CORS DINAMICO (V11.8) ---
// Aceita o domínio de produção (qualquer variação) + localhost para dev
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
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. CONFIG
$ADMIN_SECRET = env('ADMIN_SECRET');
$fileLicenses = __DIR__ . '/api_data/database_licenses_secure.json';
$fileArchivedLicenses = __DIR__ . '/api_data/database_licenses_archived.json';
$fileLogs = __DIR__ . '/api_data/system_logs.json';
$fileReceipts = __DIR__ . '/api_data/receipts_log.json';
$fileEvolutionLeads = __DIR__ . '/api_data/evolution_leads.json';
$SUPABASE_URL = env('SUPABASE_URL');
$SUPABASE_KEY = env('SUPABASE_SERVICE_KEY');

// 2. CAPTURA DE DADOS
$action = $_GET['action'] ?? '';
$rawInput = file_get_contents("php://input");
$jsonData = json_decode($rawInput, true) ?? [];

if (empty($action) && isset($jsonData['action']))
    $action = $jsonData['action'];

// 3. HELPERS
function getDB($file)
{
    if (!file_exists($file))
        return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?? [];
}

function saveDB($file, $data)
{
    if (!is_dir(dirname($file)))
        mkdir(dirname($file), 0755, true);
    $fp = fopen($file, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    return false;
}

function validateSecret($data, $secret)
{
    if (!isset($data['secret']))
        return false;
    // Aceita a senha direta OU o token diário (hash da senha + data)
    $token = hash('sha256', $secret . date('Y-m-d'));
    return ($data['secret'] === $secret || $data['secret'] === $token);
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

function supabaseLicenseRequest($method, $endpoint, $body = null)
{
    global $SUPABASE_URL, $SUPABASE_KEY;

    if (empty($SUPABASE_URL) || empty($SUPABASE_KEY)) {
        return ['code' => 0, 'data' => null, 'error' => 'Supabase nao configurado.', 'raw' => ''];
    }

    $ch = curl_init(rtrim($SUPABASE_URL, '/') . $endpoint);
    $headers = [
        "apikey: $SUPABASE_KEY",
        "Authorization: Bearer $SUPABASE_KEY",
        "Content-Type: application/json"
    ];

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, 1);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
    } elseif ($method !== 'GET') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }
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
        'raw' => $response === false ? '' : $response
    ];
}

function findSaasLicense($key, $requestEmail = '', $requestTenantId = '', $requestTenantSlug = '')
{
    $safeKey = rawurlencode((string)$key);
    $endpoint = '/rest/v1/licenses?select=license_key,status,expires_at,license_type,tenant_id,activation_email,max_devices,device_id,activated_at,last_verified_at,metadata,plans(code),tenants(slug,name),customers(email,name)&license_key=eq.' . $safeKey . '&limit=1';
    $res = supabaseLicenseRequest('GET', $endpoint);

    // 1. Identificar se o erro é Upstream ou Configuração
    if ($res['code'] !== 200) {
        $code = $res['code'];
        $err = (isset($res['error']) && trim((string)$res['error']) !== '') ? $res['error'] : ((isset($res['raw']) && trim((string)$res['raw']) !== '') ? $res['raw'] : '');

        if ($code === 0 || $code >= 500) {
            addLog("SaaS upstream_error: Indisponibilidade do Supabase. HTTP $code. Erro: $err", 'error');
            return [
                'result' => 'upstream_error',
                'code' => $code,
                'error' => $err
            ];
        } else {
            addLog("SaaS configuration_error: Falha de requisicao/credencial. HTTP $code. Erro: $err", 'error');
            return [
                'result' => 'configuration_error',
                'code' => $code,
                'error' => $err
            ];
        }
    }

    // 1.1 Tratar caso de HTTP 200 com JSON inválido (resposta upstream inválida)
    if ($res['data'] === null) {
        $err = (isset($res['raw']) && trim((string)$res['raw']) !== '') ? $res['raw'] : 'Invalid JSON';
        addLog("SaaS upstream_error: Resposta do Supabase nao e um JSON valido. Raw: " . trim($err), 'error');
        return [
            'result' => 'upstream_error',
            'code' => 200,
            'error' => 'Invalid JSON from Supabase'
        ];
    }

    // 2. HTTP 200 com array vazio: licença realmente inexistente
    if (empty($res['data'][0])) {
        return [
            'result' => 'not_found'
        ];
    }

    $license = $res['data'][0];
    $status = (string)($license['status'] ?? '');
    if (!empty($license['expires_at']) && time() > strtotime($license['expires_at'])) {
        $status = 'expired';
    }

    $tenantId = trim((string)($license['tenant_id'] ?? ''));
    $tenant = $license['tenants'] ?? [];
    $tenantSlug = trim((string)($tenant['slug'] ?? ''));

    // 3. Divergência de Tenant
    if ($requestTenantSlug !== '' && !hash_equals(normalizeTenantSlugValue($tenantSlug), normalizeTenantSlugValue($requestTenantSlug))) {
        return [
            'result' => 'identity_mismatch',
            'detail' => 'Tenant slug mismatch'
        ];
    }

    if ($requestTenantSlug === '' && $requestTenantId !== '' && !hash_equals(strtolower($tenantId), strtolower(trim((string)$requestTenantId)))) {
        return [
            'result' => 'identity_mismatch',
            'detail' => 'Tenant ID mismatch'
        ];
    }

    // 4. Divergência de E-mail
    $customer = $license['customers'] ?? [];
    $licenseEmail = strtolower(trim((string)($license['activation_email'] ?? $customer['email'] ?? '')));
    $requestEmailNormalized = strtolower(trim((string)$requestEmail));
    if ($requestEmailNormalized !== '' && $licenseEmail !== '' && !hash_equals($licenseEmail, $requestEmailNormalized)) {
        return [
            'result' => 'identity_mismatch',
            'detail' => 'Email mismatch'
        ];
    }

    $plan = $license['plans'] ?? [];
    $metadata = is_array($license['metadata'] ?? null) ? $license['metadata'] : [];

    // 5. Sucesso (Found)
    return [
        'result' => 'found',
        'status' => $status,
        'license_key' => $license['license_key'] ?? $key,
        'client' => $tenant['name'] ?? $customer['name'] ?? 'Gestao Gastro',
        'tenant_id' => $tenantId,
        'tenant_slug' => $tenantSlug,
        'plan' => $plan['code'] ?? $metadata['plan_slug'] ?? 'base',
        'is_trial' => (($license['license_type'] ?? '') === 'trial'),
        'expiration_date' => $license['expires_at'] ?? null,
        'max_devices' => $license['max_devices'] ?? null,
        'device_id' => $license['device_id'] ?? '',
        'activated_at' => $license['activated_at'] ?? null,
        'last_verified_at' => $license['last_verified_at'] ?? null,
        'metadata' => $metadata,
    ];
}

function normalizeDeviceId($device)
{
    return substr(preg_replace('/[^a-zA-Z0-9_.:-]/', '', trim((string)$device)), 0, 120);
}

function saasLicensePatch($licenseKey, array $payload)
{
    $safeKey = rawurlencode((string)$licenseKey);
    return supabaseLicenseRequest('PATCH', '/rest/v1/licenses?license_key=eq.' . $safeKey, $payload);
}

function buildSaasDeviceMetadata(array $license, $device, $isInitialActivation = false)
{
    $metadata = is_array($license['metadata'] ?? null) ? $license['metadata'] : [];
    $metadata['last_device_id'] = $device;
    $metadata['last_ip'] = $_SERVER['REMOTE_ADDR'] ?? '';
    $metadata['last_user_agent'] = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);
    if ($isInitialActivation || empty($metadata['device_registered_at'])) {
        $metadata['device_registered_at'] = gmdate('c');
    }
    return $metadata;
}

function registerSaasLicenseDevice(array $license, $device)
{
    $device = normalizeDeviceId($device);
    if ($device === '') {
        return ['ok' => false, 'status' => 'error', 'message' => 'Identificador do dispositivo ausente.'];
    }

    $existingDevice = normalizeDeviceId($license['device_id'] ?? '');
    $maxDevices = (int)($license['max_devices'] ?? 1);
    if ($maxDevices <= 0) {
        $maxDevices = 1;
    }

    if ($existingDevice !== '' && $existingDevice !== $device) {
        return [
            'ok' => false,
            'status' => 'error',
            'message' => 'Licenca ja usada em outro aparelho. Solicite reset do dispositivo.',
        ];
    }

    $now = gmdate('c');
    $isInitialActivation = $existingDevice === '';
    $payload = [
        'device_id' => $device,
        'last_verified_at' => $now,
        'metadata' => buildSaasDeviceMetadata($license, $device, $isInitialActivation),
    ];
    if ($isInitialActivation || empty($license['activated_at'])) {
        $payload['activated_at'] = $now;
    }

    $res = saasLicensePatch($license['license_key'], $payload);
    if ($res['code'] < 200 || $res['code'] >= 300) {
        addLog("Falha ao registrar dispositivo SaaS para chave {$license['license_key']}: HTTP {$res['code']}", 'error');
        return ['ok' => false, 'status' => 'error', 'message' => 'Erro ao registrar dispositivo da licenca.'];
    }

    $license['device_id'] = $device;
    $license['last_verified_at'] = $now;
    $license['metadata'] = $payload['metadata'];
    if (isset($payload['activated_at'])) {
        $license['activated_at'] = $payload['activated_at'];
    }

    return ['ok' => true, 'license' => $license];
}

function touchSaasLicenseVerification(array $license, $device = '')
{
    $device = normalizeDeviceId($device);
    $existingDevice = normalizeDeviceId($license['device_id'] ?? '');

    if ($existingDevice !== '' && $device !== '' && $existingDevice !== $device) {
        return [
            'ok' => false,
            'status' => 'success',
            'license_status' => 'blocked',
            'message' => 'Licenca ja usada em outro aparelho. Solicite reset do dispositivo.',
        ];
    }

    if ($existingDevice === '' && $device !== '') {
        return registerSaasLicenseDevice($license, $device);
    }

    $payload = [
        'last_verified_at' => gmdate('c'),
    ];
    if ($device !== '') {
        $payload['metadata'] = buildSaasDeviceMetadata($license, $device, false);
    }

    $res = saasLicensePatch($license['license_key'], $payload);
    if ($res['code'] < 200 || $res['code'] >= 300) {
        addLog("Falha ao atualizar verificacao SaaS para chave {$license['license_key']}: HTTP {$res['code']}", 'warning');
    }

    return ['ok' => true];
}

function resetSaasLicenseDevice($licenseKey)
{
    $saasLicense = findSaasLicense($licenseKey);

    if (!$saasLicense || $saasLicense['result'] !== 'found') {
        $errType = $saasLicense['result'] ?? 'not_found';
        $msg = 'Chave não encontrada no banco central.';
        if ($errType === 'upstream_error') {
            $msg = 'Erro ao conectar ao servidor de licenças (indisponível).';
        } elseif ($errType === 'configuration_error') {
            $msg = 'Erro de configuração no servidor de licenças.';
        }
        return [
            'ok' => false,
            'result' => $errType,
            'message' => $msg
        ];
    }

    $res = saasLicensePatch($licenseKey, [
        'device_id' => null,
        'activated_at' => null,
        'last_verified_at' => null,
    ]);

    if ($res['code'] < 200 || $res['code'] >= 300) {
        return [
            'ok' => false,
            'result' => 'upstream_error',
            'message' => 'Erro ao atualizar o banco central.'
        ];
    }

    return ['ok' => true, 'result' => 'found'];
}

function buildSaasLicenseResponse(array $license, $forVerify = false)
{
    $response = [
        'status' => 'success',
        'client' => $license['client'],
        'tenant_id' => $license['tenant_id'],
        'plan' => $license['plan'],
        'is_master' => false,
    ];

    if ($forVerify) {
        $response['license_status'] = $license['status'];
    } else {
        $response['valid'] = $license['status'] === 'active';
    }

    if (!empty($license['is_trial'])) {
        $response['is_trial'] = true;
        $response['expiration_date'] = $license['expiration_date'];
    }

    if ($license['status'] === 'expired') {
        $response['status'] = $forVerify ? 'success' : 'expired';
        if (!$forVerify) {
            $response['message'] = 'Periodo de teste expirado.';
        }
    }

    return $response;
}

function isArchiveCandidate(array $license)
{
    $protectedStatuses = ['active', 'pending'];
    if (in_array($license['status'] ?? '', $protectedStatuses)) {
        return false;
    }
    $isTrial = !empty($license['is_trial']) || ($license['type'] ?? '') === 'trial';
    if ($isTrial && !empty($license['expiration_date'])) {
        if (time() < strtotime($license['expiration_date'])) {
            return false;
        }
    }
    return true;
}

function addLog($msg, $type = 'info', $file = '')
{
    global $fileLogs;
    $db = getDB($fileLogs);
    if (!isset($db['logs']))
        $db['logs'] = [];
    $db['logs'][] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'type' => $type,
        'msg' => $msg,
        'ip' => $_SERVER['REMOTE_ADDR']
    ];
    // Mantém apenas os últimos 500 logs
    if (count($db['logs']) > 500)
        array_shift($db['logs']);
    saveDB($fileLogs, $db);
}

// 4. ROTAS
if ($action === 'ping') {
    echo json_encode(['status' => 'success', 'msg' => 'V11.2 Full Online']);
    exit;
}

// --- ROTAS ADMINISTRATIVAS (EXIGEM SECRET) ---

if ($action === 'list' || $action === 'get_licenses') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acesso Negado']);
        exit;
    }
    $db = getDB($fileLicenses);
    $response = [];
    foreach ($db as $k => $v) {
        $response[] = array_merge(['key' => $k], $v);
    }
    echo json_encode($response);
    exit;
}

if ($action === 'list_archived') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acesso Negado']);
        exit;
    }
    if (!file_exists($fileArchivedLicenses)) {
        echo json_encode([]);
        exit;
    }
    $db = getDB($fileArchivedLicenses);
    $response = [];
    foreach ($db as $k => $v) {
        $response[] = array_merge(['key' => $k], $v);
    }
    echo json_encode($response);
    exit;
}

if ($action === 'archive_inactive_preview') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $db = getDB($fileLicenses);
    $candidates = [];
    foreach ($db as $k => $v) {
        if (isArchiveCandidate($v)) {
            $candidates[] = array_merge(['key' => $k], $v);
        }
    }
    echo json_encode(['status' => 'success', 'candidates' => $candidates]);
    exit;
}

if ($action === 'archive_inactive') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $db = getDB($fileLicenses);
    $archivedDb = getDB($fileArchivedLicenses);

    $archivedCount = 0;
    $newDb = [];
    foreach ($db as $k => $v) {
        if (isArchiveCandidate($v)) {
            $v['archived_at'] = date('Y-m-d H:i:s');
            $v['archive_reason'] = 'Auto-arquivamento de inativas';
            $archivedDb[$k] = $v;
            $archivedCount++;
        } else {
            $newDb[$k] = $v;
        }
    }

    if ($archivedCount > 0) {
        saveDB($fileArchivedLicenses, $archivedDb);
        saveDB($fileLicenses, $newDb);
        addLog("Arquivamento em lote: $archivedCount licenças inativas movidas para o arquivo", 'warning');
    }

    echo json_encode(['status' => 'success', 'archived_count' => $archivedCount]);
    exit;
}

if ($action === 'archive_selected') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $requestedKeys = $jsonData['keys'] ?? [];
    $db = getDB($fileLicenses);
    $archivedDb = getDB($fileArchivedLicenses);

    $archivedCount = 0;
    $skippedKeys = [];

    foreach ($requestedKeys as $key) {
        if (isset($db[$key])) {
            $license = $db[$key];
            if (isArchiveCandidate($license)) {
                $license['archived_at'] = date('Y-m-d H:i:s');
                $license['archive_reason'] = 'Arquivamento selecionado pelo administrador';
                $archivedDb[$key] = $license;
                unset($db[$key]);
                $archivedCount++;
            } else {
                $skippedKeys[] = $key;
            }
        } else {
            $skippedKeys[] = $key;
        }
    }

    if ($archivedCount > 0) {
        saveDB($fileArchivedLicenses, $archivedDb);
        saveDB($fileLicenses, $db);
        addLog("Arquivamento selecionado: $archivedCount licenças movidas para o arquivo", 'warning');
    }

    echo json_encode([
        'status' => 'success',
        'selected_count' => $archivedCount,
        'skipped_keys' => $skippedKeys
    ]);
    exit;
}

if ($action === 'dashboard_stats') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $db = getDB($fileLicenses);
    $stats = [
        'total_licenses' => count($db),
        'active_licenses' => 0,
        'pending_licenses' => 0,
        'blocked_licenses' => 0,
        'trial_active' => 0,
        'trial_expired' => 0,
        'revenue_total' => 0.0,
        'recurring_revenue' => 0.0,
        'revenue_ml' => 0.0,
        'revenue_direta' => 0.0,
        'by_plan_code' => [],
        'by_sales_channel' => [],
        'by_product' => []
    ];
    $now = time();
    foreach ($db as $l) {
        $status = $l['status'] ?? 'pending';
        $type = $l['type'] ?? '';
        $isTrial = !empty($l['is_trial']) || $type === 'trial';

        // Contadores Principais
        if ($status === 'active') {
            $stats['active_licenses']++;
        } elseif ($status === 'pending') {
            $stats['pending_licenses']++;
        } elseif ($status === 'blocked') {
            $stats['blocked_licenses']++;
        }

        // Trials
        if ($isTrial) {
            $isExpired = false;
            if (!empty($l['expiration_date'])) {
                if ($now > strtotime($l['expiration_date'])) {
                    $isExpired = true;
                }
            }
            if ($isExpired) {
                $stats['trial_expired']++;
            } else {
                $stats['trial_active']++;
            }
        }

        // Receita
        if (!$isTrial) {
            $price = isset($l['price']) ? (float)$l['price'] : 0.0;
            $stats['revenue_total'] += $price;

            $billingModel = $l['billing_model'] ?? '';
            $planCode = $l['plan_code'] ?? '';
            $channel = $l['sales_channel'] ?? 'mercado_livre';

            if ($billingModel === 'recurring' || $planCode === 'premium_monthly' || $channel === 'premium_online') {
                $stats['recurring_revenue'] += $price;
            } elseif ($channel === 'mercado_livre') {
                $stats['revenue_ml'] += $price;
            } elseif ($channel === 'venda_direta') {
                $stats['revenue_direta'] += $price;
            } else {
                // Se não identificado, assume ML por legado
                $stats['revenue_ml'] += $price;
            }
        }

        // Agrupamentos
        $planCode = $l['plan_code'] ?? 'ml_lifetime';
        $stats['by_plan_code'][$planCode] = ($stats['by_plan_code'][$planCode] ?? 0) + 1;

        $channel = $l['sales_channel'] ?? 'mercado_livre';
        $stats['by_sales_channel'][$channel] = ($stats['by_sales_channel'][$channel] ?? 0) + 1;

        $pName = $l['product'] ?? 'Desconhecido';
        if (!isset($stats['by_product'][$pName])) {
            $stats['by_product'][$pName] = [
                'total' => 0,
                'active' => 0,
                'pending' => 0,
                'blocked' => 0
            ];
        }
        $stats['by_product'][$pName]['total']++;
        if ($status === 'active') {
            $stats['by_product'][$pName]['active']++;
        } elseif ($status === 'pending') {
            $stats['by_product'][$pName]['pending']++;
        } elseif ($status === 'blocked') {
            $stats['by_product'][$pName]['blocked']++;
        }
    }

    // Carrega dados de Leads de Evolução para estatísticas operacionais
    $leads = getDB($fileEvolutionLeads);
    $leadsStats = [
        'total' => count($leads),
        'novo' => 0,
        'contatado' => 0,
        'proposta_enviada' => 0,
        'convertido' => 0,
        'perdido' => 0,
        'descartado' => 0,
        'novos_hoje' => 0
    ];
    $today = date('Y-m-d');
    foreach ($leads as $lead) {
        $status = $lead['status'] ?? 'novo';
        if (isset($leadsStats[$status])) {
            $leadsStats[$status]++;
        }
        if (isset($lead['created_at']) && str_starts_with($lead['created_at'], $today)) {
            $leadsStats['novos_hoje']++;
        }
    }
    $stats['evolution_leads'] = $leadsStats;

    echo json_encode($stats);
    exit;
}

if ($action === 'customers_summary') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Acesso Negado']);
        exit;
    }

    $db = getDB($fileLicenses);
    $customers = [];

    foreach ($db as $key => $l) {
        $email = '';
        if (!empty($l['email_activation'])) {
            $email = strtolower(trim($l['email_activation']));
        } elseif (isset($l['client']) && str_contains($l['client'], '@')) {
            $email = strtolower(trim($l['client']));
        }

        $groupKey = !empty($email) ? $email : $key;

        $status = $l['status'] ?? 'pending';
        $system = $l['product'] ?? 'Sistema';
        $created_at = $l['created_at'] ?? '';

        $isTrial = !empty($l['is_trial']) || ($l['type'] ?? '') === 'trial';

        if (!isset($customers[$groupKey])) {
            $name = $l['client'] ?? 'Desconhecido';
            if (!empty($email) && $name === $email) {
                $name = explode('@', $email)[0];
            }

            $customers[$groupKey] = [
                'name' => $name,
                'email' => $email,
                'slug' => $l['slug'] ?? '',
                'systems' => [$system],
                'active_system' => ($status === 'active') ? $system : null,
                'plan_code' => $l['plan_code'] ?? 'ml_lifetime',
                'plan_name' => $l['plan_name'] ?? 'ML Vitalício',
                'billing_model' => $l['billing_model'] ?? 'one_time',
                'sales_channel' => $l['sales_channel'] ?? 'mercado_livre',
                'status' => $status,
                'license_key' => $key,
                'total_licenses' => 1,
                'active_licenses' => ($status === 'active') ? 1 : 0,
                'last_created_at' => $created_at,
                'public_link' => '',

                // New fields
                'customer_key' => $groupKey,
                'sources' => ['licenses'],
                'licenses_count' => 1,
                'leads_count' => 0,
                'open_leads_count' => 0,
                'last_lead_at' => null,
                'last_lead_status' => null,
                'last_interest_type' => null,
                'last_target_plan_code' => null,
                'customer_whatsapp' => '',
                'customer_name' => $name,
                'contact_consent' => false,
                'has_saas' => false,
                'saas_tenants_count' => 0,
                'trial_count' => $isTrial ? 1 : 0,
                'active_count' => ($status === 'active') ? 1 : 0,
                'blocked_count' => ($status === 'blocked') ? 1 : 0,
                'pending_count' => ($status === 'pending') ? 1 : 0,
                'relationship_stage' => 'customer_local',
                'data_completeness' => 'license_only'
            ];
        } else {
            $c = &$customers[$groupKey];

            if (!in_array($system, $c['systems'])) {
                $c['systems'][] = $system;
            }

            if ($status === 'active') {
                $c['active_licenses']++;
                if (empty($c['active_system'])) {
                    $c['active_system'] = $system;
                }
            }
            $c['total_licenses']++;
            $c['licenses_count']++;

            if (!empty($l['slug'])) {
                $c['slug'] = $l['slug'];
            }

            if ($status === 'active') {
                $c['status'] = 'active';
                $c['active_count']++;
            } elseif ($status === 'pending') {
                $c['pending_count']++;
            } elseif ($status === 'blocked') {
                $c['blocked_count']++;
            }

            if ($isTrial) {
                $c['trial_count']++;
            }

            if ($status === 'active') {
                $c['status'] = 'active';
            } elseif ($c['status'] !== 'active' && $status === 'pending') {
                $c['status'] = 'pending';
            }

            $currentCreated = strtotime($created_at);
            $lastCreated = strtotime($c['last_created_at']);
            if ($currentCreated > $lastCreated) {
                $c['last_created_at'] = $created_at;
                $c['plan_code'] = $l['plan_code'] ?? $c['plan_code'];
                $c['plan_name'] = $l['plan_name'] ?? $c['plan_name'];
                $c['billing_model'] = $l['billing_model'] ?? $c['billing_model'];
                $c['sales_channel'] = $l['sales_channel'] ?? $c['sales_channel'];
                $c['license_key'] = $key;
                if (!empty($l['slug'])) {
                    $c['slug'] = $l['slug'];
                }
            }
        }
    }

    $leads = getDB($fileEvolutionLeads);
    $getSystemTitle = function($sysId) {
        $titles = [
            'gestao-gastro' => 'Gestão Gastro',
            'gestao-barbearia' => 'Gestão Barbearia',
            'gestao-beleza' => 'Gestão Beleza',
            'gestao-assistencia' => 'Gestão Assistência'
        ];
        return $titles[strtolower(trim($sysId))] ?? $sysId;
    };

    foreach ($leads as $lead) {
        $leadEmail = !empty($lead['email']) ? strtolower(trim($lead['email'])) : '';
        $leadLicense = !empty($lead['license_key']) ? trim($lead['license_key']) : '';
        $leadName = !empty($lead['customer_name']) ? trim($lead['customer_name']) : '';
        $leadWhatsapp = !empty($lead['customer_whatsapp']) ? trim($lead['customer_whatsapp']) : '';
        $consent = !empty($lead['contact_consent']);
        $leadStatus = $lead['status'] ?? 'novo';
        $leadSystem = $getSystemTitle($lead['system_id'] ?? '');

        $matchedKey = null;
        if (!empty($leadEmail) && isset($customers[$leadEmail])) {
            $matchedKey = $leadEmail;
        } else {
            foreach ($customers as $gk => $c) {
                if ($c['license_key'] === $leadLicense) {
                    $matchedKey = $gk;
                    break;
                }
            }
        }

        if ($matchedKey !== null) {
            $c = &$customers[$matchedKey];
            if (!in_array('evolution_leads', $c['sources'])) {
                $c['sources'][] = 'evolution_leads';
            }
            if (!in_array($leadSystem, $c['systems'])) {
                $c['systems'][] = $leadSystem;
            }
            if ($leadWhatsapp !== '' && empty($c['customer_whatsapp'])) {
                $c['customer_whatsapp'] = $leadWhatsapp;
            }
            if ($leadName !== '' && ($c['name'] === 'Desconhecido' || empty($c['name']))) {
                $c['name'] = $leadName;
                $c['customer_name'] = $leadName;
            }
            if ($consent) {
                $c['contact_consent'] = true;
            }

            $c['leads_count']++;
            if (in_array($leadStatus, ['novo', 'contatado', 'proposta_enviada'])) {
                $c['open_leads_count']++;
            }

            $leadTime = !empty($lead['created_at']) ? strtotime($lead['created_at']) : 0;
            $currentLastLeadTime = !empty($c['last_lead_at']) ? strtotime($c['last_lead_at']) : 0;
            if ($leadTime > $currentLastLeadTime) {
                $c['last_lead_at'] = $lead['created_at'];
                $c['last_lead_status'] = $leadStatus;
                $c['last_interest_type'] = $lead['interest_type'] ?? 'feature_interest';
                $c['last_target_plan_code'] = $lead['target_plan_code'] ?? null;
            }
        } else {
            $groupKey = !empty($leadEmail) ? $leadEmail : (!empty($leadLicense) ? $leadLicense : 'lead_' . uniqid());

            if (isset($customers[$groupKey])) {
                $c = &$customers[$groupKey];
                if (!in_array($leadSystem, $c['systems'])) {
                    $c['systems'][] = $leadSystem;
                }
                if ($leadWhatsapp !== '' && empty($c['customer_whatsapp'])) {
                    $c['customer_whatsapp'] = $leadWhatsapp;
                }
                if ($leadName !== '' && ($c['name'] === 'Lead Interessado' || empty($c['name']))) {
                    $c['name'] = $leadName;
                    $c['customer_name'] = $leadName;
                }
                if ($consent) {
                    $c['contact_consent'] = true;
                }
                $c['leads_count']++;
                if (in_array($leadStatus, ['novo', 'contatado', 'proposta_enviada'])) {
                    $c['open_leads_count']++;
                }
                $leadTime = !empty($lead['created_at']) ? strtotime($lead['created_at']) : 0;
                $currentLastLeadTime = !empty($c['last_lead_at']) ? strtotime($c['last_lead_at']) : 0;
                if ($leadTime > $currentLastLeadTime) {
                    $c['last_lead_at'] = $lead['created_at'];
                    $c['last_lead_status'] = $leadStatus;
                    $c['last_interest_type'] = $lead['interest_type'] ?? 'feature_interest';
                    $c['last_target_plan_code'] = $lead['target_plan_code'] ?? null;
                }
            } else {
                $name = !empty($leadName) ? $leadName : 'Lead Interessado';
                $customers[$groupKey] = [
                    'name' => $name,
                    'email' => $leadEmail,
                    'slug' => '',
                    'systems' => [$leadSystem],
                    'active_system' => null,
                    'plan_code' => null,
                    'plan_name' => null,
                    'billing_model' => null,
                    'sales_channel' => null,
                    'status' => 'pending',
                    'license_key' => $leadLicense,
                    'total_licenses' => 0,
                    'active_licenses' => 0,
                    'last_created_at' => null,
                    'public_link' => '',

                    'customer_key' => $groupKey,
                    'sources' => ['evolution_leads'],
                    'licenses_count' => 0,
                    'leads_count' => 1,
                    'open_leads_count' => in_array($leadStatus, ['novo', 'contatado', 'proposta_enviada']) ? 1 : 0,
                    'last_lead_at' => $lead['created_at'] ?? null,
                    'last_lead_status' => $leadStatus,
                    'last_interest_type' => $lead['interest_type'] ?? 'feature_interest',
                    'last_target_plan_code' => $lead['target_plan_code'] ?? null,
                    'customer_whatsapp' => $leadWhatsapp,
                    'customer_name' => $name,
                    'contact_consent' => $consent,
                    'has_saas' => false,
                    'saas_tenants_count' => 0,
                    'trial_count' => 0,
                    'active_count' => 0,
                    'blocked_count' => 0,
                    'pending_count' => 0,
                    'relationship_stage' => 'lead',
                    'data_completeness' => 'lead_only'
                ];
            }
        }
    }

    $saasTenants = [];
    if (!empty($SUPABASE_URL) && !empty($SUPABASE_KEY)) {
        $endpoint = '/rest/v1/tenants?select=id,name,slug,status,created_at,customers(name,email),licenses(license_key,status,license_type,expires_at,plans(code,name))&limit=100';
        $res = supabaseLicenseRequest('GET', $endpoint);
        if ($res['code'] === 200 && is_array($res['data'])) {
            $saasTenants = $res['data'];
        }
    }

    foreach ($saasTenants as $tenant) {
        $tenantEmail = !empty($tenant['customers']['email']) ? strtolower(trim($tenant['customers']['email'])) : '';
        $tenantName = $tenant['customers']['name'] ?? $tenant['name'] ?? 'SaaS Customer';
        $tenantSlug = $tenant['slug'] ?? '';
        $tenantLicenses = is_array($tenant['licenses'] ?? null) ? $tenant['licenses'] : [];

        $matchedKey = null;
        if (!empty($tenantEmail) && isset($customers[$tenantEmail])) {
            $matchedKey = $tenantEmail;
        } else {
            foreach ($tenantLicenses as $tl) {
                $tlKey = $tl['license_key'] ?? '';
                if ($tlKey !== '') {
                    foreach ($customers as $gk => $c) {
                        if ($c['license_key'] === $tlKey) {
                            $matchedKey = $gk;
                            break 2;
                        }
                    }
                }
            }
        }

        if ($matchedKey !== null) {
            $c = &$customers[$matchedKey];
            $c['has_saas'] = true;
            $c['saas_tenants_count']++;
            if (!in_array('saas', $c['sources'])) {
                $c['sources'][] = 'saas';
            }
            if (empty($c['slug'])) {
                $c['slug'] = $tenantSlug;
            }
            foreach ($tenantLicenses as $tl) {
                $tlStatus = $tl['status'] ?? '';
                $isTrial = ($tl['license_type'] ?? '') === 'trial';
                $c['licenses_count']++;
                if ($tlStatus === 'active') {
                    $c['active_count']++;
                    $c['active_licenses']++;
                } elseif ($tlStatus === 'blocked') {
                    $c['blocked_count']++;
                } elseif ($tlStatus === 'pending') {
                    $c['pending_count']++;
                }
                if ($isTrial) {
                    $c['trial_count']++;
                }
            }
        } else {
            $groupKey = !empty($tenantEmail) ? $tenantEmail : $tenantSlug;
            if (isset($customers[$groupKey])) {
                $c = &$customers[$groupKey];
                $c['has_saas'] = true;
                $c['saas_tenants_count']++;
                if (!in_array('saas', $c['sources'])) {
                    $c['sources'][] = 'saas';
                }
                if (empty($c['slug'])) {
                    $c['slug'] = $tenantSlug;
                }
                foreach ($tenantLicenses as $tl) {
                    $tlStatus = $tl['status'] ?? '';
                    $isTrial = ($tl['license_type'] ?? '') === 'trial';
                    $c['licenses_count']++;
                    if ($tlStatus === 'active') {
                        $c['active_count']++;
                        $c['active_licenses']++;
                    } elseif ($tlStatus === 'blocked') {
                        $c['blocked_count']++;
                    } elseif ($tlStatus === 'pending') {
                        $c['pending_count']++;
                    }
                    if ($isTrial) {
                        $c['trial_count']++;
                    }
                }
            } else {
                $activeLicensesCount = count(array_filter($tenantLicenses, fn($l) => ($l['status'] ?? '') === 'active'));
                $customers[$groupKey] = [
                    'name' => $tenantName,
                    'email' => $tenantEmail,
                    'slug' => $tenantSlug,
                    'systems' => [],
                    'active_system' => null,
                    'plan_code' => 'premium_monthly',
                    'plan_name' => 'SaaS Recorrente',
                    'billing_model' => 'recurring',
                    'sales_channel' => 'premium_online',
                    'status' => $tenant['status'] ?? 'active',
                    'license_key' => !empty($tenantLicenses[0]['license_key']) ? $tenantLicenses[0]['license_key'] : '',
                    'total_licenses' => count($tenantLicenses),
                    'active_licenses' => $activeLicensesCount,
                    'last_created_at' => $tenant['created_at'] ?? null,
                    'public_link' => '',

                    'customer_key' => $groupKey,
                    'sources' => ['saas'],
                    'licenses_count' => count($tenantLicenses),
                    'leads_count' => 0,
                    'open_leads_count' => 0,
                    'last_lead_at' => null,
                    'last_lead_status' => null,
                    'last_interest_type' => null,
                    'last_target_plan_code' => null,
                    'customer_whatsapp' => '',
                    'customer_name' => $tenantName,
                    'contact_consent' => false,
                    'has_saas' => true,
                    'saas_tenants_count' => 1,
                    'trial_count' => count(array_filter($tenantLicenses, fn($l) => ($l['license_type'] ?? '') === 'trial')),
                    'active_count' => $activeLicensesCount,
                    'blocked_count' => count(array_filter($tenantLicenses, fn($l) => ($l['status'] ?? '') === 'blocked')),
                    'pending_count' => count(array_filter($tenantLicenses, fn($l) => ($l['status'] ?? '') === 'pending')),
                    'relationship_stage' => 'customer_saas',
                    'data_completeness' => 'license_only'
                ];
            }
        }
    }

    $response = [];
    foreach ($customers as $groupKey => $c) {
        $hasLeads = in_array('evolution_leads', $c['sources']);
        $hasLicenses = in_array('licenses', $c['sources']);
        $hasSaas = in_array('saas', $c['sources']) || $c['has_saas'];

        if ($hasLeads && !$hasLicenses && !$hasSaas) {
            $c['relationship_stage'] = 'lead';
        } elseif (($hasLicenses || $hasSaas) && $c['trial_count'] > 0 && ($c['active_count'] <= 0 || $c['active_count'] == $c['trial_count'])) {
            $c['relationship_stage'] = 'trial';
        } elseif ($hasLicenses && !$hasSaas) {
            $c['relationship_stage'] = 'customer_local';
        } elseif (!$hasLicenses && $hasSaas) {
            $c['relationship_stage'] = 'customer_saas';
        } else {
            $c['relationship_stage'] = 'mixed';
        }

        if (($hasLicenses || $hasSaas) && !$hasLeads) {
            $c['data_completeness'] = 'license_only';
        } elseif (!($hasLicenses || $hasSaas) && $hasLeads) {
            $c['data_completeness'] = 'lead_only';
        } else {
            $hasName = !empty($c['name']) && $c['name'] !== 'Desconhecido' && $c['name'] !== 'Lead Interessado';
            $hasEmail = !empty($c['email']);
            $hasWhatsapp = !empty($c['customer_whatsapp']);
            if ($hasName && $hasEmail && $hasWhatsapp) {
                $c['data_completeness'] = 'complete';
            } else {
                $c['data_completeness'] = 'partial';
            }
        }

        if (empty($c['active_system']) && !empty($c['systems'])) {
            $c['active_system'] = $c['systems'][0];
        }

        $sysSlug = strtolower(trim($c['active_system'] ?? ''));
        $sysPath = '';
        if (str_contains($sysSlug, 'gastro')) {
            $sysPath = 'gestao-gastro';
        } elseif (str_contains($sysSlug, 'barbearia')) {
            $sysPath = 'gestao-barbearia';
        } elseif (str_contains($sysSlug, 'beleza')) {
            $sysPath = 'gestao-beleza';
        } elseif (str_contains($sysSlug, 'assistencia')) {
            $sysPath = 'gestao-assistencia';
        } else {
            $sysPath = $sysSlug;
        }

        if (!empty($c['slug']) && !empty($sysPath)) {
            $c['public_link'] = 'https://sistemasdegestao.tech/' . $sysPath . '/' . $c['slug'];
        } else {
            $c['public_link'] = '';
        }

        $response[] = $c;
    }

    echo json_encode($response);
    exit;
}

if ($action === 'generate') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $db = getDB($fileLicenses);
    $qty = (int) ($jsonData['quantity'] ?? 1);
    $isTrial = !empty($jsonData['trial']);
    $trialDays = (int) ($jsonData['trial_days'] ?? 3);

    $allowedSystems = getAllowedSystemsForLicenseGeneration();
    $allowedSegments = ['restaurante', 'bar', 'lanchonete', 'pizzaria', 'hamburgueria', 'barbearia', 'salao', 'estetica', 'geral'];
    $allowedPlanSlugs = ['basic', 'premium', 'trial'];

    $canonicalPlans = [
        'ml_lifetime' => ['name' => 'ML Vitalício', 'billing' => 'one_time', 'channel' => 'mercado_livre', 'version' => 'standalone_ml'],
        'direct_lifetime' => ['name' => 'Direto Vitalício', 'billing' => 'one_time', 'channel' => 'venda_direta', 'version' => 'standalone_direct'],
        'pro_lifetime' => ['name' => 'Pro Vitalício', 'billing' => 'one_time', 'channel' => 'venda_direta', 'version' => 'standalone_pro']
    ];
    $reqPlanCode = $jsonData['plan_code'] ?? 'ml_lifetime';

    // Bloqueia tentativas de gerar licença vitalícia com plano online/SaaS
    if ($reqPlanCode === 'premium_monthly') {
        echo json_encode(['status' => 'error', 'message' => 'Provisionamento de planos mensais online não permitido nesta rota. Use o provisionamento SaaS.']);
        exit;
    }

    if (!isset($canonicalPlans[$reqPlanCode])) {
        $reqPlanCode = 'ml_lifetime';
    }
    $planMeta = $canonicalPlans[$reqPlanCode];

    $systemId = $jsonData['system_id'] ?? getDefaultSystemId();
    if (!in_array($systemId, $allowedSystems, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Sistema nao permitido para licenca.']);
        exit;
    }

    // Bloqueia Mercado Livre padrão se o sistema não aceita ML padrão (ex: Gastro em plano vitalício ML padrão)
    if ($reqPlanCode === 'ml_lifetime' && !isSystemStandardMLAllowed($systemId)) {
        echo json_encode(['status' => 'error', 'message' => 'Sistema nao permitido para licenca.']);
        exit;
    }

    $segment = $jsonData['segment'] ?? 'geral';
    if (!in_array($segment, $allowedSegments, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Segmento nao permitido para licenca.']);
        exit;
    }

    $planSlug = $jsonData['plan_slug'] ?? 'basic';
    if (!in_array($planSlug, $allowedPlanSlugs, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Plano do sistema nao permitido.']);
        exit;
    }

    $modules = [];
    if (isset($jsonData['modules']) && is_array($jsonData['modules'])) {
        $modules = array_values(array_filter(array_map(function ($module) {
            return preg_replace('/[^a-z0-9_:-]/', '', strtolower(trim((string)$module)));
        }, $jsonData['modules'])));
    }

    $maxUsers = array_key_exists('max_users', $jsonData) && $jsonData['max_users'] !== null ? (int)$jsonData['max_users'] : null;
    $maxDevices = array_key_exists('max_devices', $jsonData) && $jsonData['max_devices'] !== null ? (int)$jsonData['max_devices'] : null;
    // Força operação offline/vitalícia para novas emissões
    $tenantSlug = '';
    $operationMode = 'local';

    $keys = [];

    for ($i = 0; $i < $qty; $i++) {
        // Formato XXXX-XXXX-XXXX
        $k = strtoupper(substr(md5(uniqid()), 0, 4) . '-' . substr(md5(uniqid()), 4, 4) . '-' . substr(md5(uniqid()), 8, 4));

        $licenseData = [
            'client' => $jsonData['client'] ?? 'Mercado Livre',
            'product' => $jsonData['product'] ?? 'Sistema',
            'price' => (float) ($jsonData['price'] ?? 0),
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => $isTrial ? 'trial' : 'venda_ml',
            'plan_code' => $reqPlanCode,
            'plan_name' => $planMeta['name'],
            'billing_model' => $planMeta['billing'],
            'sales_channel' => $planMeta['channel'],
            'system_version' => $planMeta['version'],
            'package_version' => $planMeta['version'],
            'system_id' => $systemId,
            'segment' => $segment,
            'plan_slug' => $planSlug,
            'system_plan_name' => $jsonData['system_plan_name'] ?? $planSlug,
            'modules' => $modules,
            'max_users' => $maxUsers,
            'max_devices' => $maxDevices,
            'tenant_slug' => $tenantSlug,
            'tenant_id' => null,
            'operation_mode' => $operationMode
        ];

        if ($isTrial) {
            $licenseData['is_trial'] = true;
            // Expira em X dias a partir da criação (ou ativação? Vamos por criação p/ simplificar, ou ativação é melhor?)
            // Melhor: Define a duração do trial, e a expiração é calculada na ATIVACAO.
            // Mas para simplificar a gestão visual, vamos definir expiração na ativação.
            // Aqui guardamos apenas a flag.
            $licenseData['trial_duration_days'] = $trialDays;
        }

        $db[$k] = $licenseData;
        $keys[] = $k;
    }

    saveDB($fileLicenses, $db);
    addLog("Geradas $qty chaves " . ($isTrial ? "(TRIAL)" : "") . " para " . ($jsonData['client'] ?? 'Cliente'), 'info');
    echo json_encode(['status' => 'success', 'keys' => $keys]);
    exit;
}

if ($action === 'update_status') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $key = $jsonData['key'] ?? '';
    $status = $jsonData['status'] ?? '';
    $db = getDB($fileLicenses);

    $allowedStatuses = ['active', 'pending', 'blocked', 'cancelled', 'expired'];

    if (isset($db[$key])) {
        if ($status === 'reset_device') {
            $db[$key]['device_id'] = '';
            $db[$key]['status'] = 'pending';
            addLog("Dispositivo resetado para chave $key", 'warning');
        } elseif (in_array($status, $allowedStatuses)) {
            $db[$key]['status'] = $status;
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Status inválido']);
            exit;
        }
        saveDB($fileLicenses, $db);
        echo json_encode(['status' => 'success', 'success' => true]);
    } else {
        if ($status === 'reset_device') {
            $resetResult = resetSaasLicenseDevice($key);
            if ($resetResult['ok']) {
                addLog("Dispositivo SaaS resetado para chave $key", 'warning');
                echo json_encode(['status' => 'success', 'success' => true]);
            } else {
                if ($resetResult['result'] === 'upstream_error') {
                    http_response_code(503);
                } elseif ($resetResult['result'] === 'configuration_error') {
                    http_response_code(500);
                }
                echo json_encode(['status' => 'error', 'message' => $resetResult['message']]);
            }
            exit;
        }
        echo json_encode(['status' => 'error', 'message' => 'Chave não encontrada']);
    }
    exit;
}

if ($action === 'convert_trial') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $key = $jsonData['key'] ?? '';
    $db = getDB($fileLicenses);

    if (isset($db[$key])) {
        $db[$key]['is_trial'] = false;
        $db[$key]['type'] = 'venda_ml';
        unset($db[$key]['expiration_date']);
        unset($db[$key]['trial_duration_days']);

        $db[$key]['plan_code'] = 'ml_lifetime';
        $db[$key]['plan_name'] = 'ML Vitalício';
        $db[$key]['billing_model'] = 'one_time';
        $db[$key]['sales_channel'] = 'mercado_livre';
        $db[$key]['system_version'] = 'standalone_ml';
        $db[$key]['package_version'] = 'standalone_ml';

        saveDB($fileLicenses, $db);
        addLog("Conversão de teste: chave $key convertida para vitalício", 'info');
        echo json_encode(['status' => 'success', 'success' => true]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Chave não encontrada']);
    }
    exit;
}

if ($action === 'register_evolution_lead') {
    $license_key = isset($jsonData['license_key']) ? trim($jsonData['license_key']) : '';
    $email = isset($jsonData['email']) ? trim($jsonData['email']) : '';
    $system_id = isset($jsonData['system_id']) ? trim($jsonData['system_id']) : '';
    $feature_key = isset($jsonData['feature_key']) ? trim($jsonData['feature_key']) : '';
    $feature_title = isset($jsonData['feature_title']) ? trim($jsonData['feature_title']) : '';
    $source = isset($jsonData['source']) ? trim($jsonData['source']) : 'evolution_module';

    $raw_interest_type = isset($jsonData['interest_type']) ? trim($jsonData['interest_type']) : '';
    $raw_current_plan_code = isset($jsonData['current_plan_code']) ? trim($jsonData['current_plan_code']) : '';
    $raw_target_plan_code = isset($jsonData['target_plan_code']) ? trim($jsonData['target_plan_code']) : '';

    // Novos campos Fase B.6 (Sanitização e limites)
    $customer_name = isset($jsonData['customer_name']) ? substr(strip_tags(trim($jsonData['customer_name'])), 0, 100) : '';
    $customer_whatsapp = isset($jsonData['customer_whatsapp']) ? substr(preg_replace('/[^\d+]/', '', $jsonData['customer_whatsapp']), 0, 20) : '';
    $contact_consent = isset($jsonData['contact_consent']) ? (bool)$jsonData['contact_consent'] : false;

    if (empty($system_id) || empty($feature_key)) {
        echo json_encode(['status' => 'error', 'message' => 'Campos obrigatórios ausentes']);
        exit;
    }

    $allowed_systems = getAllowedSystemsForLeads();
    if (!in_array($system_id, $allowed_systems, true)) {
        echo json_encode(['status' => 'error', 'message' => 'Sistema inválido']);
        exit;
    }

    // Sanitização e normalização segura com fallbacks
    $allowed_interest_types = ['plan_upgrade', 'feature_interest'];
    if (in_array($raw_interest_type, $allowed_interest_types)) {
        $interest_type = $raw_interest_type;
    } else {
        if (in_array($feature_key, ['online_essential', 'online_premium'])) {
            $interest_type = 'plan_upgrade';
        } else {
            $interest_type = 'feature_interest';
        }
    }

    $allowed_current_plans = ['ml_lifetime', 'site_lifetime', 'basic', 'premium'];
    $current_plan_code = in_array($raw_current_plan_code, $allowed_current_plans) ? $raw_current_plan_code : '';

    $allowed_target_plans = ['basic', 'premium'];
    if (in_array($raw_target_plan_code, $allowed_target_plans)) {
        $target_plan_code = $raw_target_plan_code;
    } else {
        if ($feature_key === 'online_essential') {
            $target_plan_code = 'basic';
        } else if ($feature_key === 'online_premium') {
            $target_plan_code = 'premium';
        } else {
            $target_plan_code = '';
        }
    }

    $fileEvolutionLeads = 'api_data/evolution_leads.json';
    $leads = getDB($fileEvolutionLeads);

    $found = false;
    foreach ($leads as &$lead) {
        $matchEmail = (!empty($email) && !empty($lead['email']) && strtolower($lead['email']) === strtolower($email));
        $matchLicense = (!empty($license_key) && !empty($lead['license_key']) && strtolower($lead['license_key']) === strtolower($license_key));
        if (($matchEmail || $matchLicense) && $lead['system_id'] === $system_id && $lead['feature_key'] === $feature_key) {
            $found = true;
            $lead['count'] = (isset($lead['count']) ? (int)$lead['count'] : 1) + 1;
            $lead['last_interaction'] = date('Y-m-d H:i:s');
            if (empty($lead['email']) && !empty($email)) $lead['email'] = $email;
            if (empty($lead['license_key']) && !empty($license_key)) $lead['license_key'] = $license_key;

            if (!empty($interest_type)) $lead['interest_type'] = $interest_type;
            if (!empty($current_plan_code)) $lead['current_plan_code'] = $current_plan_code;
            if (!empty($target_plan_code)) $lead['target_plan_code'] = $target_plan_code;

            // Atualização dos campos Fase B.6
            if (isset($jsonData['customer_name']) && trim($jsonData['customer_name']) !== '') {
                $lead['customer_name'] = $customer_name;
            }
            if (isset($jsonData['customer_whatsapp']) && trim($jsonData['customer_whatsapp']) !== '') {
                $lead['customer_whatsapp'] = $customer_whatsapp;
            }
            if (isset($jsonData['contact_consent'])) {
                $lead['contact_consent'] = $contact_consent;
            }
            break;
        }
    }

    if (!$found) {
        $leads[] = [
            'license_key' => $license_key,
            'email' => $email,
            'system_id' => $system_id,
            'feature_key' => $feature_key,
            'feature_title' => $feature_title,
            'source' => $source,
            'interest_type' => $interest_type,
            'current_plan_code' => $current_plan_code,
            'target_plan_code' => $target_plan_code,
            'customer_name' => $customer_name,
            'customer_whatsapp' => $customer_whatsapp,
            'contact_consent' => $contact_consent,
            'created_at' => date('Y-m-d H:i:s'),
            'last_interaction' => date('Y-m-d H:i:s'),
            'count' => 1,
            'status' => 'novo'
        ];
    }

    saveDB($fileEvolutionLeads, $leads);

    if (empty($license_key) && empty($email)) {
        echo json_encode(['status' => 'success', 'message' => 'Interesse registrado (sem identificação local)']);
    } else {
        echo json_encode(['status' => 'success', 'message' => 'Interesse registrado com sucesso']);
    }
    exit;
}

if ($action === 'list_evolution_leads') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $fileEvolutionLeads = 'api_data/evolution_leads.json';
    $leads = getDB($fileEvolutionLeads);

    usort($leads, function($a, $b) {
        return strcmp($b['last_interaction'] ?? '', $a['last_interaction'] ?? '');
    });

    echo json_encode(['status' => 'success', 'leads' => $leads]);
    exit;
}

if ($action === 'update_evolution_lead_status') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $email = isset($jsonData['email']) ? trim($jsonData['email']) : '';
    $license_key = isset($jsonData['license_key']) ? trim($jsonData['license_key']) : '';
    $system_id = isset($jsonData['system_id']) ? trim($jsonData['system_id']) : '';
    $feature_key = isset($jsonData['feature_key']) ? trim($jsonData['feature_key']) : '';
    $status = isset($jsonData['status']) ? trim($jsonData['status']) : '';

    $allowedStatuses = ['novo', 'contatado', 'proposta_enviada', 'convertido', 'perdido', 'descartado'];
    if (!in_array($status, $allowedStatuses)) {
        echo json_encode(['status' => 'error', 'message' => 'Status inválido']);
        exit;
    }

    $fileEvolutionLeads = 'api_data/evolution_leads.json';
    $leads = getDB($fileEvolutionLeads);

    $updated = false;
    foreach ($leads as &$lead) {
        $matchEmail = (!empty($email) && !empty($lead['email']) && strtolower($lead['email']) === strtolower($email));
        $matchLicense = (!empty($license_key) && !empty($lead['license_key']) && strtolower($lead['license_key']) === strtolower($license_key));
        if (($matchEmail || $matchLicense) && $lead['system_id'] === $system_id && $lead['feature_key'] === $feature_key) {
            $lead['status'] = $status;
            $lead['last_interaction'] = date('Y-m-d H:i:s');
            $updated = true;
            break;
        }
    }

    if ($updated) {
        saveDB($fileEvolutionLeads, $leads);
        echo json_encode(['status' => 'success', 'success' => true]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Lead de evolução não encontrado']);
    }
    exit;
}

if ($action === 'update_evolution_lead_fields') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $email = isset($jsonData['email']) ? trim($jsonData['email']) : '';
    $license_key = isset($jsonData['license_key']) ? trim($jsonData['license_key']) : '';
    $system_id = isset($jsonData['system_id']) ? trim($jsonData['system_id']) : '';
    $feature_key = isset($jsonData['feature_key']) ? trim($jsonData['feature_key']) : '';

    if (isset($jsonData['status'])) {
        $status = trim($jsonData['status']);
        $allowedStatuses = ['novo', 'contatado', 'proposta_enviada', 'convertido', 'perdido', 'descartado'];
        if (!in_array($status, $allowedStatuses)) {
            echo json_encode(['status' => 'error', 'message' => 'Status inválido']);
            exit;
        }
    }

    $fileEvolutionLeads = 'api_data/evolution_leads.json';
    $leads = getDB($fileEvolutionLeads);

    $updated = false;
    foreach ($leads as &$lead) {
        $matchEmail = (!empty($email) && !empty($lead['email']) && strtolower($lead['email']) === strtolower($email));
        $matchLicense = (!empty($license_key) && !empty($lead['license_key']) && strtolower($lead['license_key']) === strtolower($license_key));
        if (($matchEmail || $matchLicense) && $lead['system_id'] === $system_id && $lead['feature_key'] === $feature_key) {
            if (isset($jsonData['status'])) {
                $lead['status'] = trim($jsonData['status']);
            }
            if (isset($jsonData['notes'])) {
                $lead['notes'] = trim($jsonData['notes']);
            }
            if (isset($jsonData['next_contact_at'])) {
                $lead['next_contact_at'] = trim($jsonData['next_contact_at']);
            }
            if (isset($jsonData['contact_channel'])) {
                $lead['contact_channel'] = trim($jsonData['contact_channel']);
            }
            if (isset($jsonData['owner'])) {
                $lead['owner'] = trim($jsonData['owner']);
            }
            $lead['last_interaction'] = date('Y-m-d H:i:s');
            $updated = true;
            break;
        }
    }

    if ($updated) {
        saveDB($fileEvolutionLeads, $leads);
        echo json_encode(['status' => 'success', 'success' => true]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Lead de evolução não encontrado']);
    }
    exit;
}

if ($action === 'get_receipts') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $receipts = getDB($fileReceipts);
    $licenses = getDB($fileLicenses);
    $enrichedReceipts = [];
    $summary = [
        'total_receipts' => 0,
        'total_value' => 0.0,
        'recurring_value' => 0.0,
        'by_sales_channel' => [],
        'by_plan_code' => [],
        'by_status' => []
    ];

    foreach ($receipts as $receipt) {
        $licenseKey = $receipt['license_key'] ?? '';
        $license = $licenses[$licenseKey] ?? [];
        $price = isset($license['price']) ? (float) $license['price'] : 0.0;
        $billingModel = $license['billing_model'] ?? '';
        $salesChannel = $license['sales_channel'] ?? 'mercado_livre';
        $planCode = $license['plan_code'] ?? 'ml_lifetime';
        $licenseStatus = $license['status'] ?? 'receipt_only';

        $enrichedReceipts[] = [
            'timestamp' => $receipt['timestamp'] ?? '',
            'ip' => $receipt['ip'] ?? '',
            'license_key' => $licenseKey,
            'client_email' => $receipt['client_email'] ?? ($license['email_activation'] ?? ($license['client'] ?? 'N/A')),
            'product' => $receipt['product'] ?? ($license['product'] ?? 'N/A'),
            'confirmation_text' => $receipt['confirmation_text'] ?? '',
            'price' => $price,
            'plan_code' => $planCode,
            'plan_name' => $license['plan_name'] ?? 'ML Vitalício',
            'billing_model' => $billingModel,
            'sales_channel' => $salesChannel,
            'license_status' => $licenseStatus,
            'activated_at' => $license['activated_at'] ?? '',
            'created_at' => $license['created_at'] ?? ''
        ];

        $summary['total_receipts']++;
        $summary['total_value'] += $price;
        if ($billingModel === 'recurring' || $planCode === 'premium_monthly') {
            $summary['recurring_value'] += $price;
        }
        $summary['by_sales_channel'][$salesChannel] = ($summary['by_sales_channel'][$salesChannel] ?? 0) + 1;
        $summary['by_plan_code'][$planCode] = ($summary['by_plan_code'][$planCode] ?? 0) + 1;
        $summary['by_status'][$licenseStatus] = ($summary['by_status'][$licenseStatus] ?? 0) + 1;
    }

    usort($enrichedReceipts, function ($a, $b) {
        return strcmp($b['timestamp'] ?? '', $a['timestamp'] ?? '');
    });

    echo json_encode([
        'status' => 'success',
        'receipts' => $enrichedReceipts,
        'summary' => $summary
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'read_logs') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $db = getDB($fileLogs);
    $rawLogs = $db['logs'] ?? [];
    $safeLogs = [];
    $summary = [
        'total' => 0,
        'info' => 0,
        'warning' => 0,
        'error' => 0,
        'last_event_at' => ''
    ];

    foreach ($rawLogs as $log) {
        if (!is_array($log)) {
            continue;
        }

        $type = strtolower((string) ($log['type'] ?? 'info'));
        if (!in_array($type, ['info', 'warning', 'error'], true)) {
            $type = 'info';
        }

        $timestamp = (string) ($log['timestamp'] ?? '');
        $safeLogs[] = [
            'timestamp' => $timestamp,
            'type' => $type,
            'message' => (string) ($log['message'] ?? ($log['msg'] ?? '')),
            'ip' => (string) ($log['ip'] ?? '-')
        ];

        $summary['total']++;
        $summary[$type]++;
        if ($timestamp !== '' && strcmp($timestamp, $summary['last_event_at']) > 0) {
            $summary['last_event_at'] = $timestamp;
        }
    }

    usort($safeLogs, function ($a, $b) {
        return strcmp($b['timestamp'] ?? '', $a['timestamp'] ?? '');
    });

    echo json_encode([
        'status' => 'success',
        'logs' => $safeLogs,
        'summary' => $summary
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// --- ROTAS PUBLICAS (APP) ---

if ($action === 'activate') {
    $key = $jsonData['license_key'] ?? '';
    $device = $jsonData['device_id'] ?? 'legacy_' . time();
    if (empty($key)) {
        echo json_encode(['status' => 'error', 'message' => 'Chave vazia']);
        exit;
    }

    $db = getDB($fileLicenses);

    if (isset($db[$key])) {
        $isMasterLicense = !empty($db[$key]['is_master']);

        if ($isMasterLicense) {
            $masterOwnerEmail = $db[$key]['owner_email'] ?? '';
            $requestEmail = trim($jsonData['email'] ?? '');
            if (empty($requestEmail) || !hash_equals($masterOwnerEmail, $requestEmail)) {
                echo json_encode(['status' => 'error', 'message' => 'E-mail inválido para esta licença master.']);
                exit;
            }
        }
        // --- EXPIRATION CHECK (V11.7) ---
        if (!$isMasterLicense && !empty($db[$key]['expiration_date'])) {
            $exp = strtotime($db[$key]['expiration_date']);
            if (time() > $exp) {
                echo json_encode(['status' => 'expired', 'message' => 'Período de teste expirado. Adquira a versão vitalícia.']);
                exit;
            }
        }

        if (
            !$isMasterLicense &&
            $db[$key]['status'] === 'active' &&
            !empty($db[$key]['device_id']) &&
            $db[$key]['device_id'] !== $device
        ) {
            // Smart Rebind Logic (V11.5 - iOS PWA Persistence)
            // Se o IP for o mesmo, permite a troca de "Navegador" para "App Instalado"
            if (isset($db[$key]['last_ip']) && $db[$key]['last_ip'] === $_SERVER['REMOTE_ADDR']) {
                addLog("Smart Rebind: Chave $key atualizada para novo device no mesmo IP: " . $_SERVER['REMOTE_ADDR'], 'warning');
                // Permite prosseguir e atualizar o device_id abaixo
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Licença já usada em outro aparelho.']);
                exit;
            }
        }


        if ($db[$key]['status'] === 'blocked') {
            echo json_encode(['status' => 'error', 'message' => 'Licença bloqueada ou cancelada.']);
            exit;
        }

        // ATIVACAO INICIAL
        if ($db[$key]['status'] !== 'active') {
            // Se for TRIAL e ainda não tiver data de expiração, seta agora
            if (!empty($db[$key]['is_trial']) && empty($db[$key]['expiration_date'])) {
                $days = $db[$key]['trial_duration_days'] ?? 3;
                $db[$key]['expiration_date'] = date('Y-m-d H:i:s', strtotime("+$days days"));
            }
        }

        $db[$key]['status'] = 'active';
        $db[$key]['device_id'] = $isMasterLicense ? '' : $device;
        $db[$key]['activated_at'] = date('Y-m-d H:i:s');
        $db[$key]['last_ip'] = $_SERVER['REMOTE_ADDR'];
        // V11.6 - Capture Email provided by App
        if (!empty($jsonData['email'])) {
            $db[$key]['email_activation'] = $jsonData['email'];
        }

        saveDB($fileLicenses, $db);

        $response = [
            'status' => 'success',
            'valid' => true,
            'client' => $db[$key]['client'],
            'tenant_id' => getLicenseTenantId($db[$key]),
            'plan' => $db[$key]['plan_slug'] ?? $db[$key]['plan_code'] ?? 'base'
        ];
        if (!empty($db[$key]['expiration_date'])) {
            $response['expiration_date'] = $db[$key]['expiration_date'];
            $response['is_trial'] = true;
        }
        if ($isMasterLicense) {
            $response['is_master'] = true;
        }

        addLog("Sucesso: Chave $key ativada no device $device", 'info');
        echo json_encode($response);
    } else {
        $saasLicense = findSaasLicense(
            $key,
            $jsonData['email'] ?? '',
            $jsonData['tenant_id'] ?? '',
            $jsonData['tenant_slug'] ?? ''
        );

        if ($saasLicense && $saasLicense['result'] === 'upstream_error') {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Servico de licenças temporariamente indisponível.']);
            exit;
        }

        if ($saasLicense && $saasLicense['result'] === 'configuration_error') {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Erro interno de configuração de licenças.']);
            exit;
        }

        if ($saasLicense && $saasLicense['result'] === 'identity_mismatch') {
            echo json_encode(['status' => 'error', 'message' => 'Licenca nao pertence a este restaurante ou e-mail incorreto.']);
            exit;
        }

        if ($saasLicense && $saasLicense['result'] === 'found' && $saasLicense['status'] === 'active') {
            $deviceRegistration = registerSaasLicenseDevice($saasLicense, $device);
            if (!$deviceRegistration['ok']) {
                addLog("Falha: Chave SaaS $key tentou ativar dispositivo invalido ou divergente", 'warning');
                echo json_encode([
                    'status' => $deviceRegistration['status'],
                    'message' => $deviceRegistration['message']
                ]);
                exit;
            }

            $saasLicense = $deviceRegistration['license'];
            addLog("Sucesso: Chave SaaS $key validada para tenant " . $saasLicense['tenant_id'] . " no device $device", 'info');
            echo json_encode(buildSaasLicenseResponse($saasLicense, false));
        } elseif ($saasLicense && $saasLicense['result'] === 'found' && $saasLicense['status'] === 'expired') {
            echo json_encode(['status' => 'expired', 'message' => 'Periodo de teste expirado.']);
        } else {
            addLog("Falha: Tentativa de ativacao com chave invalida $key", 'error');
            echo json_encode(['status' => 'error', 'message' => 'Licenca nao encontrada']);
        }
    }
    exit;
}

if ($action === 'verify') {
    $key = $jsonData['license_key'] ?? '';
    // Device check is optional for simple status verification, but good for security auditing
    $device = $jsonData['device_id'] ?? '';

    $db = getDB($fileLicenses);

    if (isset($db[$key])) {
        // --- EXPIRATION CHECK (V11.7) ---
        $status = $db[$key]['status'];
        if (!empty($db[$key]['expiration_date'])) {
            $exp = strtotime($db[$key]['expiration_date']);
            if (time() > $exp) {
                // Auto-expire silently or explicitly
                $status = 'expired';
            }
        }

        // Return current status
        echo json_encode([
            'status' => 'success',
            'license_status' => $status, // active, pending, blocked, expired
            'client' => $db[$key]['client'],
            'is_trial' => !empty($db[$key]['is_trial']),
            'expiration_date' => $db[$key]['expiration_date'] ?? null,
            'tenant_id' => getLicenseTenantId($db[$key]),
            'is_master' => !empty($db[$key]['is_master']),
            'plan' => $db[$key]['plan_slug'] ?? $db[$key]['plan_code'] ?? 'base'
        ]);
    } else {
        $saasLicense = findSaasLicense(
            $key,
            $jsonData['email'] ?? '',
            $jsonData['tenant_id'] ?? '',
            $jsonData['tenant_slug'] ?? ''
        );

        if ($saasLicense && $saasLicense['result'] === 'upstream_error') {
            http_response_code(503);
            echo json_encode(['status' => 'error', 'message' => 'Servico de licenças temporariamente indisponível.']);
            exit;
        }

        if ($saasLicense && $saasLicense['result'] === 'configuration_error') {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Erro interno de configuração de licenças.']);
            exit;
        }

        if ($saasLicense && $saasLicense['result'] === 'identity_mismatch') {
            echo json_encode(['status' => 'error', 'message' => 'Licenca nao pertence a este restaurante ou e-mail incorreto.']);
            exit;
        }

        if ($saasLicense && $saasLicense['result'] === 'found') {
            if ($saasLicense['status'] === 'active') {
                $verification = touchSaasLicenseVerification($saasLicense, $device);
                if (!$verification['ok']) {
                    echo json_encode([
                        'status' => $verification['status'],
                        'license_status' => $verification['license_status'],
                        'message' => $verification['message']
                    ]);
                    exit;
                }
            }

            echo json_encode(buildSaasLicenseResponse($saasLicense, true));
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Licenca nao encontrada']);
        }
    }
    exit;
}

if ($action === 'confirm_receipt') {
    $key = $jsonData['license_key'] ?? '';
    $emailFromApp = trim($jsonData['email'] ?? '');
    $data = getDB($fileLicenses);

    // V12.1: Gravar email no banco de licencas se ainda nao tiver (captacao de lead garantida)
    if (!empty($emailFromApp) && isset($data[$key])) {
        if (empty($data[$key]['email_activation'])) {
            $data[$key]['email_activation'] = $emailFromApp;
            saveDB($fileLicenses, $data);
        }
    }

    // Determinar email: prioridade DB > enviado pelo app > fallback
    $clientEmail = $data[$key]['email_activation'] ?? ($emailFromApp ?: ($data[$key]['client'] ?? 'N/A'));
    $receipts = getDB($fileReceipts);

    // Protecao contra recibos duplicados (mesma chave)
    $isDuplicate = false;
    foreach (array_slice($receipts, -200) as $r) {
        if (($r['license_key'] ?? '') === $key) {
            $isDuplicate = true;
            break;
        }
    }

    if (!$isDuplicate) {
        $receipts[] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'ip' => $_SERVER['REMOTE_ADDR'],
            'license_key' => $key,
            'client_email' => $clientEmail,
            'product' => $data[$key]['product'] ?? 'N/A',
            'confirmation_text' => 'Confirmo o recebimento do produto digital e o funcionamento do mesmo.'
        ];
        saveDB($fileReceipts, $receipts);
        addLog("Recibo confirmado: chave=$key email=$clientEmail", 'info');
    } else {
        addLog("Recibo ja registrado para chave $key", 'info');
    }

    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'backup') {
    // Aceita POST (seguro) ou GET (legado)
    $secret = $jsonData['secret'] ?? ($_GET['secret'] ?? '');
    if (!validateSecret(['secret' => $secret], $ADMIN_SECRET)) {
        http_response_code(403);
        die(json_encode(['status' => 'error', 'message' => 'Acesso Negado']));
    }

    if (file_exists($fileLicenses)) {
        header('Content-Description: File Transfer');
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="backup_licencas_' . date('Y-m-d_H-i') . '.json"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($fileLicenses));
        readfile($fileLicenses);
        exit;
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Banco de dados vazio ou inexistente']);
        exit;
    }
}

echo json_encode(['status' => 'error', 'message' => 'Ação não definida ou inválida (V11.2)']);
?>
