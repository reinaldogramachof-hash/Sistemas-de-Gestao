<?php
declare(strict_types=1);

header('Content-Type: application/manifest+json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$rawSlug = $_GET['slug'] ?? '';
$rawAccess = $_GET['access'] ?? 'local';
$rawName = $_GET['name'] ?? 'Gestao Gastro';

$slug = preg_replace('/[^a-z0-9-]/i', '', (string) $rawSlug);
$access = $rawAccess === 'external' ? 'external' : 'local';
$name = trim(preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', (string) $rawName)) ?: 'Gestao Gastro';

$basePath = $slug !== '' ? "/gestao-gastro/{$slug}" : '/gestao-gastro';
$startUrl = "{$basePath}/comanda?access={$access}";

echo json_encode([
    'name' => "Comanda Gastro - {$name}",
    'short_name' => 'Comanda',
    'description' => 'Comanda mobile do garcom para lancamentos de mesas.',
    'start_url' => $startUrl,
    'scope' => "{$basePath}/",
    'display' => 'standalone',
    'background_color' => '#0f172a',
    'theme_color' => '#1e293b',
    'lang' => 'pt-BR',
    'orientation' => 'portrait',
    'icons' => [
        [
            'src' => '/gestao-gastro/pwa-512x512.png',
            'sizes' => '512x512',
            'type' => 'image/png',
            'purpose' => 'any maskable',
        ],
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
