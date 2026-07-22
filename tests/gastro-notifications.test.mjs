import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');

test('admin notification APIs already expose Gastro as a delivery target', () => {
  const publicApi = read('api_notificacoes.php');
  const adminApi = read('api_notificacoes_admin.php');
  const adminPanel = read('admin/index.html');

  assert.match(publicApi, /'gestao-gastro'\s*=>\s*'gastro'/, 'public endpoint should normalize gestao-gastro to gastro');
  assert.match(adminApi, /\$ALLOWED_TARGETS\s*=\s*\[[\s\S]*'gastro'[\s\S]*\]/, 'admin API should allow gastro target');
  assert.match(adminPanel, /value="gastro"[\s\S]*Gastro|Gastro[\s\S]*value="gastro"/, 'admin UI should expose Gastro as a notification target');
});

test('Gastro consumes admin-controlled notifications with cache, license and read state', () => {
  const service = read('gestao-gastro/src/services/notificationsService.ts');
  const hook = read('gestao-gastro/src/hooks/useSystemNotifications.ts');
  const component = read('gestao-gastro/src/components/Notifications.tsx');

  assert.match(service, /NOTIFICATION_TARGET\s*=\s*'gastro'/, 'client service should request the gastro target');
  assert.match(service, /api_notificacoes\.php/, 'client service should use the shared notifications endpoint');
  assert.match(service, /localStorage\.getItem\('plena_license'\)/, 'client service should send the active license key for targeted messages');
  assert.match(service, /cache:\s*'no-store'/, 'network request should avoid stale browser cache');

  assert.match(hook, /gestao_gastro_notifications_read/, 'hook should persist read state for Gastro');
  assert.match(hook, /gestao_gastro_notifications_cache/, 'hook should cache the latest feed locally');
  assert.match(hook, /visibilitychange/, 'hook should refresh when the user returns to the tab');
  assert.match(hook, /markAllAsRead/, 'hook should support marking all messages as read');

  assert.match(component, /useSystemNotifications/, 'notifications screen should consume the hook');
  assert.match(component, /Marcar todas como lidas/, 'screen should expose bulk read action');
  assert.match(component, /Painel Admin/, 'screen should identify the admin-controlled origin');
});

test('Gastro exposes notifications as a system module without giving it to waiter panel access', () => {
  const config = read('gestao-gastro/src/config/modulesConfig.ts');
  const hook = read('gestao-gastro/src/hooks/useModules.ts');
  const layout = read('gestao-gastro/src/components/Layout.tsx');
  const app = read('gestao-gastro/src/App.tsx');
  const navigation = read('gestao-gastro/src/hooks/useNavigation.ts');

  assert.match(config, /'notificacoes'/, 'module contract should include notificacoes');
  assert.match(hook, /\['manual', 'notificacoes', 'seguranca', 'configuracoes', 'suporte', 'evolucao'\]/, 'notificacoes should be treated as a non-billed system module');
  assert.match(layout, /label:\s*'Notificações'/, 'sidebar should expose notifications in Sistema');
  assert.match(layout, /unreadCount/, 'layout should show unread badge');
  assert.match(app, /case 'notificacoes': return <Notifications \/>;/, 'router should render Notifications screen');
  assert.match(navigation, /\|\s*'notificacoes'/, 'navigation type should allow notifications view');

  const waiterMatch = config.match(/waiter:\s*\[([\s\S]*?)\]/);
  assert.ok(waiterMatch, 'waiter module list should exist');
  assert.equal(waiterMatch[1].includes("'notificacoes'"), false, 'waiter should not receive notifications center in the admin panel');
});

// ── Novos testes: API admin \u2014 validações de segurança ──────────────────

test('admin API validates allowed targets including gastro', () => {
  const adminApi = read('api_notificacoes_admin.php');

  assert.match(adminApi, /\$ALLOWED_TARGETS\s*=\s*\[[\s\S]*'all'[\s\S]*'barbearia'[\s\S]*'beleza'[\s\S]*'gastro'[\s\S]*\]/,
    'ALLOWED_TARGETS should include all, barbearia, beleza, gastro');
  assert.match(adminApi, /in_array\(\$t,\s*\$ALLOWED_TARGETS,\s*true\)/,
    'should validate each target against the allowed list');
  assert.match(adminApi, /'error'\s*=>\s*'Invalid target\(s\)/,
    'should return a clear error for invalid targets');
});

test('admin API rejects invalid type and priority values', () => {
  const adminApi = read('api_notificacoes_admin.php');

  assert.match(adminApi, /\$ALLOWED_TYPES\s*=\s*\[[\s\S]*'update'[\s\S]*'security'[\s\S]*'backup'[\s\S]*'info'[\s\S]*'promo'[\s\S]*\]/,
    'ALLOWED_TYPES should be defined');
  assert.match(adminApi, /\$ALLOWED_PRIORITIES\s*=\s*\[[\s\S]*'low'[\s\S]*'normal'[\s\S]*'high'[\s\S]*\]/,
    'ALLOWED_PRIORITIES should be defined');
  assert.match(adminApi, /!in_array\(\$type,\s*\$ALLOWED_TYPES,\s*true\)/,
    'should reject invalid type');
  assert.match(adminApi, /!in_array\(\$priority,\s*\$ALLOWED_PRIORITIES,\s*true\)/,
    'should reject invalid priority');
});

test('admin API prevents duplicate IDs', () => {
  const adminApi = read('api_notificacoes_admin.php');

  assert.match(adminApi, /\$existing\['id'\]\s*===\s*\$newId/,
    'should compare existing IDs against the new one');
  assert.match(adminApi, /http_response_code\(409\)/,
    'should respond 409 on duplicate ID');
  assert.match(adminApi, /'Duplicate id:/,
    'error message should mention duplicate id');
});

test('admin API validates expires is strictly after published', () => {
  const adminApi = read('api_notificacoes_admin.php');

  assert.match(adminApi, /\$publishedTs\s*=\s*strtotime\(\$publishedRaw\)/,
    'should parse publishedRaw with strtotime');
  assert.match(adminApi, /\$expiresTs\s*<=\s*\$publishedTs/,
    'should reject expires <= published');
  assert.match(adminApi, /'expires must be strictly after published'/,
    'error message should mention the constraint');
});

test('admin API enforces field length limits', () => {
  const adminApi = read('api_notificacoes_admin.php');

  assert.match(adminApi, /substr\(.*\$input\['title'\].*,\s*0,\s*160\)/,
    'title should be capped at 160 chars');
  assert.match(adminApi, /substr\(.*\$input\['body'\].*,\s*0,\s*4000\)/,
    'body should be capped at 4000 chars');
  assert.match(adminApi, /substr\(.*\$input\['details'\].*,\s*0,\s*8000\)/,
    'details should be capped at 8000 chars');
  assert.match(adminApi, /substr\(.*\$input\['version'\].*,\s*0,\s*40\)/,
    'version should be capped at 40 chars');
});

test('admin API uses LOCK_EX for atomic file writes', () => {
  const adminApi = read('api_notificacoes_admin.php');

  const lockCount = (adminApi.match(/LOCK_EX/g) || []).length;
  assert.ok(lockCount >= 2, `should use LOCK_EX in at least 2 places (create and delete), found ${lockCount}`);
});

// ── Novos testes: admin/index.html \u2014 feedback e error handling ─────────

test('admin panel loadNotifications does not treat error response as empty list', () => {
  const panel = read('admin/index.html');

  // Deve verificar response.error OU ausência de status:'success' antes de usar .notifications
  assert.match(panel, /response\.error\s*\|\|\s*response\.status\s*!==\s*'success'/,
    'loadNotifications should detect error or missing success status');

  // Não deve usar (response?.notifications || []) diretamente sem checar erros antes
  const unsafePattern = /const\s+list\s*=\s*Array\.isArray\(response\)\s*\?\s*response\s*:\s*\(response\?\.notifications\s*\|\|\s*\[\]\)/;
  assert.equal(unsafePattern.test(panel), false,
    'loadNotifications must not silently fall back to [] without checking for errors first');
});

test('admin panel shows error message in notifications list on load failure', () => {
  const panel = read('admin/index.html');

  assert.match(panel, /Não foi possível carregar as notificações/,
    'should render a human-readable error message');
  assert.match(panel, /Sessão administrativa expirada/,
    'should hint to re-login when session is expired/forbidden');
});

test('admin panel has toast helper that does not use alert()', () => {
  const panel = read('admin/index.html');

  assert.match(panel, /function adminToast\(/, 'should have a toast helper function');
  assert.match(panel, /adminToast\('Notificação criada/, 'should use toast on create success');
  assert.match(panel, /adminToast\('Notificação excluída/, 'should use toast on delete success');
});

test('admin panel create button is disabled during request', () => {
  const panel = read('admin/index.html');

  assert.match(panel, /submitBtn\.disabled\s*=\s*true/, 'should disable submit button during request');
  assert.match(panel, /submitBtn\.disabled\s*=\s*false/, 'should re-enable submit button after request');
  assert.match(panel, /id="notif-submit-btn"/, 'submit button should have a stable id for targeting');
});

test('admin panel shows create/delete errors in the UI without alert()', () => {
  const panel = read('admin/index.html');

  // createNotification não deve ter alert() com texto de erro
  assert.doesNotMatch(panel, /alert\('Erro ao criar notificação/,
    'create error should not use alert()');
  assert.doesNotMatch(panel, /alert\('Título e Corpo/,
    'validation error should not use alert()');

  // deleteNotification não deve ter alert() com texto de erro
  assert.doesNotMatch(panel, /alert\('Erro ao excluir notificação/,
    'delete error should not use alert()');

  // Deve ter o elemento de erro do formulário
  assert.match(panel, /notif-form-error/, 'should have a form error element id');
});

// ── Novos testes: deploy package completo ────────────────────────────────

test('deploy package contains all required notification files', () => {
  const base = 'deploy_packages/atualizar_root';
  const required = [
    `${base}/api_notificacoes.php`,
    `${base}/api_notificacoes_admin.php`,
    `${base}/notifications_data.json`,
    `${base}/admin/index.html`,
  ];

  for (const filePath of required) {
    assert.ok(existsSync(filePath), `deploy package should contain: ${filePath}`);
  }
});

test('deploy package notifications_data.json is a valid JSON array', () => {
  const filePath = 'deploy_packages/atualizar_root/notifications_data.json';
  const content = read(filePath);
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    assert.fail(`notifications_data.json in deploy package is not valid JSON: ${e.message}`);
  }
  assert.ok(Array.isArray(parsed), 'notifications_data.json should be a JSON array (baseline)');
});
