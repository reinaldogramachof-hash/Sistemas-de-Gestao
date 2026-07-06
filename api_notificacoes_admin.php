<?php
require_once __DIR__ . '/env_loader.php';

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
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

$ADMIN_SECRET = env('ADMIN_SECRET');

$DATA_FILE = __DIR__ . '/notifications_data.json';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

if (empty($ADMIN_SECRET)) {
    http_response_code(500);
    echo json_encode(['error' => 'Admin secret not configured']);
    exit;
}

$secret = $input['secret'] ?? '';
$validToken = hash('sha256', $ADMIN_SECRET . date('Y-m-d'));

if ($secret !== $ADMIN_SECRET && $secret !== $validToken) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$data = [];
if (file_exists($DATA_FILE)) {
    $data = json_decode(file_get_contents($DATA_FILE), true) ?: [];
}

if ($action === 'list') {
    echo json_encode($data);
    exit;
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

    // Normalizar targets: trim + strtolower, remover vazios
    $rawTargets = is_array($input['targets']) ? $input['targets'] : [$input['targets']];
    $rawTargets = array_values(array_filter(
        array_map(fn($t) => strtolower(trim((string)$t)), $rawTargets),
        fn($t) => $t !== ''
    ));

    // Whitelist de targets permitidos
    $ALLOWED_TARGETS = ['all', 'barbearia', 'beleza'];
    $invalidTargets = array_filter($rawTargets, fn($t) => !in_array($t, $ALLOWED_TARGETS, true));
    if (!empty($invalidTargets)) {
        http_response_code(400);
        echo json_encode([
            'error'           => 'Invalid target(s): ' . implode(', ', $invalidTargets),
            'allowed_targets' => $ALLOWED_TARGETS,
        ]);
        exit;
    }

    if (empty($rawTargets)) {
        http_response_code(400);
        echo json_encode(['error' => 'targets must contain at least one valid value']);
        exit;
    }

    $newNotif = [
        'id'             => $input['id'],
        'type'           => $input['type'],
        'priority'       => $input['priority'] ?? 'normal',
        'title'          => $input['title'],
        'body'           => $input['body'],
        'details'        => $input['details'] ?? '',
        'published'      => $input['published'],
        'expires'        => $input['expires'] ?? null,
        'targets'        => $rawTargets,
        'version'        => $input['version'] ?? null,
        'target_license' => $input['target_license'] ?? null,
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
