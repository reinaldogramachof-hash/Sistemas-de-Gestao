import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('notification admin endpoint does not accept a hardcoded fallback admin secret', () => {
  const source = read('api_notificacoes_admin.php');

  assert.equal(source.includes("define('ADMIN_SECRET'"), false);
  assert.equal(source.includes('ml_factory_2026_adm'), false);
});

test('notification admin list route requires admin authentication', () => {
  const source = read('api_notificacoes_admin.php');
  const secretPosition = source.indexOf("$secret =");
  const listRoutePosition = source.indexOf("if ($action === 'list')");

  assert.notEqual(secretPosition, -1);
  assert.notEqual(listRoutePosition, -1);
  assert.ok(secretPosition < listRoutePosition);
});

test('license status updates are whitelisted and trial conversion exists', () => {
  const source = read('api_licenca_ml.php');

  assert.match(source, /\$allowedStatuses\s*=\s*\[/);
  assert.match(source, /if \(\$action === 'convert_trial'\)/);
});

test('sales dashboard does not count every transaction regardless of status', () => {
  const source = read('api_vendas.php');

  assert.equal(source.includes("|| true"), false);
});

test('admin rendering uses escaping helpers for user-controlled text', () => {
  const source = read('admin/index.html');

  assert.match(source, /function escapeHtml\(value\)/);
  assert.match(source, /escapeHtml\(l\.client \|\| 'Mercado Livre'\)/);
  assert.match(source, /escapeHtml\(n\.title\)/);
  assert.match(source, /escapeHtml\(r\.confirmation_text\)/);
});

test('marketplace trial delivery copy does not route customers to external WhatsApp', () => {
  const source = read('admin/index.html');

  assert.equal(source.includes('me chame pelo WhatsApp'), false);
  assert.equal(source.includes('(12) 99219-1018'), false);
});

test('license manager exposes safe status filters and archive preview controls', () => {
  const source = read('admin/index.html');

  assert.match(source, /id="license-status-filter"/);
  assert.match(source, /value="current"/);
  assert.match(source, /value="trial_expired"/);
  assert.match(source, /function getLicenseCategory\(l\)/);
  assert.match(source, /function previewArchiveInactive\(\)/);
  assert.match(source, /archive_inactive_preview/);
  assert.match(source, /archive_inactive/);
});

test('license archive backend preserves active pending and active trial records', () => {
  const source = read('api_licenca_ml.php');

  assert.match(source, /\$fileArchivedLicenses/);
  assert.match(source, /function isArchiveCandidate\(array \$license\)/);
  assert.match(source, /if \(\$action === 'archive_inactive_preview'\)/);
  assert.match(source, /if \(\$action === 'archive_inactive'\)/);
  assert.match(source, /\$protectedStatuses\s*=\s*\['active', 'pending'\]/);
  assert.match(source, /database_licenses_archived\.json/);
  assert.equal(source.includes('unlink($fileLicenses)'), false);
});

test('license manager supports individual archive selection controls', () => {
  const source = read('admin/index.html');

  assert.match(source, /id="select-visible-licenses"/);
  assert.match(source, /class="license-archive-checkbox"/);
  assert.match(source, /function toggleVisibleLicenseSelection\(\)/);
  assert.match(source, /function updateSelectedArchiveCount\(\)/);
  assert.match(source, /function archiveSelectedLicenses\(\)/);
  assert.match(source, /archive_selected/);
});

test('selected archive backend validates requested keys against safe archive candidates', () => {
  const source = read('api_licenca_ml.php');

  assert.match(source, /if \(\$action === 'archive_selected'\)/);
  assert.match(source, /\$requestedKeys = \$jsonData\['keys'\]/);
  assert.match(source, /isArchiveCandidate\(\$license\)/);
  assert.match(source, /\$skippedKeys\[\] = \$key/);
  assert.match(source, /selected_count/);
});

test('archived licenses UI and backend integration tests', () => {
  const phpSource = read('api_licenca_ml.php');
  const htmlSource = read('admin/index.html');

  // Backend asserts
  assert.match(phpSource, /if \(\$action === 'list_archived'\)/);
  assert.match(phpSource, /validateSecret\(\$jsonData, \$ADMIN_SECRET\)/);
  assert.match(phpSource, /file_exists\(\$fileArchivedLicenses\)/);
  assert.match(phpSource, /database_licenses_archived\.json/);

  // Frontend asserts
  assert.match(htmlSource, /value="archived"/);
  assert.match(htmlSource, /const action = isArchived \? 'list_archived' : 'list'/);
  assert.match(htmlSource, /statusText = 'ARQUIVADA'/);
  assert.match(htmlSource, /canArchive = isArchiveCandidateRecord\(l\) && !isArchived/);
});

test('master licenses do not expire or bind to a single device', () => {
  const source = read('api_licenca_ml.php');

  assert.match(source, /\$isMasterLicense = !empty\(\$db\[\$key\]\['is_master'\]\)/);
  assert.match(source, /!\$isMasterLicense && !empty\(\$db\[\$key\]\['expiration_date'\]\)/);
  assert.match(source, /!\$isMasterLicense &&\s*\$db\[\$key\]\['status'\] === 'active'/);
  assert.match(source, /\$db\[\$key\]\['device_id'\] = \$isMasterLicense \? '' : \$device/);
  assert.match(source, /\$response\['is_master'\] = true/);
});
