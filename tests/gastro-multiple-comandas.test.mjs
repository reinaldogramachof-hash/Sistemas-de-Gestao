import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migrationPath = join(
  root,
  'gestao-gastro',
  'supabase',
  'migrations',
  '20260718201532_gastro_multiple_comandas.sql',
);
const migration = readFileSync(migrationPath, 'utf8');
const orderTypes = readFileSync(join(root, 'gestao-gastro', 'src', 'types.ts'), 'utf8');
const orderService = readFileSync(
  join(root, 'gestao-gastro', 'src', 'services', 'ordersSupabaseService.ts'),
  'utf8',
);
const tableService = readFileSync(
  join(root, 'gestao-gastro', 'src', 'services', 'tablesSupabaseService.ts'),
  'utf8',
);
const selectorComponent = readFileSync(
  join(root, 'gestao-gastro', 'src', 'components', 'ComandaMesaSelector.tsx'),
  'utf8',
);
const waiterTableGrid = readFileSync(
  join(root, 'gestao-gastro', 'src', 'components', 'ComandaMesaGrid.tsx'),
  'utf8',
);
const desktopTables = readFileSync(
  join(root, 'gestao-gastro', 'src', 'components', 'Tables.tsx'),
  'utf8',
);
const mobileComanda = readFileSync(
  join(root, 'gestao-gastro', 'src', 'components', 'ComandaMobile.tsx'),
  'utf8',
);
const appContext = readFileSync(
  join(root, 'gestao-gastro', 'src', 'store', 'AppContext.tsx'),
  'utf8',
);

const functionBody = (name) => {
  const match = migration.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,
      'i',
    ),
  );

  assert.ok(match, `migration must define ${name}`);
  return match[0];
};

test('migration adds dedicated labels and offline idempotency keys', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS comanda_label varchar\(80\)/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS offline_id_key text/i);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS restaurant_orders_open_comanda_label_key[\s\S]*lower\(btrim\(comanda_label\)\)[\s\S]*status = 'open'/i,
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS restaurant_orders_offline_id_key_key[\s\S]*\(tenant_id, offline_id_key\)[\s\S]*WHERE offline_id_key IS NOT NULL/i,
  );
});

test('existing open table orders receive deterministic labels', () => {
  assert.match(
    migration,
    /row_number\(\) OVER \([\s\S]*PARTITION BY tenant_id, table_number[\s\S]*ORDER BY created_at, id/i,
  );
  assert.match(migration, /WHEN ranked\.position = 1 THEN 'Comanda Geral'/i);
  assert.match(migration, /ELSE 'Comanda ' \|\| ranked\.position::text/i);
});

test('create RPC is idempotent and preserves the oldest order as compatibility anchor', () => {
  const body = functionBody('gastro_create_comanda_rpc');

  assert.match(body, /SECURITY INVOKER/i);
  assert.doesNotMatch(body, /SECURITY DEFINER/i);
  assert.match(body, /FROM public\.restaurant_tables[\s\S]*FOR UPDATE/i);
  assert.match(
    body,
    /ON CONFLICT \(tenant_id, offline_id_key\)[\s\S]*WHERE offline_id_key IS NOT NULL[\s\S]*DO NOTHING/i,
  );
  assert.match(
    body,
    /AND status = 'open'[\s\S]*ORDER BY created_at, id[\s\S]*LIMIT 1/i,
  );
  assert.match(body, /SET status = 'ocupada',[\s\S]*active_order_id = v_table\.active_order_id/i);
});

test('close RPC only releases a table after its last open check', () => {
  const body = functionBody('gastro_close_comanda_rpc');

  assert.match(body, /SECURITY INVOKER/i);
  assert.match(body, /AND status = 'open'[\s\S]*RETURNING \* INTO v_order/i);
  assert.match(
    body,
    /SELECT id[\s\S]*AND table_number = v_order\.table_number[\s\S]*AND status = 'open'[\s\S]*ORDER BY created_at, id/i,
  );
  assert.match(
    body,
    /SET status = CASE WHEN v_next_order_id IS NULL THEN 'livre' ELSE 'ocupada' END,[\s\S]*active_order_id = v_next_order_id/i,
  );
});

test('transfer RPC moves one check and reconciles both table states', () => {
  const body = functionBody('gastro_transfer_comanda_rpc');

  assert.match(body, /number IN \(v_source_table_number, p_target_table_number\)[\s\S]*ORDER BY number[\s\S]*FOR UPDATE/i);
  assert.match(body, /v_target_table\.status <> 'livre'/i);
  assert.match(body, /SET table_number = p_target_table_number/i);
  assert.match(
    body,
    /SET status = CASE WHEN v_source_active_order_id IS NULL THEN 'livre' ELSE 'ocupada' END/i,
  );
  assert.match(
    body,
    /SET status = 'ocupada',[\s\S]*active_order_id = v_order\.id/i,
  );
});

test('release RPC refuses to clear tables with any open check', () => {
  const body = functionBody('gastro_release_table_rpc');

  assert.match(body, /FROM public\.restaurant_tables[\s\S]*FOR UPDATE/i);
  assert.match(
    body,
    /IF EXISTS \([\s\S]*table_number = p_table_number[\s\S]*status = 'open'[\s\S]*RAISE EXCEPTION 'Mesa possui comandas abertas'/i,
  );
});

test('all public RPCs are restricted to authenticated callers and service role', () => {
  for (const name of [
    'gastro_create_comanda_rpc',
    'gastro_close_comanda_rpc',
    'gastro_transfer_comanda_rpc',
    'gastro_release_table_rpc',
  ]) {
    assert.match(
      migration,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([\\s\\S]*?FROM PUBLIC, anon;`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([\\s\\S]*?TO authenticated, service_role;`, 'i'),
    );
  }
});

test('frontend order contract exposes check label and offline idempotency key', () => {
  assert.match(orderTypes, /comandaLabel\?: string;/);
  assert.match(orderTypes, /offlineIdKey\?: string;/);
  assert.match(orderService, /comanda_label: string \| null;/);
  assert.match(orderService, /offline_id_key: string \| null;/);
  assert.match(orderService, /comandaLabel: row\.comanda_label \?\? undefined/);
  assert.match(orderService, /offlineIdKey: row\.offline_id_key \?\? undefined/);
});

test('frontend services expose atomic RPC operations without security definer shortcuts', () => {
  assert.match(orderService, /export async function createComanda\(/);
  assert.match(orderService, /\.rpc\('gastro_create_comanda_rpc'/);
  assert.match(orderService, /export async function closeComanda\(/);
  assert.match(orderService, /\.rpc\('gastro_close_comanda_rpc'/);
  assert.match(orderService, /export async function transferComanda\(/);
  assert.match(orderService, /\.rpc\('gastro_transfer_comanda_rpc'/);
  assert.match(tableService, /export async function releaseTableSafely\(/);
  assert.match(tableService, /\.rpc\('gastro_release_table_rpc'/);
});

test('mobile selector identifies, validates and opens individual table checks', () => {
  assert.match(selectorComponent, /getComandaDisplayLabel/);
  assert.match(selectorComponent, /onSelect: \(order: Order\) => void/);
  assert.match(selectorComponent, /onCreate: \(label: string\)/);
  assert.match(selectorComponent, /maxLength=\{80\}/);
  assert.match(selectorComponent, /Já existe uma comanda aberta com esse identificador/);
  assert.match(selectorComponent, /Cada conta é fechada separadamente no Caixa/);
  assert.match(selectorComponent, /Sem conexão: a nova comanda será enviada/);
});

test('waiter and desktop grids aggregate every open check instead of one active order', () => {
  for (const component of [waiterTableGrid, desktopTables]) {
    assert.match(component, /listOpenComandasForTable/);
    assert.match(component, /tableOrders\.length/);
    assert.match(component, /tableOrders\.reduce/);
    assert.match(component, /contas abertas/);
  }

  assert.doesNotMatch(waiterTableGrid, /new Map\([\s\S]*order\.tableNumber, order/);
});

test('AppContext exposes reconciled tables and routes table lifecycle through atomic RPC services', () => {
  assert.match(appContext, /const tables = localTables;/);
  assert.match(appContext, /createComandaSupabase\(effectiveTenantId/);
  assert.match(appContext, /closeComandaSupabase\(effectiveTenantId, order\.id/);
  assert.match(appContext, /transferComandaSupabase\(effectiveTenantId, orderId, toNumber\)/);
  assert.match(appContext, /openComandas\.some\(order =>/);
  assert.match(appContext, /await releaseTableSafely\(effectiveTenantId, number\)/);
  assert.doesNotMatch(appContext, /await clearTableSupabase\(effectiveTenantId, order\.tableNumber\)/);
});

test('mobile offline queue persists the selected check and a stable idempotency key', () => {
  for (const field of ['targetOrderId?: string', 'comandaLabel?: string', 'offlineIdKey?: string', 'isNewComanda?: boolean']) {
    assert.ok(mobileComanda.includes(field), `fila offline deve incluir ${field}`);
  }
  assert.match(mobileComanda, /resolveOfflineComandaTarget\(\{/);
  assert.match(mobileComanda, /selectedComanda,/);
  assert.match(mobileComanda, /tableActiveOrderId: selectedTable\?\.activeOrderId/);
});

test('mobile retry creates new offline table checks through the idempotent RPC', () => {
  assert.match(mobileComanda, /if \(item\.isNewComanda && item\.mode === 'mesa'\)/);
  assert.match(mobileComanda, /createComandaRpc\(tenantId, \{[\s\S]*offlineIdKey: item\.offlineIdKey/);
  assert.match(mobileComanda, /comandaLabel: item\.comandaLabel\?\.trim\(\) \|\| 'Comanda Geral'/);
});

test('mobile transfer prioritizes the selected check and uses the atomic transfer RPC', () => {
  assert.match(mobileComanda, /resolveSelectedComandaId\(selectedComanda, currentTable, selectedTable\)/);
  assert.match(mobileComanda, /await transferComanda\(tenantId, activeOrder\.id, targetTableNumber\)/);
  assert.doesNotMatch(mobileComanda, /updateOrderMeta\(tenantId, activeOrder\.id, \{ tableNumber: targetTableNumber \}\)/);
});

test('mobile release checks every open account before closing and releasing the table', () => {
  assert.match(mobileComanda, /const tableComandas = listOpenComandasForTable\(freshOrders, selectedTable\.number\)/);
  assert.match(mobileComanda, /findComandaWithConsumption\(freshOrders, selectedTable\.number\)/);
  assert.match(mobileComanda, /for \(const comanda of tableComandas\)/);
  assert.match(mobileComanda, /await closeComanda\(tenantId, comanda\.id/);
  assert.match(mobileComanda, /await releaseTableSafely\(tenantId, selectedTable\.number\)/);
});

test('first online table order also uses the multiple-check RPC instead of legacy table mutation', () => {
  assert.match(mobileComanda, /: await createComandaRpc\(tenantId, \{/);
  assert.match(mobileComanda, /offlineIdKey: selectedComanda\?\.offlineIdKey \?\? createOfflineIdKey\(\)/);
  assert.doesNotMatch(mobileComanda, /await setTableOccupied\(tenantId, selectedTable\.number, createdOrder\.id\)/);
});
