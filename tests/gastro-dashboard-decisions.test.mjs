import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Dashboard recebe navegação tipada do App sem depender de rotas globais', () => {
  const app = read('gestao-gastro/src/App.tsx');
  const dashboard = read('gestao-gastro/src/components/Dashboard.tsx');

  assert.ok(app.includes('<Dashboard onNavigate={setCurrentView} />'));
  assert.ok(dashboard.includes("import type { View } from '../hooks/useNavigation'"));
  assert.ok(dashboard.includes('onNavigate: (view: View) => void'));
  assert.ok(dashboard.includes('onClick={() => onNavigate(decision.target)}'));
});

test('central de decisões prioriza Caixa, Mesas, Cardápio e Estoque', () => {
  const dashboard = read('gestao-gastro/src/components/Dashboard.tsx');

  assert.ok(dashboard.includes('Prioridades de agora'));
  assert.ok(dashboard.includes("id: 'cashier-closed'"));
  assert.ok(dashboard.includes("id: 'expired-stock'"));
  assert.ok(dashboard.includes("id: 'low-stock'"));
  assert.ok(dashboard.includes("id: 'open-orders'"));
  assert.ok(dashboard.includes("id: 'menu-pending'"));
  assert.ok(dashboard.includes('productSyncErrors'));
  assert.ok(dashboard.includes('productsWithIncompleteRecipe'));
  assert.ok(dashboard.includes("expiredItemsCount > 0 && checkAccess('estoque')"));
  assert.ok(dashboard.includes("syncPendingCount > 0) && checkAccess('produtos')"));
});

test('pulso operacional fornece atalhos para os módulos contratados', () => {
  const dashboard = read('gestao-gastro/src/components/Dashboard.tsx');

  assert.ok(dashboard.includes('Pulso da operação'));
  assert.ok(dashboard.includes("target: 'caixa' as View"));
  assert.ok(dashboard.includes("target: 'mesas' as View"));
  assert.ok(dashboard.includes("target: 'relatorios' as View"));
  assert.ok(dashboard.includes("target: 'estoque' as View"));
  assert.ok(dashboard.includes('aria-label={`Abrir ${item.label}: ${item.value}`}'));
  assert.ok(dashboard.includes('].filter(item => checkAccess(item.target))'));
});

test('indicadores explicam fórmula, origem e detalhamento', () => {
  const dashboard = read('gestao-gastro/src/components/Dashboard.tsx');

  assert.ok(dashboard.includes('Soma do total final dos pedidos fechados hoje.'));
  assert.ok(dashboard.includes('Vendas de hoje divididas pela quantidade de pedidos fechados.'));
  assert.ok(dashboard.includes('Origem: {kpi.source}'));
  assert.ok(dashboard.includes('aria-label={`Detalhar ${kpi.label}: ${kpi.value}`}'));
  assert.match(dashboard, /closedOrdersToday\.reduce\(\(acc, o\) => acc \+ o\.total, 0\)/);
});
