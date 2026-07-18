import assert from 'node:assert/strict';
import test from 'node:test';
import type { Order, Table } from '../gestao-gastro/src/types';
import {
  canReleaseTable,
  getComandaDisplayLabel,
  listOpenComandasForTable,
  reconcileTablesWithOpenComandas,
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
