import assert from 'node:assert/strict';
import test from 'node:test';
import type { Order, Table } from '../gestao-gastro/src/types';
import {
  canReleaseTable,
  findComandaWithConsumption,
  getComandaDisplayLabel,
  listOpenComandasForTable,
  reconcileTablesWithOpenComandas,
  resolveOfflineComandaTarget,
  resolveSelectedComandaId,
} from '../gestao-gastro/src/utils/multipleComandas';

const order = (overrides: Partial<Order>): Order => ({
  id: 'order-default',
  mode: 'mesa',
  tableNumber: 1,
  items: [],
  subtotal: 0,
  serviceCharge: 0,
  total: 0,
  payments: [],
  status: 'open',
  waiterId: 'waiter-1',
  timestamp: '2026-07-18T12:00:00.000Z',
  ...overrides,
});

const table = (overrides: Partial<Table> = {}): Table => ({
  number: 1,
  status: 'livre',
  ...overrides,
});

test('groups only open table checks and sorts by database creation time', () => {
  const result = listOpenComandasForTable([
    order({ id: 'second', createdAt: '2026-07-18T12:02:00.000Z' }),
    order({ id: 'closed', status: 'closed' }),
    order({ id: 'counter', mode: 'balcao' }),
    order({ id: 'other-table', tableNumber: 2 }),
    order({ id: 'first', createdAt: '2026-07-18T12:01:00.000Z' }),
  ], 1);

  assert.deepEqual(result.map(item => item.id), ['first', 'second']);
});

test('uses persisted label, customer fallback and deterministic generic labels', () => {
  assert.equal(getComandaDisplayLabel(order({ comandaLabel: ' Comanda 45 ' })), 'Comanda 45');
  assert.equal(getComandaDisplayLabel(order({ customerName: ' Maria ' })), 'Maria');
  assert.equal(getComandaDisplayLabel(order({}), 0), 'Comanda Geral');
  assert.equal(getComandaDisplayLabel(order({}), 2), 'Comanda 3');
});

test('keeps a table occupied until its last open check is removed', () => {
  const openOrders = [
    order({ id: 'oldest', createdAt: '2026-07-18T12:01:00.000Z' }),
    order({ id: 'newest', createdAt: '2026-07-18T12:02:00.000Z' }),
  ];

  const [occupied] = reconcileTablesWithOpenComandas([table()], openOrders);
  assert.equal(occupied.status, 'ocupada');
  assert.equal(occupied.activeOrderId, 'oldest');
  assert.equal(canReleaseTable(openOrders, 1), false);

  const [stillOccupied] = reconcileTablesWithOpenComandas([occupied], [openOrders[1]]);
  assert.equal(stillOccupied.status, 'ocupada');
  assert.equal(stillOccupied.activeOrderId, 'newest');

  const [released] = reconcileTablesWithOpenComandas([stillOccupied], []);
  assert.equal(released.status, 'livre');
  assert.equal(released.activeOrderId, undefined);
  assert.equal(canReleaseTable([], 1), true);
});

test('preserves waiting and reserved operational states safely', () => {
  const [waiting] = reconcileTablesWithOpenComandas(
    [table({ status: 'aguardando', activeOrderId: 'order-default' })],
    [order({})],
  );
  assert.equal(waiting.status, 'aguardando');

  const [reserved] = reconcileTablesWithOpenComandas(
    [table({ status: 'reservada', reservationReason: 'Aniversario' })],
    [],
  );
  assert.equal(reserved.status, 'reservada');
  assert.equal(reserved.reservationReason, 'Aniversario');
});

test('targets the explicitly selected remote check in the offline queue', () => {
  assert.deepEqual(resolveOfflineComandaTarget({
    isBalcao: false,
    queueId: 'queue-1',
    selectedComanda: { id: 'secondary-order', comandaLabel: 'Maria' },
    tableActiveOrderId: 'general-order',
  }), {
    existingOrderId: 'secondary-order',
    targetOrderId: 'secondary-order',
    comandaLabel: 'Maria',
    offlineIdKey: undefined,
    isNewComanda: false,
  });
});

test('keeps a stable idempotency key for a new offline check', () => {
  assert.deepEqual(resolveOfflineComandaTarget({
    isBalcao: false,
    queueId: 'queue-retry-key',
    selectedComanda: {
      id: 'local_comanda_device-key',
      comandaLabel: 'Comanda 14',
      offlineIdKey: 'device-key',
    },
    tableActiveOrderId: 'general-order',
  }), {
    existingOrderId: undefined,
    targetOrderId: 'local_comanda_device-key',
    comandaLabel: 'Comanda 14',
    offlineIdKey: 'device-key',
    isNewComanda: true,
  });
});

test('creates the first offline table check with a deterministic fallback label', () => {
  assert.deepEqual(resolveOfflineComandaTarget({
    isBalcao: false,
    queueId: 'first-check-key',
  }), {
    existingOrderId: undefined,
    targetOrderId: undefined,
    comandaLabel: 'Comanda Geral',
    offlineIdKey: 'first-check-key',
    isNewComanda: true,
  });
});

test('keeps counter orders outside table check targeting', () => {
  assert.deepEqual(resolveOfflineComandaTarget({
    isBalcao: true,
    queueId: 'counter-key',
    tableActiveOrderId: 'general-order',
  }), { isNewComanda: false });
});

test('selects the requested check for transfer before the compatibility anchor', () => {
  assert.equal(
    resolveSelectedComandaId(
      { id: 'secondary-order' },
      { activeOrderId: 'fresh-general-order' },
      { activeOrderId: 'stale-general-order' },
    ),
    'secondary-order',
  );
});

test('blocks table release when any open check has consumption', () => {
  const checks = [
    order({ id: 'empty' }),
    order({ id: 'consumed', items: [{
      id: 'item-1',
      product: { id: 'product-1', name: 'Produto', description: '', category: 'Categoria', price: 10, active: true },
      quantity: 1,
      price: 10,
    }], subtotal: 10, total: 10 }),
  ];

  assert.equal(findComandaWithConsumption(checks, 1)?.id, 'consumed');
});
