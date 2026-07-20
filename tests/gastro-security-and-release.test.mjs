import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const gastroDir = path.join(rootDir, 'gestao-gastro');

test('ActivationGate.tsx should not contain master keys or ml_master_mode setting', () => {
  const gatePath = path.join(gastroDir, 'src', 'components', 'ActivationGate.tsx');
  const content = fs.readFileSync(gatePath, 'utf-8');

  assert.ok(!content.includes('MASTER123'), 'Should not contain MASTER123');
  assert.ok(!content.includes('ADMIN_ML'), 'Should not contain ADMIN_ML');
  assert.ok(!content.includes('TESTE2026'), 'Should not contain TESTE2026');
  assert.ok(!content.includes('masterKeys'), 'Should not contain masterKeys');
  assert.ok(!content.includes("setItem('ml_master_mode'"), 'Should not write ml_master_mode in ActivationGate');
});

test('No files in src should contain ancient master keys', () => {
  const srcPath = path.join(gastroDir, 'src');
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.ok(!content.includes('MASTER123'), `File ${path.relative(srcPath, fullPath)} should not contain MASTER123`);
        assert.ok(!content.includes('ADMIN_ML'), `File ${path.relative(srcPath, fullPath)} should not contain ADMIN_ML`);
        assert.ok(!content.includes('TESTE2026'), `File ${path.relative(srcPath, fullPath)} should not contain TESTE2026`);
        assert.ok(!content.includes('ml_master_mode'), `File ${path.relative(srcPath, fullPath)} should not contain ml_master_mode`);
      }
    }
  }

  walkDir(srcPath);
});

test('license API uses a same-origin endpoint with a local Vite proxy', () => {
  const servicePath = path.join(gastroDir, 'src', 'services', 'licenseApi.ts');
  const gatePath = path.join(gastroDir, 'src', 'components', 'ActivationGate.tsx');
  const receiptPath = path.join(gastroDir, 'src', 'components', 'ReceiptConfirmation.tsx');
  const viteConfigPath = path.join(gastroDir, 'vite.config.ts');

  const service = fs.readFileSync(servicePath, 'utf-8');
  const gate = fs.readFileSync(gatePath, 'utf-8');
  const receipt = fs.readFileSync(receiptPath, 'utf-8');
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');

  assert.match(service, /VITE_LICENSE_API_URL/);
  assert.match(service, /\/api_licenca_ml\.php/);
  assert.match(gate, /getLicenseApiUrl/);
  assert.match(receipt, /getLicenseApiUrl/);
  assert.equal(gate.includes("'../api_licenca_ml.php"), false);
  assert.equal(receipt.includes("'../api_licenca_ml.php"), false);
  assert.match(viteConfig, /proxy:/);
  assert.match(viteConfig, /'\/api_licenca_ml\.php'/);
  assert.match(viteConfig, /127\.0\.0\.1:8000/);
});

test('client routes require a tenant-bound license before activation', () => {
  const gate = fs.readFileSync(path.join(gastroDir, 'src', 'components', 'ActivationGate.tsx'), 'utf-8');
  const licenseApi = fs.readFileSync(path.join(rootDir, 'api_licenca_ml.php'), 'utf-8');

  assert.match(gate, /!data\.tenant_id/);
  assert.match(gate, /data\.is_master/);
  assert.match(licenseApi, /requestTenantId/);
  assert.match(licenseApi, /tenant_id/);
  assert.match(licenseApi, /getLicenseTenantId\(\$db\[\$key\]\)/);
});
