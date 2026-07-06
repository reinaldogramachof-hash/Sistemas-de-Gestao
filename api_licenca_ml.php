<?php
// API V11.8 - PROFESSIONAL FULL (SECURE ENV + CORS DYNAMIC)
require_once __DIR__ . '/env_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

// --- CORS DINÂMICO (V11.8) ---
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
        'total' => count($db),
        'active' => 0,
        'pending' => 0,
        'trial' => 0,
        'top_products' => []
    ];
    foreach ($db as $l) {
        if (($l['status'] ?? '') === 'active')
            $stats['active']++;
        elseif (($l['status'] ?? '') === 'pending')
            $stats['pending']++;

        if (!empty($l['is_trial']))
            $stats['trial']++;

        $pName = $l['product'] ?? 'Desconhecido';
        if (!isset($stats['top_products'][$pName]))
            $stats['top_products'][$pName] = 0;
        $stats['top_products'][$pName]++;
    }
    echo json_encode($stats);
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

    $canonicalPlans = [
        'ml_lifetime' => ['name' => 'ML Vitalício', 'billing' => 'one_time', 'channel' => 'mercado_livre', 'version' => 'standalone_ml'],
        'direct_lifetime' => ['name' => 'Direto Vitalício', 'billing' => 'one_time', 'channel' => 'venda_direta', 'version' => 'standalone_direct'],
        'pro_lifetime' => ['name' => 'Pro Vitalício', 'billing' => 'one_time', 'channel' => 'venda_direta', 'version' => 'standalone_pro'],
        'premium_monthly' => ['name' => 'Premium Online Mensal', 'billing' => 'recurring', 'channel' => 'premium_online', 'version' => 'premium_online']
    ];
    $reqPlanCode = $jsonData['plan_code'] ?? 'ml_lifetime';
    if (!isset($canonicalPlans[$reqPlanCode])) {
        $reqPlanCode = 'ml_lifetime';
    }
    $planMeta = $canonicalPlans[$reqPlanCode];

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
            'package_version' => $planMeta['version']
        ];

        if ($isTrial) {
            $licenseData['is_trial'] = true;
            // Expira em X dias a partir da criação (ou ativação? Vamos por criação p/ simplificar, ou ativação é melhor?)
            // Melhor: Define a duração do trial, e a expiração é calculada na ATIVAÇÃO.
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

if ($action === 'get_receipts') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    $db = getDB($fileReceipts);
    echo json_encode($db);
    exit;
}

if ($action === 'read_logs') {
    if (!validateSecret($jsonData, $ADMIN_SECRET)) {
        http_response_code(403);
        exit;
    }
    echo file_get_contents($fileLogs) ?: '{"logs":[]}';
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

        // ATIVAÇÃO INICIAL
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

        $response = ['status' => 'success', 'valid' => true, 'client' => $db[$key]['client']];
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
        addLog("Falha: Tentativa de ativação com chave inválida $key", 'error');
        echo json_encode(['status' => 'error', 'message' => 'Licença não encontrada']);
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
            'expiration_date' => $db[$key]['expiration_date'] ?? null
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Licença não encontrada']);
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
    if ($secret !== $ADMIN_SECRET) {
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