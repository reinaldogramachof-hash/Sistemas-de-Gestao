import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('conferência da gaveta considera somente pagamentos em dinheiro', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');

  assert.match(cashier, /const cashPaymentsTotal = paymentTotals\.Dinheiro \|\| 0/);
  assert.match(cashier, /initialBalance \+ cashPaymentsTotal \+ suppliesTotal - cashOutTotal \+ validTips/);
  assert.match(cashier, /PIX e cartão aparecem no resumo financeiro, mas não entram na contagem da gaveta/);
  assert.doesNotMatch(cashier, /parsedCountedCash - operationalBalance/);
});

test('fechamento preserva saldo financeiro e grava dinheiro esperado separadamente', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');
  const context = read('gestao-gastro/src/store/AppContext.tsx');
  const types = read('gestao-gastro/src/types.ts');

  assert.match(cashier, /closeCashier\(parsedTips, parsedCountedCash, expectedCashBalance\)/);
  assert.match(context, /countedCash - \(expectedCashBalance \?\? finalBalance\)/);
  assert.match(context, /expectedCashBalance,/);
  assert.match(types, /expectedCashBalance\?: number/);
});

test('encerramento valida valores e informa a diferença com acessibilidade', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');

  assert.match(cashier, /Informe valores válidos, iguais ou maiores que zero/);
  assert.match(cashier, /Math\.abs\(cashDifference\) < 0\.01/);
  assert.match(cashier, /role="alert"/);
  assert.match(cashier, /aria-describedby="cashier-closing-help cashier-closing-error"/);
  assert.match(cashier, /Dinheiro contado na gaveta \(opcional\)/);
});
