import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(
  new URL('../gestao-gastro/src/components/ComandaMesaResumo.tsx', import.meta.url),
  'utf8',
);

test('Comanda permite conferir o pre-fechamento sem encerrar o pedido', () => {
  assert.match(source, /Conferir pré-fechamento/);
  assert.match(source, /Esta conferência não fecha a comanda/);
  assert.match(source, /Taxa, descontos e pagamento final devem ser confirmados no Caixa/);
  assert.doesNotMatch(source, /closeOrder|onCloseOrder|finalizeOrder/);
});

test('Pre-fechamento apresenta saldo, pagamentos parciais e divisao estimada', () => {
  assert.match(source, /partialPaymentsTotal/);
  assert.match(source, /remainingTotal/);
  assert.match(source, /Pagamentos já registrados/);
  assert.match(source, /Saldo parcial/);
  assert.match(source, /por pessoa/);
});

test('Pre-fechamento possui controle expansivel acessivel e alvo de toque adequado', () => {
  assert.match(source, /aria-expanded=\{showPreClose\}/);
  assert.match(source, /aria-controls=\{`pre-fechamento-mesa-/);
  assert.match(source, /aria-label=\{`Pré-fechamento da mesa/);
  assert.match(source, /min-h-11/);
});
