import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('public notifications endpoint normalizes system target aliases before delivery filtering', () => {
  const source = read('api_notificacoes.php');

  assert.match(source, /function normalizeNotificationTarget\(/);
  assert.match(source, /'gestao-barbearia'\s*=>\s*'barbearia'/);
  assert.match(source, /'gestao-beleza'\s*=>\s*'beleza'/);
  assert.match(source, /'gestao-gastro'\s*=>\s*'gastro'/);
  assert.match(source, /\$target\s*=\s*normalizeNotificationTarget\(/);
  assert.match(source, /array_map\('normalizeNotificationTarget',\s*\$targets\)/);
});

test('public API blocks notifications with future published date', () => {
  const source = read('api_notificacoes.php');

  // Deve filtrar published futuro (comparação $pub > $now)
  assert.match(source, /\$pub\s*=\s*new\s+DateTime\(\$n\['published'\]/, 'should parse published as DateTime');
  assert.match(source, /if\s*\(\$pub\s*>\s*\$now\)\s*continue/, 'should skip future-published notifications');
});

test('public API does not skip notifications with missing published field (legacy compatibility)', () => {
  const source = read('api_notificacoes.php');

  // O filtro só roda se !empty($n['published'])
  assert.match(source, /if\s*\(!empty\(\$n\['published'\]\)\)\s*\{[\s\S]*?\$pub\s*=\s*new\s+DateTime/, 'legacy records without published field should not be blocked');
});

test('public API delivers notifications with target all to gastro client', () => {
  const source = read('api_notificacoes.php');

  // alias gestao-gastro → gastro está mapeado
  assert.match(source, /'gestao-gastro'\s*=>\s*'gastro'/);

  // filtro de target inclui 'all'
  assert.match(source, /in_array\('all',\s*\$targets\)/, 'should pass all-target notifications regardless of requested system');
});

test('public API respects target_license field', () => {
  const source = read('api_notificacoes.php');

  assert.match(source, /\$targetLicense\s*=\s*\$n\['target_license'\]/, 'should read target_license from notification record');
  assert.match(source, /strtolower\(trim\(\$targetLicense\)\)\s*!==\s*strtolower\(\$license\)/, 'should skip notification if license does not match');
});

test('public API preserves expiry filter', () => {
  const source = read('api_notificacoes.php');

  assert.match(source, /\$exp\s*=\s*new\s+DateTime\(\$n\['expires'\]/, 'should parse expires as DateTime');
  assert.match(source, /if\s*\(\$exp\s*<\s*\$now\)\s*continue/, 'should skip expired notifications');
});
