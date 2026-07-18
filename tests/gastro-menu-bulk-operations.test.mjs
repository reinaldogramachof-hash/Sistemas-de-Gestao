import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Cardápio oferece diagnóstico por disponibilidade, ficha e sincronização', () => {
  const products = read('gestao-gastro/src/components/Products.tsx');

  assert.match(products, /type ProductStatusFilter = 'todos' \| 'ativos' \| 'inativos' \| 'ficha_pendente' \| 'sync_pendente'/);
  assert.match(products, /aria-label="Diagnóstico do Cardápio"/);
  assert.match(products, /productStatusCounts/);
  assert.match(products, /hasIncompleteRecipe/);
  assert.match(products, /Boolean\(productSyncErrors\[p\.id\]\)/);
});

test('Cardápio permite selecionar resultados e alterar disponibilidade em lote', () => {
  const products = read('gestao-gastro/src/components/Products.tsx');

  assert.match(products, /Selecionar resultados visíveis/);
  assert.match(products, /aria-label=\{`Selecionar \$\{p\.name\}`\}/);
  assert.match(products, /selectedProducts\.forEach\(product => updateProduct\(\{ \.\.\.product, active \}\)\)/);
  assert.match(products, /handleBulkAvailability\(true\)/);
  assert.match(products, /handleBulkAvailability\(false\)/);
});

test('Cardápio reenvia pendências selecionadas com resultado consolidado', () => {
  const products = read('gestao-gastro/src/components/Products.tsx');

  assert.match(products, /Promise\.allSettled\(pendingProducts\.map\(product => retrySyncProduct\(product\)\)\)/);
  assert.match(products, /Reenviar pendências/);
  assert.match(products, /Sincronização parcial/);
  assert.match(products, /clearSyncError\(product\.id\)/);
});
