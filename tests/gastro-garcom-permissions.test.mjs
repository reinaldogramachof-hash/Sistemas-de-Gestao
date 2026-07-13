import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GASTRO_SRC = join(process.cwd(), 'gestao-gastro', 'src');

function readSrc(rel) {
  return readFileSync(join(GASTRO_SRC, rel), 'utf-8');
}

describe('Garçom Permissions — gestao-gastro', () => {

  test('ComandaMobileApp NÃO deve importar o Layout administrativo', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');
    assert.ok(
      !content.includes("from '../components/Layout'") &&
      !content.includes("from './Layout'"),
      'ComandaMobileApp não deve incluir Layout do admin',
    );
  });

  test('ComandaMobileApp NÃO deve importar AppProvider/AppContext', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');
    assert.ok(
      !content.includes('AppProvider') && !content.includes('AppContext'),
      'ComandaMobileApp não deve depender do AppContext do admin',
    );
  });

  test('ComandaMobile deve verificar estado de login do garçom', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');
    assert.ok(
      content.includes('GarcomLogin'),
      'ComandaMobileApp deve redirecionar para GarcomLogin se não autenticado',
    );
    assert.ok(
      content.includes('session'),
      'ComandaMobileApp deve verificar sessão do garçom',
    );
  });

  test('GarcomLogin deve existir com campos de email e senha e não permitir fake offline se online mode', () => {
    const content = readSrc('components/GarcomLogin.tsx');
    assert.ok(content.includes('email'), 'GarcomLogin deve ter campo de email');
    assert.ok(content.includes('password') || content.includes('Senha'), 'GarcomLogin deve ter campo de senha');
    assert.ok(content.includes('navigator.onLine'), 'GarcomLogin deve verificar conexão com internet');
    assert.ok(content.includes('Conecte-se à internet'), 'GarcomLogin deve bloquear offline se online mode');
  });

  test('ComandaMobile deve ter detecção de online/offline', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    assert.ok(
      content.includes('navigator.onLine') || content.includes('isOnline'),
      'ComandaMobile deve detectar status de rede',
    );
    assert.ok(
      content.includes('offline') || content.includes('handleSaveOffline'),
      'ComandaMobile deve ter suporte a fluxo offline',
    );
  });

  test('ComandaMobile deve ter fila offline com localStorage', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    assert.ok(
      content.includes('OFFLINE_QUEUE_KEY') || content.includes('garcom_offline_queue'),
      'ComandaMobile deve ter chave de fila offline no localStorage',
    );
    assert.ok(
      content.includes('offlineQueue'),
      'ComandaMobile deve gerenciar offlineQueue',
    );
  });

  test('ComandaMobile NÃO deve referenciar módulos administrativos (dashboard, estoque, caixa)', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    const adminRefs = ['Dashboard', 'Cashier', 'Stock', 'Suppliers', 'Collaborators', 'closeCashier'];
    for (const ref of adminRefs) {
      assert.ok(
        !content.includes(ref),
        `ComandaMobile não deve referenciar módulo administrativo "${ref}"`,
      );
    }
  });

  test('main.tsx deve isolar a rota /comanda e rotas de cliente do App administrativo', () => {
    const content = readSrc('main.tsx');
    assert.ok(
      content.includes('getClientRouteFromPath'),
      'main.tsx deve resolver rotas publicas de cliente via clientRoutes',
    );
    assert.ok(
      content.includes('ComandaMobileApp'),
      'main.tsx deve renderizar ComandaMobileApp para rotas de comanda',
    );
    assert.ok(
      content.includes('isClientComandaRoute'),
      'main.tsx deve separar explicitamente rota de comanda do cliente',
    );
    assert.ok(
      content.includes('<App />'),
      'main.tsx deve renderizar App normal para outras rotas',
    );
  });

  test('clientRoutes deve mapear cantinhodaresenha para o tenant correto e priorizar slug', () => {
    const content = readSrc('config/clientRoutes.ts');
    assert.ok(content.includes('cantinhodaresenha'), 'clientRoutes deve conter o slug publico do cliente');
    assert.ok(
      content.includes('cd8f21f4-73a1-4c87-a385-9b6deacaeae7'),
      'clientRoutes deve conter o tenant UUID do Cantinho',
    );
    assert.ok(
      content.includes('getClientRouteFromPath'),
      'clientRoutes deve expor resolucao completa da rota do cliente',
    );
    assert.ok(
      content.includes('import.meta.env.DEV'),
      'fallback por localStorage deve ficar restrito a desenvolvimento',
    );
  });

  test('ComandaMobileApp nao deve reaproveitar sessao local quando Supabase esta configurado sem Auth', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');
    assert.ok(
      content.includes('setSession(null);'),
      'sem sessao Supabase valida, ComandaMobileApp deve limpar sessao local',
    );
    assert.ok(
      !content.includes('Verify if there') && !content.includes('setSession(loadSession());\n        }'),
      'ramo Supabase configurado nao deve carregar sessao local antiga',
    );
  });

  test('ComandaMobile deve usar waiterId na criação do pedido', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    assert.ok(
      content.includes('waiterId'),
      'ComandaMobile deve incluir waiterId no pedido',
    );
    assert.ok(
      content.includes('waiterName'),
      'ComandaMobile deve incluir waiterName no pedido',
    );
  });

  test('useTables hook deve existir com subscribeToTables', () => {
    const content = readSrc('hooks/useTables.ts');
    assert.ok(content.includes('subscribeToTables'), 'useTables deve usar subscribeToTables para Realtime');
    assert.ok(content.includes('setTablesLocal'), 'useTables deve ter fallback setTablesLocal');
    assert.ok(content.includes('online'), 'useTables deve checar se Supabase está configurado');
  });

  test('useOrders hook deve existir com subscribeToOrders', () => {
    const content = readSrc('hooks/useOrders.ts');
    assert.ok(content.includes('subscribeToOrders'), 'useOrders deve usar subscribeToOrders para Realtime');
    assert.ok(content.includes('setOrdersLocal'), 'useOrders deve ter fallback setOrdersLocal');
    assert.ok(content.includes('online'), 'useOrders deve checar se Supabase está configurado');
  });

});
