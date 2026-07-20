import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('Settings centralizes waiter access and QR code operations', () => {
  const source = read('gestao-gastro/src/components/Settings.tsx');

  assert.ok(source.includes("'access'"), 'Settings deve ter uma aba de acessos');
  assert.ok(source.includes('Acessos e QR Code'), 'aba deve deixar claro o controle de acessos e QR Code');
  assert.ok(source.includes('getComandaAccessUrl'), 'Settings deve usar helper para montar o link da comanda');
  assert.ok(source.includes('LocalQrCode'), 'Settings deve renderizar QR Code localmente para a comanda');
  assert.ok(source.includes("permissions === 'waiter'"), 'Settings deve identificar garçons a partir dos colaboradores');
  assert.ok(source.includes('api_admin_users.php'), 'Settings deve utilizar a API administrativa para gerenciar usuários');
  assert.ok(source.includes('create_member'), 'Settings deve permitir criação via create_member na API');
  assert.ok(source.includes('update_member'), 'Settings deve permitir edicao via update_member na API');
  assert.ok(source.includes('openEditMemberModal'), 'Settings deve expor fluxo de edicao para colaboradores criados');
  assert.ok(source.includes('editMemberPassword'), 'Settings deve permitir troca de senha opcional no fluxo de edicao');
  assert.ok(source.includes('navigator.clipboard.writeText'), 'Settings deve permitir copiar o link da comanda');
  assert.ok(source.includes('canGenerateLocalAccess'), 'Settings deve bloquear QR local sem IP LAN valido');
  assert.ok(source.includes('Informe o IPv4 local'), 'Settings deve orientar o usuario quando o QR local ainda nao pode ser gerado');
});

test('Comanda access helper preserves client slug without external QR generation', () => {
  const source = read('gestao-gastro/src/utils/comandaAccess.ts');

  assert.ok(source.includes('getComandaAccessUrl'), 'helper deve exportar getComandaAccessUrl');
  assert.ok(source.includes('/gestao-gastro/'), 'helper deve preservar slug de cliente');
  assert.ok(source.includes('/comanda'), 'helper deve apontar para rota de comanda');
  assert.ok(source.includes('?access=${waiterAccessMode}'), 'helper deve embutir modo de acesso no link da comanda');
  assert.equal(source.includes('api.qrserver.com'), false, 'QR nao deve vazar URL do restaurante para servico externo');
  assert.equal(source.includes('getComandaQrImageUrl'), false, 'geracao de QR fica no componente local');
});

test('Settings makes local network setup editable and self-saving', () => {
  const source = read('gestao-gastro/src/components/Settings.tsx');

  assert.ok(source.includes('handleLanOriginInput'), 'Settings deve permitir digitacao manual da origem LAN');
  assert.ok(source.includes('handleLanOriginBlur'), 'Settings deve normalizar e salvar origem LAN valida');
  assert.ok(source.includes('handleUseCurrentLanOrigin'), 'Settings deve permitir usar o endereco atual');
  assert.ok(source.includes('persistWaiterAccessSettings(updated)'), 'Settings deve salvar o modo/endereco de acesso no fluxo de configuracao');
  assert.ok(source.includes('persistWaiterAccessSettings'), 'Settings deve persistir configuracao de QR no tenant');
  assert.ok(source.includes('save_waiter_access_settings'), 'Settings deve usar contrato remoto para acesso de garçons');
  assert.ok(source.includes('Deteccao automatica indisponivel neste endereco online'), 'Settings deve avisar quando o dominio online nao consegue detectar a LAN');
  assert.ok(source.includes('Detectar endereco atual'), 'Settings deve deixar claro que o botao tenta detectar o endereco atual');
  assert.equal(source.includes("waiterAccessMode: 'external' as const, waiterLocalOrigin: '', localTestOrigin: ''"), false, 'Detectar LAN nao deve alternar automaticamente para acesso externo');
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
