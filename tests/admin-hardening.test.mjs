import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('notification admin endpoint does not accept a hardcoded fallback admin secret', () => {
  const source = read('api_notificacoes_admin.php');

  assert.equal(source.includes("define('ADMIN_SECRET'"), false);
  assert.equal(source.includes('ml_factory_2026_adm'), false);
});

test('admin login requires the configured master email and keeps credentials out of the frontend', () => {
  const phpSource = read('api_admin_auth.php');
  const htmlSource = read('admin/index.html');

  assert.match(phpSource, /env\('ADMIN_MASTER_EMAIL'\)/);
  assert.match(phpSource, /hash_equals\(\$configuredEmail, \$email\)/);
  assert.match(phpSource, /hash_equals\(\$ADMIN_SECRET, \$password\)/);
  assert.equal(htmlSource.includes('ADMIN_SECRET='), false);
  assert.match(htmlSource, /id="admin-email"/);
  assert.match(htmlSource, /email: email/);
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

test('master licenses are server-issued, owner-bound, and never bypassed in client code', () => {
  const apiSource = read('api_licenca_ml.php');
  const bootstrapSource = read('scripts/create_master_license.php');
  const barbeariaSource = read('gestao-barbearia/index.html');
  const belezaSource = read('gestao-beleza/index.html');
  const assistenciaSource = read('gestao-assistencia/index.html');

  assert.match(apiSource, /\$masterOwnerEmail/);
  assert.match(apiSource, /hash_equals\(\$masterOwnerEmail, \$requestEmail\)/);
  assert.match(bootstrapSource, /PHP_SAPI !== 'cli'/);
  assert.match(bootstrapSource, /ADMIN_MASTER_EMAIL/);
  assert.match(bootstrapSource, /MASTER_LICENSE_KEY/);
  assert.match(bootstrapSource, /is_master/);
  assert.equal(barbeariaSource.includes('MASTER123'), false);
  assert.equal(belezaSource.includes('MASTER123'), false);
  assert.equal(assistenciaSource.includes('MASTER123'), false);
  assert.equal(assistenciaSource.includes('ADMIN_ML'), false);
  assert.equal(assistenciaSource.includes('TESTE2026'), false);
  assert.equal(assistenciaSource.includes('BYPASS PARA VALIDAÇÃO VISUAL'), false);
  assert.equal(assistenciaSource.includes('Modo Demonstração (SaaS)'), false);
  assert.equal(assistenciaSource.includes('Dados Fictícios Locais'), false);
  assert.equal(assistenciaSource.includes('document.body.style.paddingTop'), false);
  assert.match(assistenciaSource, /localStorage\.getItem\('assistencia_license'\)/);
  assert.match(assistenciaSource, /localStorage\.getItem\('assistencia_email'\)/);
  assert.match(assistenciaSource, /localStorage\.getItem\('assistencia_device'\)/);
  assert.match(assistenciaSource, /device_id: deviceId/);
});

test('Fase 1: lock.js of all three systems sends device_id and has namespace isolation/migration', () => {
  const assistenciaLock = read('gestao-assistencia/lock.js');
  const barbeariaLock = read('gestao-barbearia/lock.js');
  const belezaLock = read('gestao-beleza/lock.js');

  // 1. Verify device_id is sent in all lock.js files during verify action
  assert.match(assistenciaLock, /device_id:\s*deviceId/);
  assert.match(barbeariaLock, /device_id:\s*deviceId/);
  assert.match(belezaLock, /device_id:\s*deviceId/);

  // 2. Verify email is sent in all lock.js files during verify action
  assert.match(assistenciaLock, /email:\s*licenseEmail/);
  assert.match(barbeariaLock, /email:\s*licenseEmail/);
  assert.match(belezaLock, /email:\s*email/);

  // 3. Verify namespace isolation and migration exist in Barbearia and Beleza lock.js
  assert.match(barbeariaLock, /barbearia_license/);
  assert.match(barbeariaLock, /barbearia_email/);
  assert.match(barbeariaLock, /barbearia_device/);
  assert.match(barbeariaLock, /barbearia_receipt_confirmed/);
  assert.match(barbeariaLock, /plena_license/);
  assert.match(barbeariaLock, /ml_license_email/);

  assert.match(belezaLock, /beleza_license/);
  assert.match(belezaLock, /beleza_email/);
  assert.match(belezaLock, /beleza_device/);
  assert.match(belezaLock, /beleza_receipt_confirmed/);
  assert.match(belezaLock, /plena_license/);
  assert.match(belezaLock, /ml_license_email/);
});

test('Fase 3: admin evolution leads UI has filters, export CSV and uses no inline event handlers', () => {
  const source = read('admin/index.html');

  // Verify filters elements exist in html source
  assert.match(source, /id="leads-search"/);
  assert.match(source, /id="leads-system-filter"/);
  assert.match(source, /id="leads-status-filter"/);
  assert.match(source, /id="leads-export-csv"/);

  // Verify we do not use inline handlers on the new inputs/selects or export button
  const startIdx = source.indexOf('function renderEvolutionLeadsTable()');
  const endIdx = source.indexOf('async function updateEvolutionLeadFields');
  assert.ok(startIdx > -1);
  assert.ok(endIdx > -1);
  const renderBlock = source.slice(startIdx, endIdx);

  assert.equal(renderBlock.includes('onchange='), false, 'renderEvolutionLeadsTable must not output inline onchange');
  assert.equal(renderBlock.includes('onblur='), false, 'renderEvolutionLeadsTable must not output inline onblur');
  assert.equal(renderBlock.includes('onkeypress='), false, 'renderEvolutionLeadsTable must not output inline onkeypress');
  assert.equal(source.includes('onclick="exportEvolutionLeadsCsv'), false, 'export CSV must not use inline onclick');

  // Verify we bind them using event listeners
  assert.match(source, /leadsSearch\.addEventListener\('input'/);
  assert.match(source, /leadsSysFilter\.addEventListener\('change'/);
  assert.match(source, /leadsStFilter\.addEventListener\('change'/);
  assert.match(source, /leadsExportBtn\.addEventListener\('click'/);
  assert.match(source, /selector:\s*'\.lead-owner-input'/);
  assert.match(source, /selector:\s*'\.lead-channel-input'/);
  assert.match(source, /selector:\s*'\.lead-next-contact-input'/);
  assert.match(source, /selector:\s*'\.lead-notes-input'/);
  assert.match(source, /querySelectorAll\(cfg\.selector\)/);
});
