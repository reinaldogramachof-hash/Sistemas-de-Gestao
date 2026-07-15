import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('Settings centralizes waiter access and QR code operations', () => {
  const source = read('gestao-gastro/src/components/Settings.tsx');

  assert.ok(source.includes("'access'"), 'Settings deve ter uma aba de acessos');
  assert.ok(source.includes('Acessos e QR Code'), 'aba deve deixar claro o controle de acessos e QR Code');
  assert.ok(source.includes('getComandaAccessUrl'), 'Settings deve usar helper para montar o link da comanda');
  assert.ok(source.includes('getComandaQrImageUrl'), 'Settings deve gerar QR Code scaneavel para a comanda');
  assert.ok(source.includes("permissions === 'waiter'"), 'Settings deve identificar garçons a partir dos colaboradores');
  assert.ok(source.includes('api_admin_users.php'), 'Settings deve utilizar a API administrativa para gerenciar usuários');
  assert.ok(source.includes('create_member'), 'Settings deve permitir criação via create_member na API');
  assert.ok(source.includes('navigator.clipboard.writeText'), 'Settings deve permitir copiar o link da comanda');
});

test('Comanda access helper preserves client slug and produces QR image URL', () => {
  const source = read('gestao-gastro/src/utils/comandaAccess.ts');

  assert.ok(source.includes('getComandaAccessUrl'), 'helper deve exportar getComandaAccessUrl');
  assert.ok(source.includes('/gestao-gastro/'), 'helper deve preservar slug de cliente');
  assert.ok(source.includes('/comanda'), 'helper deve apontar para rota de comanda');
  assert.ok(source.includes('api.qrserver.com'), 'helper deve gerar URL de QR Code scaneavel');
  assert.ok(source.includes('encodeURIComponent'), 'helper deve codificar link antes de gerar QR');
});

test('Dashboard reuses the shared comanda access helper', () => {
  const source = read('gestao-gastro/src/components/Dashboard.tsx');

  assert.ok(source.includes("import { getComandaAccessUrl } from '../utils/comandaAccess'"));
  assert.equal(source.includes('const getComandaLink = () =>'), false, 'Dashboard nao deve duplicar montagem de link');
});
