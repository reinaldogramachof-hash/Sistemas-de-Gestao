import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('UI style helper exposes shared visual primitives', () => {
  const source = read('gestao-gastro/src/ui/styles.ts');

  for (const token of [
    'pageTitle',
    'pageSubtitle',
    'panel',
    'panelMuted',
    'input',
    'tabShell',
    'tab',
    'primaryButton',
  ]) {
    assert.ok(source.includes(token), `styles.ts deve expor ${token}`);
  }

  assert.ok(source.includes('bg-surface'), 'helpers devem usar tokens de superficie');
  assert.ok(source.includes('border-border'), 'helpers devem usar tokens de borda');
  assert.ok(source.includes('bg-accent'), 'helpers devem usar token de accent');
});

test('Layout binds the app theme to Tailwind dark variants', () => {
  const source = read('gestao-gastro/src/components/Layout.tsx');

  assert.ok(
    source.includes("isDark ? 'dark bg-app-base text-text'"),
    'Layout deve aplicar a classe dark quando o tema do app for dark'
  );
});

test('Base operational views use the shared UI helper', () => {
  for (const path of [
    'gestao-gastro/src/components/Dashboard.tsx',
    'gestao-gastro/src/components/Kitchen.tsx',
    'gestao-gastro/src/components/Tables.tsx',
  ]) {
    const source = read(path);
    assert.ok(source.includes("import { ui } from '../ui/styles'"), `${path} deve importar o helper ui`);
    assert.ok(source.includes('ui.pageTitle'), `${path} deve usar titulo padronizado`);
  }
});

test('Touched shell and base views do not contain mojibake markers', () => {
  const paths = [
    'gestao-gastro/src/App.tsx',
    'gestao-gastro/src/components/Layout.tsx',
    'gestao-gastro/src/components/PDV.tsx',
    'gestao-gastro/src/components/OperationFeedback.tsx',
    'gestao-gastro/src/components/MenuList.tsx',
    'gestao-gastro/src/components/Dashboard.tsx',
    'gestao-gastro/src/components/Customers.tsx',
    'gestao-gastro/src/components/Products.tsx',
    'gestao-gastro/src/components/Reports.tsx',
    'gestao-gastro/src/components/Stock.tsx',
    'gestao-gastro/src/components/Kitchen.tsx',
    'gestao-gastro/src/components/Tables.tsx',
    'gestao-gastro/src/ui/styles.ts',
  ];

  for (const path of paths) {
    const source = read(path);
    assert.equal(/[\u00c3\u00c2\ufffd\u00f0]/.test(source), false, `${path} contem marcador de mojibake`);
  }
});

test('PDV keeps Portuguese accents and compact menu cards', () => {
  const pdv = read('gestao-gastro/src/components/PDV.tsx');
  const menu = read('gestao-gastro/src/components/MenuList.tsx');

  for (const text of [
    'Venda Rápida',
    'Balcão',
    'O carrinho está vazio',
    'Finalizar venda',
  ]) {
    assert.ok(pdv.includes(text), `PDV deve exibir "${text}" com acentuacao correta`);
  }

  assert.ok(menu.includes('Disponível'), 'MenuList deve exibir Disponível com acento');
  assert.ok(menu.includes('min-h-[190px]'), 'Cards do PDV devem manter altura compacta e estavel');
  assert.ok(menu.includes('getCategoryIcon'), 'MenuList deve usar icones Lucide em vez de emojis quebraveis');
});

test('PDV uses accessible non-blocking operational feedback', () => {
  const pdv = read('gestao-gastro/src/components/PDV.tsx');
  const feedback = read('gestao-gastro/src/components/OperationFeedback.tsx');

  assert.ok(pdv.includes("import { OperationFeedback"), 'PDV deve importar o feedback operacional compartilhado');
  assert.ok(pdv.includes('<OperationFeedback feedback={feedback}'), 'PDV deve renderizar o feedback operacional');
  assert.doesNotMatch(pdv, /\b(?:window\.)?alert\s*\(/, 'PDV não deve interromper a operação com alert()');
  assert.match(pdv, /window\.confirm\('Deseja cancelar o pedido\?/, 'cancelamento crítico deve continuar exigindo confirmação');
  assert.ok(pdv.includes("title: 'Venda bloqueada'"), 'bloqueio de estoque deve explicar o problema');
  assert.ok(pdv.includes("title: 'Selecione um atendente'"), 'PDV deve orientar quando o atendente estiver ausente');
  assert.ok(pdv.includes("title: 'Venda finalizada'"), 'PDV deve confirmar a conclusão da venda');

  assert.ok(feedback.includes('aria-live={config.live}'), 'feedback deve anunciar mudanças para tecnologia assistiva');
  assert.ok(feedback.includes('aria-atomic="true"'), 'feedback deve anunciar a mensagem completa');
  assert.ok(feedback.includes("role: 'alert'"), 'erros e avisos devem usar role alert');
  assert.ok(feedback.includes("role: 'status'"), 'sucesso e informação devem usar role status');
  assert.ok(feedback.includes('aria-label="Fechar mensagem"'), 'feedback deve oferecer fechamento acessível');
});

test('Cardápio and Estoque use shared non-blocking feedback', () => {
  const products = read('gestao-gastro/src/components/Products.tsx');
  const stock = read('gestao-gastro/src/components/Stock.tsx');

  for (const [name, source] of [['Cardápio', products], ['Estoque', stock]]) {
    assert.ok(source.includes("import { OperationFeedback"), `${name} deve importar o feedback compartilhado`);
    assert.ok(source.includes('<OperationFeedback feedback={feedback}'), `${name} deve renderizar o feedback compartilhado`);
    assert.doesNotMatch(source, /\b(?:window\.)?alert\s*\(/, `${name} não deve usar alert() bloqueante`);
  }

  assert.ok(products.includes("title: 'Ficha Técnica incompleta'"), 'Cardápio deve orientar ficha técnica incompleta');
  assert.ok(products.includes("title: 'Sincronização pendente'"), 'Cardápio deve explicar falha de sincronização');
  assert.match(products, /window\.confirm\(`Excluir \$\{product\.name\}/, 'exclusão de produto deve exigir confirmação');
  assert.doesNotMatch(products, /onClick=\{\(\) => deleteProduct\(/, 'grade e lista devem usar a mesma confirmação de exclusão');
  assert.ok(stock.includes("title: 'Exclusão bloqueada'"), 'Estoque deve explicar vínculo que impede exclusão');
  assert.ok(stock.includes("title: 'Perda registrada'"), 'Estoque deve confirmar a baixa registrada');
  assert.match(stock, /window\.confirm\(`Tem certeza que deseja excluir o insumo/, 'exclusão de insumo deve continuar confirmada');
});

test('Base modules keep Portuguese visible labels accented', () => {
  const expectations = {
    'gestao-gastro/src/components/Dashboard.tsx': [
      'Visão Geral',
      'Ticket Médio',
      'Últimos Pedidos',
      'Estoque Crítico',
    ],
    'gestao-gastro/src/components/Customers.tsx': [
      'Gestão de Clientes',
      'Fidelização de Público',
      'Ações',
      'Salvar Alterações',
    ],
    'gestao-gastro/src/components/Products.tsx': [
      'Cardápio e Vendas',
      'Gestão de catálogo e fichas técnicas',
      'Ficha Técnica',
      'Informações Básicas',
    ],
    'gestao-gastro/src/components/Reports.tsx': [
      'Gestão consolidada de caixa, vendas e despesas',
      'Lançar Despesa',
      'Lucro Líquido',
      'Comissão Acumulada',
    ],
    'gestao-gastro/src/components/Stock.tsx': [
      'Gestão de Suprimentos',
      'Controle profundo de insumos e movimentações',
      'Histórico',
      'Insumos em Nível Crítico',
    ],
  };

  for (const [path, labels] of Object.entries(expectations)) {
    const source = read(path);
    for (const label of labels) {
      assert.ok(source.includes(label), `${path} deve conter "${label}"`);
    }
  }
});

test('Reports keeps finance calculations restricted to closed orders', () => {
  const source = read('gestao-gastro/src/components/Reports.tsx');

  assert.match(
    source,
    /const closedOrders = useMemo\(\(\) => orders\.filter\(order => order\.status === 'closed'\)/,
    'Financeiro deve separar pedidos fechados antes dos cálculos'
  );
  assert.match(
    source,
    /return closedOrders\.filter\(order => isWithinPeriod\(order\.timestamp, period\)\)/,
    'Filtro de período deve usar somente pedidos fechados'
  );
  assert.doesNotMatch(
    source,
    /return orders\.filter\(o => \{/,
    'Financeiro não deve calcular faturamento diretamente sobre todos os pedidos'
  );
  assert.ok(source.includes('CMV estimado incompleto'), 'Financeiro deve avisar quando CMV estiver incompleto');
});
