import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Dashboard, Caixa e Financeiro usam o total final efetivamente cobrado', () => {
  const dashboard = read('gestao-gastro/src/components/Dashboard.tsx');
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');
  const reports = read('gestao-gastro/src/components/Reports.tsx');
  const context = read('gestao-gastro/src/store/AppContext.tsx');
  const finance = read('gestao-gastro/src/utils/finance.ts');

  assert.match(dashboard, /acc \+ o\.total/);
  assert.match(finance, /order\.total - order\.serviceCharge/);
  assert.match(cashier, /getOrderNetRevenue\(order\)/);
  assert.match(reports, /getOrderNetRevenue\(order\)/);
  assert.match(reports, /acc \+ order\.total/);
  assert.match(context, /total: order\.total/);
  assert.doesNotMatch(context, /total: order\.subtotal \+ serviceCharge/);
});

test('DRE considera despesas operacionais, mas não sangrias ou suprimentos', () => {
  const reports = read('gestao-gastro/src/components/Reports.tsx');
  const finance = read('gestao-gastro/src/utils/finance.ts');

  assert.match(finance, /getCashMovementKind\(expense\) === 'despesa'/);
  assert.match(reports, /if \(!isOperatingExpense\(expense\)\) return false/);
  assert.match(reports, /movementKind: 'despesa'/);
});

test('histórico financeiro distingue impacto de movimentações e saldo financeiro', () => {
  const reports = read('gestao-gastro/src/components/Reports.tsx');

  assert.match(reports, /Impacto das movimentações/);
  assert.match(reports, /Saldo financeiro/);
  assert.match(reports, /Math\.abs\(session\.expensesTotal\)/);
});
