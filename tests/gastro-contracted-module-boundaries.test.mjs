import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const extractPlanModules = (source, plan) => {
  const match = source.match(new RegExp(`${plan}:\\s*\\{[\\s\\S]*?allowedModules:\\s*\\[([\\s\\S]*?)\\]`));
  assert.ok(match, `matriz do plano ${plan} deve existir`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
};

test('Cantinho da Resenha base plan exposes only contracted modules', () => {
  const source = read('gestao-gastro/src/config/modulesConfig.ts');
  const baseModules = extractPlanModules(source, 'base');

  assert.deepEqual(baseModules, [
    'pdv',
    'mesas',
    'caixa',
    'dashboard',
    'produtos',
    'relatorios',
    'estoque',
    'manual',
    'configuracoes',
    'suporte',
  ]);

  for (const module of ['cozinha', 'clientes', 'colaboradores', 'fornecedores', 'seguranca', 'evolucao']) {
    assert.equal(baseModules.includes(module), false, `${module} não deve integrar o plano contratado`);
  }
});

test('Menu and forced view navigation share the same access boundary', () => {
  const app = read('gestao-gastro/src/App.tsx');
  const layout = read('gestao-gastro/src/components/Layout.tsx');

  assert.match(
    layout,
    /group\.items\.filter\(\(item: any\) => checkAccess\(item\.id\)\)/,
    'menu deve remover módulos sem acesso',
  );
  assert.match(
    app,
    /if \(!checkAccess\(currentView as AppModule\)\)[\s\S]*?Modulo nao disponivel no plano atual/,
    'view forçada deve ser bloqueada antes da seleção do componente',
  );
  assert.ok(
    app.indexOf('if (!checkAccess(currentView as AppModule))') < app.indexOf('switch(currentView)'),
    'checagem de acesso deve ocorrer antes do roteamento interno',
  );
});

test('Manual filters guides, quick tips and progress by contracted module', () => {
  const manual = read('gestao-gastro/src/components/UserManual.tsx');

  assert.match(manual, /moduleGuides\.filter\(\(guide\) => checkAccess\(guide\.module\)\)/);
  assert.match(manual, /proTips\.filter\(\(tip\) => checkAccess\(tip\.module\)\)/);
  assert.match(manual, /visibleProTips\.map\(\(tip\) => tip\.id\)/);
  assert.match(manual, /visibleProTips\.map\(\(tip\) => \{/);
  assert.match(manual, /id: 'tip_4', module: 'clientes'/, 'dica de fidelização deve acompanhar o módulo Clientes');
  assert.doesNotMatch(manual, /\.\.\.proTips\.map\(\(tip\) => tip\.id\)/, 'progresso não deve contar dicas ocultas');
});

test('Client paths do not resolve a module from a direct URL suffix', () => {
  const routes = read('gestao-gastro/src/config/clientRoutes.ts');
  const app = read('gestao-gastro/src/App.tsx');

  assert.match(routes, /\^\\\/gestao-gastro\\\/\(\[\^\/\]\+\)/, 'rota deve extrair somente a identidade do cliente');
  assert.equal(routes.includes('moduleFromPath'), false, 'sufixo da URL não deve selecionar módulo');
  assert.equal(app.includes('URLSearchParams'), false, 'query string não deve selecionar módulo interno');
  assert.equal(app.includes('location.hash'), false, 'hash não deve selecionar módulo interno');
});
