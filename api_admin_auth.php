<?php
/**
 * API Admin Auth V1.1 — Validação de senha server-side
 * Move a senha do frontend para o servidor.
 * CORS Dinâmico (V11.8): aceita domínio de produção + localhost.
 */
require_once __DIR__ . '/env_loader.php';

ini_set('display_errors', 0);
error_reporting(E_ALL);

// --- CORS DINÂMICO (V11.8) ---
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

$jsonData = json_decode(file_get_contents("php://input"), true) ?? [];
$action = $jsonData['action'] ?? ($_GET['action'] ?? '');

if ($action === 'login') {
    $password = $jsonData['password'] ?? '';
    $ADMIN_SECRET = env('ADMIN_SECRET');

    if (empty($ADMIN_SECRET)) {
        echo json_encode(['status' => 'error', 'message' => 'Configuração do servidor incompleta']);
        exit;
    }

    if ($password === $ADMIN_SECRET) {
        // Gera um token de sessão simples (hash da senha + timestamp)
        $token = hash('sha256', $ADMIN_SECRET . date('Y-m-d'));
        echo json_encode([
            'status' => 'success',
            'token' => $token
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Senha incorreta']);
    }
    exit;
}

if ($action === 'validate') {
    $token = $jsonData['token'] ?? '';
    $ADMIN_SECRET = env('ADMIN_SECRET');
    $validToken = hash('sha256', $ADMIN_SECRET . date('Y-m-d'));

    if ($token === $validToken) {
        echo json_encode(['status' => 'success', 'valid' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'valid' => false]);
    }
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Ação inválida']);
