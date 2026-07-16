<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must run from the command line.\n");
    exit(1);
}

require_once __DIR__ . '/../env_loader.php';

$ownerEmail = strtolower(trim(env('ADMIN_MASTER_EMAIL')));
if (!filter_var($ownerEmail, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "ADMIN_MASTER_EMAIL is missing or invalid.\n");
    exit(1);
}

$configuredKey = strtoupper(trim(env('MASTER_LICENSE_KEY')));
if ($configuredKey !== '' && !preg_match('/^PLENA-MASTER-[A-F0-9]{24}$/', $configuredKey)) {
    fwrite(STDERR, "MASTER_LICENSE_KEY has an invalid format.\n");
    exit(1);
}

$dataFile = __DIR__ . '/../api_data/database_licenses_secure.json';
$directory = dirname($dataFile);
if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
    fwrite(STDERR, "Unable to create the license data directory.\n");
    exit(1);
}

$licenses = [];
if (is_file($dataFile)) {
    $licenses = json_decode((string) file_get_contents($dataFile), true) ?? [];
}

foreach ($licenses as $key => $license) {
    if (!empty($license['is_master']) && strtolower((string) ($license['owner_email'] ?? '')) === $ownerEmail) {
        if ($configuredKey !== '' && !hash_equals($configuredKey, $key)) {
            fwrite(STDERR, "A different master license already exists for this owner.\n");
            exit(1);
        }
        echo $key . PHP_EOL;
        exit(0);
    }
}

$key = $configuredKey !== '' ? $configuredKey : 'PLENA-MASTER-' . strtoupper(bin2hex(random_bytes(12)));
if (isset($licenses[$key])) {
    fwrite(STDERR, "The configured master license key is already in use.\n");
    exit(1);
}
$licenses[$key] = [
    'client' => 'Administrador interno',
    'product' => 'Licenca Master Interna',
    'status' => 'active',
    'created_at' => date('Y-m-d H:i:s'),
    'activated_at' => null,
    'type' => 'internal_master',
    'is_master' => true,
    'owner_email' => $ownerEmail,
    'plan_code' => 'internal_master',
    'plan_name' => 'Master Interno',
    'billing_model' => 'internal',
    'sales_channel' => 'internal',
    'system_version' => 'master',
    'package_version' => 'master',
    'system_scope' => ['gestao-barbearia', 'gestao-beleza', 'gestao-gastro'],
    'device_id' => '',
];

$handle = fopen($dataFile, 'c+');
if ($handle === false || !flock($handle, LOCK_EX)) {
    fwrite(STDERR, "Unable to lock the license database.\n");
    exit(1);
}

ftruncate($handle, 0);
fwrite($handle, json_encode($licenses, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);
chmod($dataFile, 0640);

echo $key . PHP_EOL;
