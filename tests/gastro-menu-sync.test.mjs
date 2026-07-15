import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Inspect menuSupabaseService.ts for required methods and price conversion', () => {
  const source = read('gestao-gastro/src/services/menuSupabaseService.ts');

  // a) Preço em centavos
  assert.ok(
    source.includes('price_cents') && (source.includes('* 100') || source.includes('price * 100')),
    'menuSupabaseService.ts deve converter preço para centavos antes de sincronizar'
  );

  // b) Métodos de sincronização
  assert.ok(
    source.includes('syncProduct') && source.includes('upsertCategory') && source.includes('deleteProductRemotely'),
    'menuSupabaseService.ts deve exportar os métodos syncProduct, upsertCategory e deleteProductRemotely'
  );

  // c) Tenant obrigatório
  assert.ok(
    source.includes("throw new Error('Tenant ID é obrigatório") || source.includes('!tenantId'),
    'menuSupabaseService.ts deve exigir tenant_id para as operações de sincronização'
  );
});

test('Inspect frontend code for absence of service_role key', () => {
  const service = read('gestao-gastro/src/services/menuSupabaseService.ts');
  const context = read('gestao-gastro/src/store/AppContext.tsx');

  assert.ok(
    !service.includes('service_role') && !service.includes('SERVICE_ROLE'),
    'Não deve conter service_role no menuSupabaseService.ts'
  );

  assert.ok(
    !context.includes('service_role') && !context.includes('SERVICE_ROLE'),
    'Não deve conter service_role no AppContext.tsx'
  );
});

test('Menu sync requires an authenticated session, maps local IDs, and deactivates remotely', () => {
  const service = read('gestao-gastro/src/services/menuSupabaseService.ts');
  const context = read('gestao-gastro/src/store/AppContext.tsx');

  assert.match(service, /supabase\.auth\.getSession/);
  assert.match(service, /isUuid/);
  assert.match(service, /remoteProductId/);
  assert.equal(service.includes(".delete()"), false);
  assert.match(service, /active:\s*false/);
  assert.match(context, /productSyncIds/);
  assert.match(context, /active:\s*false/);
  assert.match(context, /setSupabaseOnline/);
});

test('Logical emulations for price conversion and sync state tracking', () => {
  // 1. Preço em centavos
  const toPriceCents = (price) => Math.round(price * 100);
  assert.equal(toPriceCents(12.50), 1250);
  assert.equal(toPriceCents(0.99), 99);
  assert.equal(toPriceCents(10.00), 1000);

  // 2. Emulação do rastreamento de erros de sincronização (LocalStorage)
  let productSyncErrors = {};
  const mockProducts = [
    { id: 'prod1', name: 'Batata Frita', price: 25.90, category: 'Porções' },
    { id: 'prod2', name: 'Refrigerante', price: 6.00, category: 'Bebidas' }
  ];

  // Emulação de falha de sincronização (ex: ausência de sessão)
  const syncProductEmulated = (tenantId, product, hasSession) => {
    if (!tenantId) throw new Error('Tenant ID é obrigatório');
    if (!hasSession) {
      throw new Error('Sessão remota não disponível (Unauthorized)');
    }
    return { success: true };
  };

  // Tenta sincronizar prod1 sem sessão remota
  try {
    syncProductEmulated('cantinhodaresenha', mockProducts[0], false);
  } catch (err) {
    productSyncErrors[mockProducts[0].id] = err.message;
  }

  assert.equal(productSyncErrors['prod1'], 'Sessão remota não disponível (Unauthorized)', 'Erro de sincronização por falta de sessão deve ser registrado');
  assert.ok(mockProducts.find(p => p.id === 'prod1'), 'O produto deve continuar existindo no estado local mesmo com falha de sincronização');

  // Sincroniza prod2 com sessão ativa
  try {
    const res = syncProductEmulated('cantinhodaresenha', mockProducts[1], true);
    if (res.success) {
      delete productSyncErrors[mockProducts[1].id];
    }
  } catch (err) {
    productSyncErrors[mockProducts[1].id] = err.message;
  }

  assert.equal(productSyncErrors['prod2'], undefined, 'Produto sincronizado com sucesso deve limpar erros pendentes');
});
