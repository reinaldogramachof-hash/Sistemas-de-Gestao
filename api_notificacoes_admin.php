<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

define('ADMIN_SECRET', 'ml_factory_2026_adm');

// Tenta obter o ADMIN_SECRET real do env_loader, se existir no servidor
if (file_exists(__DIR__ . '/env_loader.php')) {
    require_once __DIR__ . '/env_loader.php';
    if (function_exists('env')) {
        $env_secret = env('ADMIN_SECRET');
        if (!empty($env_secret)) {
            define('REAL_ADMIN_SECRET', $env_secret);
        }
    }
}
if (!defined('REAL_ADMIN_SECRET')) {
    define('REAL_ADMIN_SECRET', ADMIN_SECRET);
}

$DATA_FILE = __DIR__ . '/notifications_data.json';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

if ($action === 'list') {
    if (!file_exists($DATA_FILE)) {
        echo json_encode([]);
        exit;
    }
    echo file_get_contents($DATA_FILE);
    exit;
}

$secret = $input['secret'] ?? '';
$validToken = hash('sha256', REAL_ADMIN_SECRET . date('Y-m-d'));

if ($secret !== REAL_ADMIN_SECRET && $secret !== ADMIN_SECRET && $secret !== $validToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$data = [];
if (file_exists($DATA_FILE)) {
    $data = json_decode(file_get_contents($DATA_FILE), true) ?: [];
}

if ($action === 'create') {
    $required = ['id', 'title', 'body', 'type', 'published', 'targets'];
    foreach ($required as $req) {
        if (empty($input[$req])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $req"]);
            exit;
        }
    }
    
    $newNotif = [
        'id' => $input['id'],
        'type' => $input['type'],
        'priority' => $input['priority'] ?? 'normal',
        'title' => $input['title'],
        'body' => $input['body'],
        'details' => $input['details'] ?? '',
        'published' => $input['published'],
        'expires' => $input['expires'] ?? null,
        'targets' => is_array($input['targets']) ? $input['targets'] : [$input['targets']],
        'version' => $input['version'] ?? null
    ];
    
    $data[] = $newNotif;
    file_put_contents($DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'delete') {
    $id = $input['id'] ?? '';
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID']);
        exit;
    }
    
    $found = false;
    foreach ($data as $k => $v) {
        if ($v['id'] === $id) {
            unset($data[$k]);
            $found = true;
            break;
        }
    }
    
    if ($found) {
        $data = array_values($data);
        file_put_contents($DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'not found']);
    }
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Invalid action']);
