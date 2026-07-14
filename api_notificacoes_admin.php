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

$ALLOWED_TYPES = ['update', 'security', 'backup', 'info', 'promo'];
$ALLOWED_PRIORITIES = ['low', 'normal', 'high'];
$ALLOWED_TARGETS = ['all', 'barbearia', 'beleza', 'gastro'];

if ($action === 'list') {
    $safeNotifications = [];
    $summary = [
        'total' => 0,
        'active' => 0,
        'scheduled' => 0,
        'expired' => 0,
        'high_priority' => 0,
        'by_target' => [],
        'by_type' => []
    ];
    $now = time();

    foreach ($data as $notification) {
        if (!is_array($notification)) {
            continue;
        }

        $type = strtolower((string)($notification['type'] ?? 'info'));
        if (!in_array($type, $ALLOWED_TYPES, true)) {
            $type = 'info';
        }

        $priority = strtolower((string)($notification['priority'] ?? 'normal'));
        if (!in_array($priority, $ALLOWED_PRIORITIES, true)) {
            $priority = 'normal';
        }

        $targets = $notification['targets'] ?? ['all'];
        if (!is_array($targets)) {
            $targets = [$targets];
        }
        $targets = array_values(array_filter(array_map(
            fn($target) => strtolower(trim((string)$target)),
            $targets
        )));
        $targets = array_values(array_filter($targets, fn($target) => in_array($target, $ALLOWED_TARGETS, true)));
        if (empty($targets)) {
            $targets = ['all'];
        }

        $published = (string)($notification['published'] ?? '');
        $expires = $notification['expires'] ?? null;
        $publishedAt = $published ? strtotime($published) : false;
        $expiresAt = $expires ? strtotime((string)$expires) : false;
        $status = 'active';
        if ($publishedAt && $publishedAt > $now) {
            $status = 'scheduled';
        } elseif ($expiresAt && $expiresAt < $now) {
            $status = 'expired';
        }

        $safeNotifications[] = [
            'id' => (string)($notification['id'] ?? ''),
            'type' => $type,
            'priority' => $priority,
            'title' => (string)($notification['title'] ?? ''),
            'body' => (string)($notification['body'] ?? ''),
            'details' => (string)($notification['details'] ?? ''),
            'published' => $published,
            'expires' => $expires,
            'targets' => $targets,
            'version' => $notification['version'] ?? null,
            'target_license' => $notification['target_license'] ?? null,
            'status' => $status
        ];

        $summary['total']++;
        $summary[$status]++;
        if ($priority === 'high') {
            $summary['high_priority']++;
        }
        $summary['by_type'][$type] = ($summary['by_type'][$type] ?? 0) + 1;
        foreach ($targets as $target) {
            $summary['by_target'][$target] = ($summary['by_target'][$target] ?? 0) + 1;
        }
    }

    usort($safeNotifications, function ($a, $b) {
        return strcmp($b['published'] ?? '', $a['published'] ?? '');
    });

    echo json_encode([
        'status' => 'success',
        'notifications' => $safeNotifications,
        'summary' => $summary
    ], JSON_UNESCAPED_UNICODE);
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

    $type = strtolower(trim((string)$input['type']));
    if (!in_array($type, $ALLOWED_TYPES, true)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Invalid type: ' . $type,
            'allowed_types' => $ALLOWED_TYPES,
        ]);
        exit;
    }

    $priority = strtolower(trim((string)($input['priority'] ?? 'normal')));
    if (!in_array($priority, $ALLOWED_PRIORITIES, true)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Invalid priority: ' . $priority,
            'allowed_priorities' => $ALLOWED_PRIORITIES,
        ]);
        exit;
    }

    $newNotif = [
        'id'             => $input['id'],
        'type'           => $type,
        'priority'       => $priority,
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
