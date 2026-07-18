import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const gastroDir = path.join(rootDir, 'gestao-gastro');

test('Inspect AppContext.tsx for closeCashier preserving snapshots', () => {
  const contextPath = path.join(gastroDir, 'src', 'store', 'AppContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');

  assert.match(content, /closedOrderIds:\s*closedOrders\.map/, 'Should save closedOrderIds in closeCashier');
  assert.match(content, /expenseIds:\s*expenses\.map/, 'Should save expenseIds in closeCashier');
  assert.match(content, /expensesSnapshot:\s*expenses/, 'Should save expensesSnapshot in closeCashier');
});

test('Inspect AppContext.tsx for zero-value table release feeding cashier closure', () => {
  const contextPath = path.join(gastroDir, 'src', 'store', 'AppContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');

  assert.match(content, /const closedWithoutPayment: Order/, 'clearTable should create a closed zero-value order when releasing an empty table');
  assert.match(content, /status:\s*'closed'/, 'released empty table order must be marked closed');
  assert.match(content, /payments:\s*\[\]/, 'released empty table order must have no payments');
  assert.match(content, /Mesa liberada sem consumo/, 'released empty table order must keep an operational note');
  assert.match(content, /ordersHook\.closeOrderLocal\(activeOrder\.id\)/, 'released empty table must leave open-order state immediately');
  assert.match(content, /closeOrder\(effectiveTenantId, activeOrder\.id/, 'released empty table must close the remote order instead of deleting it');
});

test('Logical emulation of cashier session closing with snapshots', () => {
  // Emulate AppContext closeCashier logic
  let cashierSession = {
    id: 'session-123',
    openedAt: '2026-07-13T10:00:00Z',
    initialBalance: 100,
    status: 'open'
  };
  
  let cashierHistory = [];
  
  let orders = [
    { id: 'order-1', status: 'closed', subtotal: 50, serviceCharge: 5, total: 55 },
    { id: 'order-2', status: 'closed', subtotal: 30, serviceCharge: 3, total: 33 },
    { id: 'order-3', status: 'open', subtotal: 20, serviceCharge: 0, total: 20 } // should be ignored as it is open
  ];
  
  let expenses = [
    { id: 'exp-1', description: 'Compra de limão', amount: 15, entryType: 'saida', category: 'Insumos', status: 'pago', timestamp: '2026-07-13T11:00:00Z' },
    { id: 'exp-2', description: 'Troco inicial', amount: 10, entryType: 'entrada', category: 'Outros', status: 'pago', timestamp: '2026-07-13T10:05:00Z' }
  ];

  const closeCashierEmulated = (tipsTotal, countedCash) => {
    if (!cashierSession) return;
    const closedOrders = orders.filter(o => o.status === 'closed');
    const salesTotal = closedOrders.reduce((acc, o) => acc + o.subtotal, 0);
    const serviceTaxTotal = closedOrders.reduce((acc, o) => acc + o.serviceCharge, 0);

    const expensesTotal = expenses.reduce((acc, e) => {
      return e.entryType === 'entrada' ? acc - e.amount : acc + e.amount;
    }, 0);

    const initialBalance = cashierSession.initialBalance || 0;
    const finalBalance = initialBalance + salesTotal + serviceTaxTotal - expensesTotal + tipsTotal;
    const cashBreakdown = countedCash !== undefined ? countedCash - finalBalance : undefined;

    const closedSession = {
      ...cashierSession,
      status: 'closed',
      closedAt: new Date().toISOString(),
      tipsTotal,
      salesTotal,
      serviceTaxTotal,
      expensesTotal,
      ordersCount: closedOrders.length,
      finalBalance,
      countedCash,
      cashBreakdown,
      closedOrderIds: closedOrders.map(o => o.id),
      expenseIds: expenses.map(e => e.id),
      expensesSnapshot: expenses,
    };
    
    cashierHistory.push(closedSession);
    cashierSession = null;
    orders = [];
    expenses = [];
  };

  closeCashierEmulated(10, 185);

  assert.equal(cashierHistory.length, 1);
  const session = cashierHistory[0];
  assert.equal(session.status, 'closed');
  assert.equal(session.ordersCount, 2);
  assert.deepEqual(session.closedOrderIds, ['order-1', 'order-2']);
  assert.deepEqual(session.expenseIds, ['exp-1', 'exp-2']);
  assert.equal(session.expensesSnapshot.length, 2);
  assert.equal(session.expensesSnapshot[0].description, 'Compra de limão');
  assert.equal(session.expensesTotal, 5); // 15 (saida) - 10 (entrada) = 5
  assert.equal(session.finalBalance, 193); // 100 + 80 (sales) + 8 (tax) - 5 (expenses) + 10 (tips) = 193
  assert.equal(session.cashBreakdown, -8); // 185 (counted) - 193 (finalBalance) = -8
  
  // Verify that active state is cleared
  assert.equal(cashierSession, null);
  assert.equal(orders.length, 0);
  assert.equal(expenses.length, 0);
});
