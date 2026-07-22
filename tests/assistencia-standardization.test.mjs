import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('PWA Service Worker in gestao-assistencia has API bypass with no-store', () => {
  const sw = read('gestao-assistencia/sw.js');

  assert.ok(sw.includes('gestao-assistencia-cache-v8'), 'Cache version should be bumped to v8');
  assert.ok(sw.includes('api_'), 'SW must check for /api_ calls');
  assert.ok(sw.includes('.php'), 'SW must check for .php calls');
  assert.ok(sw.includes('api_notificacoes'), 'SW must check for api_notificacoes calls');
  assert.ok(sw.includes('no-store'), 'SW must use no-store for API passthrough');
  assert.ok(sw.includes('./assets/js/notif_logic.js'), 'SW must cache notif_logic.js');
  assert.ok(sw.includes('skipWaiting'), 'SW must call skipWaiting');
  assert.ok(sw.includes('clients.claim'), 'SW must call clients.claim');
});

test('Access denied page exists and lock.js points to it', () => {
  const hasAccessDenied = existsSync(new URL('../gestao-assistencia/access_denied.html', import.meta.url));
  assert.ok(hasAccessDenied, 'gestao-assistencia/access_denied.html must exist');

  const lockJs = read('gestao-assistencia/lock.js');
  assert.ok(lockJs.includes("window.location.href = 'access_denied.html'"), 'lock.js must redirect to access_denied.html when blocked');
  assert.ok(lockJs.includes('assistencia_license'), 'lock.js must check assistencia_license');
  assert.ok(lockJs.includes('assistencia_email'), 'lock.js must check assistencia_email');
  assert.ok(lockJs.includes('assistencia_device'), 'lock.js must check assistencia_device');
});

test('Central Notifications module is integrated in gestao-assistencia', () => {
  const notifLogicExists = existsSync(new URL('../gestao-assistencia/assets/js/notif_logic.js', import.meta.url));
  assert.ok(notifLogicExists, 'gestao-assistencia/assets/js/notif_logic.js must exist');

  const notifLogic = read('gestao-assistencia/assets/js/notif_logic.js');
  assert.ok(notifLogic.includes("NOTIF_TARGET    = 'assistencia'"), 'Target must be assistencia');
  assert.ok(notifLogic.includes("NOTIF_READ_KEY  = 'ml_notif_read_assistencia'"), 'Read key must be namespaced');
  assert.ok(notifLogic.includes("NOTIF_CACHE_KEY = 'ml_notif_cache_assistencia'"), 'Cache key must be namespaced');

  const html = read('gestao-assistencia/index.html');
  assert.ok(html.includes('assets/js/notif_logic.js'), 'index.html must include notif_logic.js script tag');
  assert.ok(html.includes('id="nav-notifications"'), 'index.html must include nav-notifications element');
  assert.ok(html.includes('id="view-notifications"'), 'index.html must include view-notifications element');
  assert.ok(html.includes('notif-badge'), 'index.html must include notif-badge element');

  const router = read('gestao-assistencia/assets/js/router.js');
  assert.ok(router.includes("case 'notifications':"), 'router.js must handle case notifications');
});

test('Hardening in gestao-assistencia/assets/js/notif_logic.js (Sanitization, No inline onclick, Event listeners, Date handling)', () => {
  const notifLogic = read('gestao-assistencia/assets/js/notif_logic.js');

  // 1. Sanitização
  assert.ok(notifLogic.includes('function escapeHtml'), 'must contain escapeHtml helper');
  assert.ok(notifLogic.includes('escapeHtml(n.title)'), 'title must be escaped');
  assert.ok(notifLogic.includes('escapeHtml(n.body)'), 'body must be escaped');
  assert.ok(notifLogic.includes('escapeHtml(n.details)'), 'details must be escaped');
  assert.ok(notifLogic.includes('escapeHtml(n.version)'), 'version must be escaped');
  assert.ok(notifLogic.includes('escapeHtml(strId)'), 'id must be escaped');

  // 2. Sem onclick inline
  assert.equal(notifLogic.includes('onclick="markAsRead'), false, 'must not contain inline onclick="markAsRead"');
  assert.ok(notifLogic.includes('data-notif-id='), 'must use data-notif-id attribute');
  assert.ok(notifLogic.includes("addEventListener('click'"), 'must use addEventListener for clicks');

  // 3. Resiliência de data e ID
  assert.ok(notifLogic.includes('formatPublishedDate'), 'must contain formatPublishedDate helper');
  assert.ok(notifLogic.includes('Data não informada'), 'must fallback to "Data não informada" for invalid dates');
  assert.ok(notifLogic.includes('notif_fallback_'), 'must handle missing ID with fallback');
});

test('LocalStorage manual_progress is namespaced to assistencia_manual_progress with fallback', () => {
  const html = read('gestao-assistencia/index.html');
  assert.ok(html.includes("STORAGE_KEY = 'assistencia_manual_progress'"), 'STORAGE_KEY must be assistencia_manual_progress');
  assert.ok(html.includes("localStorage.getItem('manual_progress')"), 'loadProgress must fallback to manual_progress');
});

test('Out of scope directories and files remain untouched', () => {
  const barbeariaLock = read('gestao-barbearia/lock.js');
  assert.ok(barbeariaLock.includes('barbearia_license'));

  const belezaLock = read('gestao-beleza/lock.js');
  assert.ok(belezaLock.includes('beleza_license'));
});
