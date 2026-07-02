<?php
/**
 * API de Notificações — ML Factory
 * Arquivo: api_notificacoes.php (raiz do servidor)
 * Uso: GET /api_notificacoes.php?target=barbearia
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
// Nunca cachear — sempre servir dados frescos do disco
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// Sanitiza o parâmetro target
$target   = isset($_GET['target']) ? preg_replace('/[^a-z0-9_-]/', '', strtolower(trim($_GET['target']))) : 'all';
$dataFile = __DIR__ . '/notifications_data.json';

if (!file_exists($dataFile)) {
    echo json_encode([]);
    exit;
}

$raw  = file_get_contents($dataFile);
$data = json_decode($raw, true);

if (!is_array($data)) {
    echo json_encode([]);
    exit;
}

$now      = new DateTime('now', new DateTimeZone('UTC'));
$filtered = [];

foreach ($data as $n) {
    // Filtro por target
    $targets = $n['targets'] ?? ['all'];
    if (!in_array('all', $targets) && !in_array($target, $targets)) continue;

    // Filtro por expiração
    if (!empty($n['expires'])) {
        $exp = new DateTime($n['expires'], new DateTimeZone('UTC'));
        if ($exp < $now) continue;
    }

    $filtered[] = $n;
}

// Ordena por data de publicação (mais recente primeiro)
usort($filtered, function($a, $b) {
    return strtotime($b['published'] ?? 0) - strtotime($a['published'] ?? 0);
});

echo json_encode(array_values($filtered));
