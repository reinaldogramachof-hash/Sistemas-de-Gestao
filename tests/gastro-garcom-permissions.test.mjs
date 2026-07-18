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
    assert.ok(
      content.includes('getOfflineQueueKey') && content.includes('waiterSession.waiterId'),
      'fila offline deve ser isolada por tenant e garcom',
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

  test('clientRoutes deve mapear Cantinho para tenant ativo e limpar tenant legado', () => {
    const content = readSrc('config/clientRoutes.ts');
    assert.ok(content.includes('cantinhodaresenha'), 'clientRoutes deve conter o slug publico do cliente');
    assert.ok(content.includes('cantinho-da-resenha'), 'clientRoutes deve aceitar o slug gerado pelo painel admin');
    assert.ok(
      content.includes('4c628b1b-a1ce-498e-b302-0344a81de4cb'),
      'clientRoutes deve resolver o Cantinho para o tenant SaaS ativo',
    );
    assert.ok(
      content.includes('RETIRED_TENANT_IDS') && content.includes('removeItem'),
      'clientRoutes deve descartar tenant antigo salvo no navegador',
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
    const api = readFileSync(join(process.cwd(), 'api_admin_users.php'), 'utf-8');

    assert.ok(
      content.includes("action: 'validate_member_access'") && (content.includes("required_role: 'waiter'") || content.includes("required_role: 'team'")),
      'rota externa deve validar permissao por endpoint protegido em vez de depender de leitura direta por RLS',
    );
    assert.ok(
      content.includes('display_name'),
      'nome exibido no modulo externo deve vir do tenant_members quando disponivel',
    );
    assert.ok(
      content.includes('Promise<boolean>') && content.includes('throw new Error'),
      'falha de permissao deve voltar para o login sem deixar spinner travado',
    );
    assert.ok(
      api.includes("if ($action === 'validate_member_access')") && api.includes('get_member_role($adminUserId, $tenantId)'),
      'api_admin_users deve validar o proprio membro autenticado pelo JWT antes de liberar a comanda',
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

  test('ComandaMobile deve persistir observacao geral e prevenir duplo envio', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    const confirmacao = readSrc('components/ComandaConfirmacao.tsx');
    const ordersService = readSrc('services/ordersSupabaseService.ts');
    const migration = readFileSync(join(process.cwd(), 'gestao-gastro', 'supabase', 'migrations', '20260717_restaurant_orders_general_observation.sql'), 'utf-8');

    assert.ok(content.includes('generalObservation'), 'fluxo do garcom deve carregar observacao geral');
    assert.ok(content.includes('isSubmitting'), 'confirmacao deve bloquear duplo envio');
    assert.ok(content.includes('updateOrderMeta'), 'observacao geral deve ser atualizada ao adicionar itens em comanda existente');
    assert.ok(content.includes('customerName') && content.includes('adultCount') && content.includes('childrenCount'), 'fluxo do garcom deve coletar cliente, adultos e criancas');
    assert.ok(content.includes('customerCount: adultCount + childrenCount'), 'pedido do garcom deve gravar total de pessoas');
    assert.ok(confirmacao.includes('Nome do cliente') && confirmacao.includes('Adultos') && confirmacao.includes('Criancas'), 'confirmacao deve exibir dados do cliente e pessoas');
    assert.ok(ordersService.includes('customer_name') && ordersService.includes('adult_count') && ordersService.includes('children_count'), 'servico de pedidos deve mapear cliente e contagem de pessoas');
    assert.ok(ordersService.includes('general_observation'), 'servico de pedidos deve mapear coluna general_observation');
    assert.ok(migration.includes('ADD COLUMN IF NOT EXISTS general_observation'), 'schema deve adicionar coluna de observacao geral');
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

  test('ComandaMobile deve retomar sincronizacao offline sem duplicar comandas', () => {
    const content = readSrc('components/ComandaMobile.tsx');

    assert.ok(
      content.includes("syncStage?: 'items' | 'metadata' | 'table'") && content.includes('remoteOrderId?: string'),
      'fila deve persistir a etapa concluida e o pedido remoto criado',
    );
    assert.match(
      content,
      /pendingItem = \{ \.\.\.pendingItem, remoteOrderId: createdOrder\.id, syncStage: 'table' \}[\s\S]*setTableOccupied/,
      'pedido criado deve ser preservado antes de tentar vincular a mesa',
    );
    assert.ok(
      content.includes('lastError: getOfflineSyncError(error)') && content.includes('formatLastSync(lastSyncAt)'),
      'falha e ultima sincronizacao devem ficar visiveis ao garcom',
    );
    assert.ok(
      content.includes('autoSyncAttemptedRef.current') && content.includes('if (!isOnline)'),
      'reconexao deve tentar automaticamente uma vez sem entrar em loop de reenvio',
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

  test('ComandaMobile deve permitir liberar mesa orfa e transferir comanda para mesa livre', () => {
    const content = readSrc('components/ComandaMobile.tsx');
    const resumo = readSrc('components/ComandaMesaResumo.tsx');
    const orderModal = readSrc('components/OrderModal.tsx');
    const tableService = readSrc('services/tablesSupabaseService.ts');
    const orderService = readSrc('services/ordersSupabaseService.ts');

    assert.ok(content.includes('handleReleaseSelectedTable') && content.includes('clearTable(tenantId, selectedTable.number)'), 'garcom deve conseguir liberar mesa sem comanda aberta');
    assert.ok(content.includes('const [freshTables, freshOrders] = await Promise.all'), 'liberacao e transferencia devem revalidar mesas e pedidos antes de agir');
    assert.ok(content.includes('closeOrder(tenantId, activeOrder.id') && content.includes('Mesa liberada sem consumo pelo garcom'), 'comanda vazia deve ser fechada com valor zero ao liberar mesa sem consumo');
    assert.ok(content.includes('Esta mesa possui consumo lancado'), 'mesa com consumo lancado nao deve ser liberada pelo garcom');
    assert.ok(content.includes('handleTransferSelectedTable') && content.includes('updateTable(tenantId, targetTableNumber'), 'garcom deve conseguir transferir comanda para mesa livre');
    assert.ok(content.includes("targetTable.status !== 'livre'") && content.includes('targetTable.activeOrderId'), 'transferencia deve revalidar que a mesa destino segue livre');
    assert.ok(content.includes('updateOrderMeta(tenantId, activeOrder.id, { tableNumber: targetTableNumber })'), 'transferencia deve atualizar tableNumber do pedido');
    assert.ok(resumo.includes('Liberar mesa') && resumo.includes('Trocar de mesa'), 'resumo da mesa deve exibir acoes operacionais esperadas');
    assert.ok(resumo.includes('Nome do cliente') && resumo.includes('onUpdateCustomerName'), 'resumo mobile deve permitir nomear cliente antes de lancar itens');
    assert.ok(orderModal.includes('Liberar mesa sem consumo') && orderModal.includes('activeOrderHasConsumption'), 'desktop deve liberar mesa vazia sem expor risco para mesa com consumo');
    assert.ok(tableService.includes('activeOrderId?: string | null') && tableService.includes('active_order_id = data.activeOrderId ?? null'), 'clearTable deve conseguir gravar null em active_order_id');
    assert.ok(orderService.includes('payload.table_number = data.tableNumber'), 'orders service deve permitir atualizar table_number na troca de mesa');
    assert.ok(orderService.includes('export async function closeOrder'), 'orders service deve permitir fechar comanda vazia ao liberar mesa sem consumo');
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
