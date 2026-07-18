import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Estoque oferece diagnóstico acionável de saldo e validade', () => {
  const source = read('gestao-gastro/src/components/Stock.tsx');

  assert.ok(source.includes("type StockDiagnosticFilter = 'all' | 'critical' | 'expired' | 'expiring' | 'healthy'"));
  assert.ok(source.includes('getDaysUntilExpiry'));
  assert.ok(source.includes('Estoque crítico'));
  assert.ok(source.includes('Validade vencida'));
  assert.ok(source.includes('Vence em 7 dias'));
  assert.ok(source.includes('aria-pressed={diagnosticFilter === diagnostic.id}'));
});

test('registro de perda é guiado e impede baixa superior ao saldo', () => {
  const source = read('gestao-gastro/src/components/Stock.tsx');

  assert.ok(source.includes('LOSS_REASONS'));
  assert.ok(source.includes('lossData.quantity > si.currentStock'));
  assert.ok(source.includes("title: 'Quantidade acima do saldo'"));
  assert.ok(source.includes('max={selectedLossItem?.currentStock}'));
  assert.ok(source.includes('disabled={lossData.quantity <= 0 || lossExceedsStock}'));
  assert.ok(source.includes('A confirmação reduzirá o saldo para'));
  assert.ok(source.includes('Impacto: R$'));
});

test('histórico distingue baixas do PDV e vincula a venda ao pedido', () => {
  const stock = read('gestao-gastro/src/components/Stock.tsx');
  const context = read('gestao-gastro/src/store/AppContext.tsx');

  assert.ok(stock.includes("movement.reason?.startsWith('Venda -')"));
  assert.ok(stock.includes("{ id: 'sales', label: 'Baixas por venda' }"));
  assert.ok(stock.includes('Gerada pelo PDV'));
  assert.ok(context.includes('· Pedido ${order.id}'));
});

test('ações de estoque permanecem acessíveis em telas sem hover', () => {
  const source = read('gestao-gastro/src/components/Stock.tsx');

  assert.ok(source.includes('opacity-100 md:opacity-0 md:group-hover:opacity-100'));
  assert.ok(source.includes('aria-label={`Registrar perda de ${si.name}`}'));
  assert.ok(source.includes('aria-label={`Adicionar entrada de ${si.name}`}'));
});
