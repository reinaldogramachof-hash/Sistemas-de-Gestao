import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('abertura do caixa identifica operador, horário e fundo inicial', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');
  const context = read('gestao-gastro/src/store/AppContext.tsx');
  const types = read('gestao-gastro/src/types.ts');

  assert.match(cashier, /1\. Operador responsável/);
  assert.match(cashier, /2\. Data e hora do turno/);
  assert.match(cashier, /3\. Fundo inicial da gaveta/);
  assert.match(cashier, /openCashier\(val, \{ id: currentUser\.id, name: currentUser\.name \}\)/);
  assert.match(context, /openedByUserId: operator\?\.id/);
  assert.match(context, /openedByName: operator\?\.name/);
  assert.match(types, /openedByUserId\?: string/);
  assert.match(types, /openedByName\?: string/);
});

test('abertura rejeita valor inválido e explica o fundo inicial', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');

  assert.match(cashier, /Number\.isFinite\(val\) \|\| val < 0/);
  assert.match(cashier, /igual ou maior que zero/);
  assert.match(cashier, /não é receita de venda/);
  assert.match(cashier, /role="alert"/);
  assert.match(cashier, /aria-invalid=\{Boolean\(openingError\)\}/);
  assert.match(cashier, /inputMode="decimal"/);
});

test('turno aberto preserva e exibe o responsável pela abertura', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');

  assert.match(cashier, /Turno aberto por/);
  assert.match(cashier, /cashierSession\.openedByName/);
  assert.match(cashier, /Operador: \$\{cashierSession\.openedByName/);
});
