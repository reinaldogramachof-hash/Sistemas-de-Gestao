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

