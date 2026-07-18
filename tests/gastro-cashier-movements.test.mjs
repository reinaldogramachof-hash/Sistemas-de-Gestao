import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('caixa diferencia suprimento, sangria e despesa sem quebrar dados antigos', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');
  const types = read('gestao-gastro/src/types.ts');

  assert.match(types, /movementKind\?: 'suprimento' \| 'sangria' \| 'despesa'/);
  assert.match(cashier, /expense\.movementKind/);
  assert.match(cashier, /expense\.entryType === 'entrada' \? 'suprimento' : 'sangria'/);
  assert.match(cashier, /movementKind === 'suprimento' \? 'entrada' : 'saida'/);
});

test('resumo calcula entradas e saídas separadamente e explica o saldo', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');

  assert.match(cashier, /const suppliesTotal =/);
  assert.match(cashier, /const withdrawalsTotal =/);
  assert.match(cashier, /const operatingExpensesTotal =/);
  assert.match(cashier, /suppliesTotal - cashOutTotal/);
  assert.match(cashier, /Adiciona dinheiro para troco e aumenta o saldo esperado/);
  assert.match(cashier, /Retira dinheiro da gaveta e reduz o saldo esperado/);
  assert.match(cashier, /gasto operacional pago pelo caixa e reduz o saldo esperado/);
});

test('formulário de movimentação possui seleção e erros acessíveis', () => {
  const cashier = read('gestao-gastro/src/components/Cashier.tsx');

  assert.match(cashier, /aria-label="Tipo da movimentação"/);
  assert.match(cashier, /aria-pressed=\{movementKind === kind\}/);
  assert.match(cashier, /inputMode="decimal"/);
  assert.match(cashier, /role="alert"/);
  assert.match(cashier, /Informe uma descrição e um valor maior que zero/);
});
