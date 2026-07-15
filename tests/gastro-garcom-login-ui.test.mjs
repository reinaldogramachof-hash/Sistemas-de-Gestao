import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(
  new URL('../gestao-gastro/src/components/GarcomLogin.tsx', import.meta.url),
  'utf8',
);

test('waiter login identifies the client and keeps an accessible, high-contrast form', () => {
  assert.match(source, /Comanda do Garçom/);
  assert.match(source, /Cantinho da Resenha/);
  assert.match(source, /htmlFor="garcom-email"/);
  assert.match(source, /htmlFor="garcom-password"/);
  assert.match(source, /Mostrar senha/);
  assert.match(source, /role="alert"/);
  assert.match(source, /text-white/);
});
