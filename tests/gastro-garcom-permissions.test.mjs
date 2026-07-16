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
      content.includes('!!clientRoute'),
      'rota de comanda deve aceitar qualquer slug conhecido do cliente, inclusive alias com hifen',
    );
    assert.ok(
      content.includes('<App />'),
      'main.tsx deve renderizar App normal para outras rotas',
    );
  });

  test('clientRoutes deve mapear cantinhodaresenha para o tenant correto e priorizar slug', () => {
    const content = readSrc('config/clientRoutes.ts');
    assert.ok(content.includes('cantinhodaresenha'), 'clientRoutes deve conter o slug publico do cliente');
    assert.ok(content.includes('cantinho-da-resenha'), 'clientRoutes deve aceitar o slug gerado pelo painel admin');
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

  test('ComandaMobileApp deve persistir e limpar o role real do garcom', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');

    assert.ok(
      content.includes('USER_ROLE_KEY'),
      'ComandaMobileApp deve centralizar a chave do role do usuario',
    );
    assert.ok(
      content.includes('sessionStorage.setItem(USER_ROLE_KEY, member.role)'),
      'apos validar tenant_members, ComandaMobileApp deve persistir o role real apenas na aba da comanda',
    );
    assert.ok(
      content.includes('sessionStorage.removeItem(USER_ROLE_KEY)'),
      'logout deve remover role para nao contaminar outro usuario na mesma aba',
    );
  });

  test('ComandaMobileApp deve liberar somente garcom ativo para acesso externo', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');

    assert.ok(
      content.includes("member.role !== 'waiter'"),
      'rota externa deve bloquear usuarios que nao possuem papel waiter',
    );
    assert.ok(
      content.includes('display_name'),
      'nome exibido no modulo externo deve vir do tenant_members quando disponivel',
    );
    assert.ok(
      content.includes('Promise<boolean>') && content.includes('throw new Error'),
      'falha de permissao deve voltar para o login sem deixar spinner travado',
    );
  });

  test('App administrativo deve redirecionar usuario waiter para rota comanda', () => {
    const content = readSrc('App.tsx');

    assert.ok(
      content.includes('gestao_gastro_user_role'),
      'App deve consultar o role da sessao da aba',
    );
    assert.ok(
      content.includes("storedRole === 'waiter'"),
      'App deve tratar explicitamente o perfil waiter',
    );
    assert.ok(
      content.includes('window.location.replace'),
      'App deve redirecionar waiter para a comanda em vez de renderizar painel completo',
    );
    assert.ok(
      content.includes('getClientRouteFromPath'),
      'redirecionamento deve preservar a rota do cliente quando houver slug',
    );
  });

  test('ComandaMobileApp nao deve gravar role waiter em localStorage compartilhado', () => {
    const content = readSrc('components/ComandaMobileApp.tsx');
    const appContent = readSrc('App.tsx');

    assert.ok(
      !content.includes('localStorage.setItem(USER_ROLE_KEY'),
      'comanda externa nao deve contaminar outras abas com role waiter global',
    );
    assert.ok(
      appContent.includes("sessionStorage.getItem('gestao_gastro_user_role')"),
      'redirecionamento por role waiter deve considerar somente a sessao da aba',
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

  test('ComandaMobile deve somar itens em mesa ocupada sem criar pedido duplicado', () => {
    const content = readSrc('components/ComandaMobile.tsx');

    assert.ok(
      content.includes('updateOrderItems'),
      'ComandaMobile deve usar updateOrderItems quando a mesa ja possui activeOrderId',
    );
    assert.ok(
      content.includes('listOpenOrders'),
      'ComandaMobile deve carregar pedidos abertos para localizar a comanda ativa',
    );
    assert.match(
      content,
      /selectedTable\?\.activeOrderId[\s\S]*updateOrderItems/,
      'fluxo de confirmacao deve priorizar atualizar a comanda ativa da mesa',
    );
    assert.ok(
      content.includes('mergeOrderItems'),
      'ComandaMobile deve consolidar itens novos com itens existentes da comanda',
    );
  });

  test('ComandaMobile deve abrir resumo antes de adicionar itens em mesa ocupada', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    const grid = readSrc('components/ComandaMesaGrid.tsx');
    const resumo = readSrc('components/ComandaMesaResumo.tsx');

    assert.ok(
      content.includes("type Step = 'mesa' | 'resumo' | 'lancamento' | 'confirmacao'"),
      'fluxo do garcom deve ter etapa de resumo da comanda',
    );
    assert.ok(
      content.includes("setStep(table.status === 'livre' && !table.activeOrderId ? 'lancamento' : 'resumo')"),
      'mesa ocupada deve abrir consulta antes do lancamento',
    );
    assert.ok(
      content.includes('<ComandaMesaResumo') && content.includes('selectedOpenOrder'),
      'ComandaMobile deve renderizar resumo com pedido aberto da mesa selecionada',
    );
    assert.ok(
      grid.includes('openOrders') && grid.includes('item(ns)'),
      'grid de mesas deve exibir quantidade e total quando houver pedido aberto',
    );
    assert.ok(
      resumo.includes('Comanda aberta') && resumo.includes('Adicionar itens'),
      'resumo deve mostrar itens existentes e permitir adicionar novos itens',
    );
  });

  test('ComandaMobile deve preservar pedido ativo na fila offline de mesa ocupada', () => {
    const content = readSrc('components/ComandaMobile.tsx');

    assert.ok(
      content.includes('existingOrderId'),
      'fila offline deve guardar existingOrderId para atualizar mesa ocupada ao sincronizar',
    );
    assert.match(
      content,
      /item\.existingOrderId[\s\S]*updateOrderItems/,
      'sincronizacao offline deve atualizar pedido existente quando existingOrderId estiver presente',
    );
  });

  test('ComandaMobile deve recuperar mesa com activeOrderId orfao criando nova comanda', () => {
    const content = readSrc('components/ComandaMobile.tsx');

    assert.ok(
      content.includes('if (activeOrder)'),
      'pedido existente deve ser atualizado apenas quando encontrado entre pedidos abertos',
    );
    assert.ok(
      content.includes('const createdOrder = await createOrder'),
      'quando o activeOrderId estiver orfao, fluxo deve cair na criacao de nova comanda',
    );
    assert.ok(
      !content.includes('Pedido ativo da mesa nao encontrado'),
      'garcom nao deve ser bloqueado por activeOrderId antigo de mesa livre',
    );
  });

  test('Confirmacao da comanda nao deve citar cozinha no plano base', () => {
    const content = readSrc('components/ComandaConfirmacao.tsx');

    assert.ok(
      content.includes('Concluir lançamento'),
      'botao principal deve falar em concluir lancamento',
    );
    assert.ok(
      content.includes('Lançamento concluído'),
      'mensagem de sucesso deve confirmar o registro da comanda',
    );
    assert.ok(
      !content.includes('Cozinha') && !content.includes('cozinha'),
      'cliente sem modulo cozinha nao deve ver textos de envio para cozinha',
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

  test('Realtime do garcom deve usar nomes de canal seguros para Supabase', () => {
    const tableService = readSrc('services/tablesSupabaseService.ts');
    const orderService = readSrc('services/ordersSupabaseService.ts');

    assert.ok(
      tableService.includes('toRealtimeChannelName') && orderService.includes('toRealtimeChannelName'),
      'services de mesas e pedidos devem sanitizar o nome do canal Realtime',
    );
    assert.ok(
      !tableService.includes('restaurant_tables:${tenantId}') &&
      !orderService.includes('restaurant_orders:${tenantId}'),
      'canais Realtime nao devem usar ":" no topico enviado ao Supabase',
    );
    assert.ok(
      tableService.includes("replace(/[^a-zA-Z0-9_-]/g, '_')") &&
      orderService.includes("replace(/[^a-zA-Z0-9_-]/g, '_')"),
      'tenantId deve ser sanitizado antes de compor o topico do canal',
    );
    assert.ok(
      tableService.includes('Date.now()') && tableService.includes('Math.random()') &&
      orderService.includes('Date.now()') && orderService.includes('Math.random()'),
      'cada assinatura Realtime deve ter topico unico para evitar reuso de canal ja inscrito',
    );
  });

});
