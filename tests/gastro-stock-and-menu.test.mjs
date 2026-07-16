import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Inspect Products.tsx for active field in form', () => {
  const source = read('gestao-gastro/src/components/Products.tsx');

  // a) Checkbox or active option is present in Products.tsx
  assert.ok(
    source.includes('name="active"') || source.includes('formData.get(\'active\')'),
    'Products.tsx deve conter o campo active no formulário'
  );
});

test('Inspect MenuList.tsx for active filter and dynamic stock logic', () => {
  const source = read('gestao-gastro/src/components/MenuList.tsx');

  // a) Filter out inactive products
  assert.ok(
    source.includes('active !== false') || source.includes('active === false') || source.includes('!p.active') || source.includes('p.active !== false'),
    'MenuList.tsx deve filtrar produtos inativos'
  );

  // b) dynamic stock checking is implemented
  assert.ok(
    source.includes('stockItems') && !source.includes('product.stock > 10 ?'),
    'MenuList.tsx deve calcular o estoque usando stockItems de forma dinâmica'
  );
});

test('Inspect MenuList.tsx for out-of-stock blocking', () => {
  const source = read('gestao-gastro/src/components/MenuList.tsx');

  // a) stockQty must be computed per product (not inside lazy IIFE for the whole card click)
  assert.ok(
    source.includes('isOutOfStock'),
    'MenuList.tsx deve definir isOutOfStock por produto'
  );

  // b) onSelect must be blocked when isOutOfStock
  assert.ok(
    source.includes('!isOutOfStock') || source.includes('isOutOfStock && '),
    'MenuList.tsx deve bloquear onSelect quando isOutOfStock'
  );

  // c) visual indicator: disabled or cursor-not-allowed or opacity
  assert.ok(
    source.includes('disabled') || source.includes('cursor-not-allowed'),
    'MenuList.tsx deve aplicar estado visual de indisponível quando sem estoque'
  );
});

test('Inspect PDV.tsx and MenuList.tsx for Ficha Incompleta logic', () => {
  const pdvSource = read('gestao-gastro/src/components/PDV.tsx');
  const menuSource = read('gestao-gastro/src/components/MenuList.tsx');

  assert.ok(
    pdvSource.includes('Ficha Técnica incompleta') || pdvSource.includes('Ficha Incompleta'),
    'PDV.tsx deve validar se a ficha está incompleta e bloquear a venda'
  );

  assert.ok(
    menuSource.includes('Ficha Incompleta') || menuSource.includes('Incompleta'),
    'MenuList.tsx deve exibir que a Ficha está Incompleta'
  );
});

test('Inspect Dashboard.tsx for stock alerts logic correction', () => {
  const source = read('gestao-gastro/src/components/Dashboard.tsx');

  // a) Verify lowStockProducts is replaced with stockItems filter
  assert.ok(
    source.includes('stockItems') && (source.includes('currentStock <= minStock') || source.includes('currentStock <= i.minStock')),
    'Dashboard.tsx deve usar stockItems ao invés de products para alertas de estoque crítico'
  );
});

test('Inspect AppContext.tsx for closeOrder double closure prevention and 0-stock limit', () => {
  const source = read('gestao-gastro/src/store/AppContext.tsx');

  // a) Prevent double close
  assert.ok(
    source.includes("status === 'closed'") && source.includes("localOrders.find(o => o.id === order.id)"),
    'AppContext.tsx deve conter checagem para evitar duplo fechamento e abate duplicado'
  );

  // b) Math.max(0, ...) limit
  assert.ok(
    source.includes('Math.max(0'),
    'AppContext.tsx deve limitar o estoque mínimo a zero no abate'
  );
});

test('Inspect OrderModal.tsx for normalized internal contract (balcao, no accent)', () => {
  const source = read('gestao-gastro/src/components/OrderModal.tsx');

  // a) Type definition must not use 'Balcão' as a union member
  assert.ok(
    !source.includes("'Balcão'"),
    "OrderModal.tsx não deve usar 'Balcão' com acento como contrato interno de tipo"
  );

  // b) Must use 'balcao' as the internal contract
  assert.ok(
    source.includes("'balcao'") || source.includes('"balcao"'),
    "OrderModal.tsx deve usar 'balcao' (sem acento) como contrato interno"
  );
});

test('Logical emulation unit tests', () => {
  // 1. Dynamic Stock calculation emulation
  const getProductStock = (product, stockItems) => {
    if (!product.recipe || product.recipe.length === 0) {
      return 999; // unlimited/livre
    }
    let minStockPossible = Infinity;
    for (const item of product.recipe) {
      const stockItem = stockItems.find(si => si.id === item.stockItemId);
      if (!stockItem) return 0;
      const possible = Math.floor(stockItem.currentStock / item.quantity);
      if (possible < minStockPossible) {
        minStockPossible = possible;
      }
    }
    return minStockPossible === Infinity ? 0 : minStockPossible;
  };

  const stockItems = [
    { id: 'si1', name: 'Limão', currentStock: 10, minStock: 2 },
    { id: 'si2', name: 'Cachaça', currentStock: 5, minStock: 1 }
  ];

  const caipirinha = {
    id: 'p1',
    name: 'Caipirinha',
    recipe: [
      { stockItemId: 'si1', quantity: 2 },  // needs 2 limões -> possible 10/2 = 5
      { stockItemId: 'si2', quantity: 1 }   // needs 1 cachaça -> possible 5/1 = 5
    ]
  };

  assert.equal(getProductStock(caipirinha, stockItems), 5, 'Disponibilidade de Caipirinha deve ser 5');

  // Reduce cachaça to 1
  stockItems[1].currentStock = 1;
  assert.equal(getProductStock(caipirinha, stockItems), 1, 'Disponibilidade deve cair para 1 devido ao gargalo de cachaça');

  // 2. Active status filtering emulation
  const products = [
    { id: 'p1', name: 'Caipirinha', active: true },
    { id: 'p2', name: 'Heineken', active: false },
    { id: 'p3', name: 'Coca-Cola' } // undefined -> active
  ];

  const activeProducts = products.filter(p => p.active !== false);
  assert.equal(activeProducts.length, 2, 'Devem restar apenas 2 produtos ativos (Caipirinha e Coca-Cola)');
  assert.equal(activeProducts.find(p => p.id === 'p2'), undefined, 'Produto inativo deve ser omitido');

  // 3. Double-close stock abatement prevention emulation
  let cashierOrders = [
    { id: 'o1', status: 'open', items: [{ product: caipirinha, quantity: 1 }] }
  ];

  const closeOrderEmulated = (orderId) => {
    const orderInState = cashierOrders.find(o => o.id === orderId);
    if (orderInState && orderInState.status === 'closed') {
      return { success: false, reason: 'Already closed' };
    }

    // Perform abatement
    cashierOrders = cashierOrders.map(o => o.id === orderId ? { ...o, status: 'closed' } : o);
    return { success: true };
  };

  assert.deepEqual(closeOrderEmulated('o1'), { success: true });
  assert.deepEqual(closeOrderEmulated('o1'), { success: false, reason: 'Already closed' }, 'Segunda chamada de close deve falhar');

  // 4. Out-of-stock blocking emulation
  const trySelectProduct = (product, stockItems, selectedItems) => {
    const stockQty = getProductStock(product, stockItems);
    const isOutOfStock = stockQty === 0;
    if (isOutOfStock) return { added: false, reason: 'Produto sem estoque' };
    selectedItems.push(product);
    return { added: true };
  };

  // Drain cachaça to 0
  stockItems[1].currentStock = 0;
  const selected = [];
  const resultBlocked = trySelectProduct(caipirinha, stockItems, selected);
  assert.deepEqual(resultBlocked, { added: false, reason: 'Produto sem estoque' }, 'Produto sem estoque não deve ser adicionado');
  assert.equal(selected.length, 0, 'Lista de selecionados deve permanecer vazia');

  // Restore cachaça
  stockItems[1].currentStock = 3;
  const resultAllowed = trySelectProduct(caipirinha, stockItems, selected);
  assert.deepEqual(resultAllowed, { added: true }, 'Produto com estoque deve ser adicionado');
  assert.equal(selected.length, 1, 'Lista de selecionados deve ter 1 produto');
});
