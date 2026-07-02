<?php
/**
 * ENV Loader — Carrega variáveis do arquivo .env
 * Uso: require_once __DIR__ . '/env_loader.php';
 *      $secret = env('ADMIN_SECRET');
 */

function loadEnv($path = null)
{
    $path = $path ?? __DIR__ . '/.env';
    if (!file_exists($path))
        return;

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#')
            continue;

        $pos = strpos($line, '=');
        if ($pos === false)
            continue;

        $key = trim(substr($line, 0, $pos));
        $value = trim(substr($line, $pos + 1));

        // Remove aspas se houver
        if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'")) {
            $value = substr($value, 1, -1);
        }

        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
}

function env($key, $default = '')
{
    return $_ENV[$key] ?? getenv($key) ?: $default;
}

// Auto-load
loadEnv();
