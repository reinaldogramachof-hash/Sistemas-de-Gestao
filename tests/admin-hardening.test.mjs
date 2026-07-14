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
  assert.match(source, /escapeHtml\((n|notification)\.title\)/);
  assert.match(source, /escapeHtml\(r\.confirmation_text\)/);
  assert.match(source, /escapeHtml\(r\.client_email/);
  assert.match(source, /escapeHtml\(r\.license_key/);
  assert.match(source, /escapeHtml\(r\.ip/);
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

test('sales history module exposes filters summary export and enriched backend', () => {
  const phpSource = read('api_licenca_ml.php');
  const htmlSource = read('admin/index.html');

  assert.match(htmlSource, /Histórico de Vendas/);
  assert.match(htmlSource, /id="sales-history-search"/);
  assert.match(htmlSource, /id="sales-history-channel-filter"/);
  assert.match(htmlSource, /id="sales-history-status-filter"/);
  assert.match(htmlSource, /id="sales-history-summary-total"/);
  assert.match(htmlSource, /function filterSalesHistory\(\)/);
  assert.match(htmlSource, /function exportSalesHistoryCsv\(\)/);
  assert.match(htmlSource, /let loadedSalesReceipts = \[\]/);

  assert.match(phpSource, /if \(\$action === 'get_receipts'\)/);
  assert.match(phpSource, /\$licenses = getDB\(\$fileLicenses\)/);
  assert.match(phpSource, /sales_channel/);
  assert.match(phpSource, /billing_model/);
  assert.match(phpSource, /total_value/);
  assert.match(phpSource, /'status' => 'success'/);
  assert.match(phpSource, /'receipts' => \$enrichedReceipts/);
});

test('system logs module exposes operational filters summary export and enriched backend', () => {
  const phpSource = read('api_licenca_ml.php');
  const htmlSource = read('admin/index.html');

  assert.match(htmlSource, /Logs do Sistema/);
  assert.match(htmlSource, /id="logs-search"/);
  assert.match(htmlSource, /id="logs-type-filter"/);
  assert.match(htmlSource, /id="logs-summary-total"/);
  assert.match(htmlSource, /id="logs-summary-errors"/);
  assert.match(htmlSource, /id="logs-summary-warnings"/);
  assert.match(htmlSource, /function normalizeLogRecord\(/);
  assert.match(htmlSource, /function filterSystemLogs\(\)/);
  assert.match(htmlSource, /function exportSystemLogsCsv\(\)/);
  assert.match(htmlSource, /let loadedSystemLogs = \[\]/);
  assert.match(htmlSource, /escapeHtml\(log\.message\)/);
  assert.match(htmlSource, /escapeHtml\(log\.ip\)/);

  assert.match(phpSource, /if \(\$action === 'read_logs'\)/);
  assert.match(phpSource, /\$summary = \[/);
  assert.match(phpSource, /\$safeLogs/);
  assert.match(phpSource, /'status' => 'success'/);
  assert.match(phpSource, /'logs' => \$safeLogs/);
  assert.match(phpSource, /JSON_UNESCAPED_UNICODE/);
});

test('notifications module exposes filters summary export and safe backend normalization', () => {
  const phpSource = read('api_notificacoes_admin.php');
  const htmlSource = read('admin/index.html');

  assert.match(htmlSource, /Central de Notificações/);
  assert.match(htmlSource, /id="notifications-search"/);
  assert.match(htmlSource, /id="notifications-target-filter"/);
  assert.match(htmlSource, /id="notifications-status-filter"/);
  assert.match(htmlSource, /id="notifications-summary-total"/);
  assert.match(htmlSource, /function normalizeNotificationRecord\(/);
  assert.match(htmlSource, /function filterNotifications\(\)/);
  assert.match(htmlSource, /function exportNotificationsCsv\(\)/);
  assert.match(htmlSource, /let loadedNotifications = \[\]/);
  assert.match(htmlSource, /escapeHtml\(notification\.body\)/);
  assert.match(htmlSource, /escapeHtml\(notification\.title\)/);

  assert.match(phpSource, /if \(\$action === 'list'\)/);
  assert.match(phpSource, /\$safeNotifications/);
  assert.match(phpSource, /\$summary = \[/);
  assert.match(phpSource, /\$ALLOWED_TYPES/);
  assert.match(phpSource, /\$ALLOWED_PRIORITIES/);
  assert.match(phpSource, /'status' => 'success'/);
  assert.match(phpSource, /'notifications' => \$safeNotifications/);
  assert.match(phpSource, /JSON_UNESCAPED_UNICODE/);
});

test('master licenses do not expire or bind to a single device', () => {
  const source = read('api_licenca_ml.php');

  assert.match(source, /\$isMasterLicense = !empty\(\$db\[\$key\]\['is_master'\]\)/);
  assert.match(source, /!\$isMasterLicense && !empty\(\$db\[\$key\]\['expiration_date'\]\)/);
  assert.match(source, /!\$isMasterLicense &&\s*\$db\[\$key\]\['status'\] === 'active'/);
  assert.match(source, /\$db\[\$key\]\['device_id'\] = \$isMasterLicense \? '' : \$device/);
  assert.match(source, /\$response\['is_master'\] = true/);
});
