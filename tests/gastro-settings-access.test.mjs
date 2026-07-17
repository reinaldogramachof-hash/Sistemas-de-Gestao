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
  assert.ok(source.includes('update_member'), 'Settings deve permitir edicao via update_member na API');
  assert.ok(source.includes('openEditMemberModal'), 'Settings deve expor fluxo de edicao para colaboradores criados');
  assert.ok(source.includes('editMemberPassword'), 'Settings deve permitir troca de senha opcional no fluxo de edicao');
  assert.ok(source.includes('navigator.clipboard.writeText'), 'Settings deve permitir copiar o link da comanda');
  assert.ok(source.includes('canGenerateLocalAccess'), 'Settings deve bloquear QR local sem IP LAN valido');
  assert.ok(source.includes('Informe um IP local valido'), 'Settings deve orientar o usuario quando o QR local ainda nao pode ser gerado');
});

test('Comanda access helper preserves client slug and produces QR image URL', () => {
  const source = read('gestao-gastro/src/utils/comandaAccess.ts');

  assert.ok(source.includes('getComandaAccessUrl'), 'helper deve exportar getComandaAccessUrl');
  assert.ok(source.includes('/gestao-gastro/'), 'helper deve preservar slug de cliente');
  assert.ok(source.includes('/comanda'), 'helper deve apontar para rota de comanda');
  assert.ok(source.includes('?access=${waiterAccessMode}'), 'helper deve embutir modo de acesso no link da comanda');
  assert.ok(source.includes('api.qrserver.com'), 'helper deve gerar URL de QR Code scaneavel');
  assert.ok(source.includes('encodeURIComponent'), 'helper deve codificar link antes de gerar QR');
});

test('Settings makes local network setup editable and self-saving', () => {
  const source = read('gestao-gastro/src/components/Settings.tsx');

  assert.ok(source.includes('handleLanOriginInput'), 'Settings deve permitir digitacao manual da origem LAN');
  assert.ok(source.includes('handleLanOriginBlur'), 'Settings deve normalizar e salvar origem LAN valida');
  assert.ok(source.includes('handleUseCurrentLanOrigin'), 'Settings deve permitir usar o endereco atual');
  assert.ok(source.includes('persistSettings(updated)'), 'Settings deve salvar o modo/endereco de acesso no fluxo de configuracao');
  assert.equal(source.includes('readOnly\n                        placeholder="Clique em Detectar rede local..."'), false);
});

test('Comanda mobile trusts access mode carried by the QR link', () => {
  const source = read('gestao-gastro/src/components/ComandaMobileApp.tsx');

  assert.ok(source.includes("new URLSearchParams(window.location.search).get('access')"));
  assert.ok(source.includes("accessModeFromUrl === 'external'"));
  assert.ok(source.includes("accessModeFromUrl === 'local'"));
  assert.ok(source.includes('api_comanda_manifest.php'), 'Comanda mobile deve usar manifest PWA dinamico para instalar no caminho do cliente');
  assert.ok(source.includes("document.querySelector<HTMLLinkElement>('link[rel=\"manifest\"]')"), 'Comanda mobile deve trocar o manifest da pagina ao abrir rota de garcom');
});

test('Dashboard reuses the shared comanda access helper', () => {
  const source = read('gestao-gastro/src/components/Dashboard.tsx');

  assert.ok(source.includes("import { getComandaAccessUrl } from '../utils/comandaAccess'"));
  assert.equal(source.includes('const getComandaLink = () =>'), false, 'Dashboard nao deve duplicar montagem de link');
});
