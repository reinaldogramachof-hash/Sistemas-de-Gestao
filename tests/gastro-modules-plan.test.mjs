import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const gastroDir = path.join(rootDir, 'gestao-gastro');

test('Inspect modulesConfig.ts for correct planMatrix', () => {
  const configPath = path.join(gastroDir, 'src', 'config', 'modulesConfig.ts');
  const configContent = fs.readFileSync(configPath, 'utf-8');

  // Verifica base plan
  assert.match(configContent, /plan:\s*'base'/);
  assert.match(configContent, /'dashboard'/);
  assert.match(configContent, /'pdv'/);
  
  // Extrai a lista do plano base para validar o q ta liberado e bloqueado
  const baseMatch = configContent.match(/base:\s*\{[\s\S]*?allowedModules:\s*\[([\s\S]*?)\]/);
  assert.ok(baseMatch, 'Should find base plan allowed modules array');
  const baseModules = baseMatch[1];
  const baseModuleList = [...baseModules.matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(
    baseModuleList,
    [
      'pdv',
      'mesas',
      'caixa',
      'dashboard',
      'produtos',
      'relatorios',
      'estoque',
      'manual',
      'configuracoes',
      'suporte'
    ],
    'Base plan should match the client module package'
  );
  
  assert.ok(!baseModules.includes("'cozinha'"), 'Base plan should NOT have cozinha');
  assert.ok(!baseModules.includes("'clientes'"), 'Base plan should NOT have clientes');
  assert.ok(!baseModules.includes("'fornecedores'"), 'Base plan should NOT have fornecedores');
  assert.ok(!baseModules.includes("'colaboradores'"), 'Base plan should NOT have colaboradores');
  assert.ok(!baseModules.includes("'seguranca'"), 'Base plan should not expose an uncontracted seguranca module');
  assert.ok(!baseModules.includes("'evolucao'"), 'Base plan should not expose an uncontracted evolucao module');

  // Verifica premium e master plan tem os módulos que faltam
  const premiumMatch = configContent.match(/premium:\s*\{[\s\S]*?allowedModules:\s*\[([\s\S]*?)\]/);
  assert.ok(premiumMatch[1].includes("'colaboradores'"));
  
  const masterMatch = configContent.match(/master:\s*\{[\s\S]*?allowedModules:\s*\[([\s\S]*?)\]/);
  assert.ok(masterMatch[1].includes("'colaboradores'"));
});

test('Inspect useModules.ts for localStorage usage and fallback', () => {
  const hookPath = path.join(gastroDir, 'src', 'hooks', 'useModules.ts');
  const hookContent = fs.readFileSync(hookPath, 'utf-8');

  assert.match(hookContent, /localStorage\.getItem\('gestao_gastro_verified_plan'\)/, 'Should read plan from verified localStorage key');
  assert.match(hookContent, /setCurrentPlan\('base'\)/, 'Should have fallback to base plan');
  assert.match(hookContent, /listEnabledTenantModules/, 'Should load the tenant module contract after authentication');
  assert.match(hookContent, /requiresTenantContract/, 'Online tenants should require the remote module contract');
  assert.match(hookContent, /tenantModules\?\.includes\(module\) === true/, 'The UI should fail closed while the tenant contract is loading');
});

test('Base plan exposes commercial module aliases for licensing', () => {
  const configPath = path.join(gastroDir, 'src', 'config', 'modulesConfig.ts');
  const configContent = fs.readFileSync(configPath, 'utf-8');

  assert.match(configContent, /commercialModuleAliases/, 'Should expose commercialModuleAliases');
  assert.match(configContent, /produtos:\s*'Cardápio'/, 'produtos should be labeled as Cardápio');
  assert.match(configContent, /relatorios:\s*'Financeiro'/, 'relatorios should be labeled as Financeiro');
  assert.match(configContent, /getCommercialModuleName/, 'Should provide helper for commercial module names');
});

test('Waiter role is restricted independently from the client plan', () => {
  const configPath = path.join(gastroDir, 'src', 'config', 'modulesConfig.ts');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const hookPath = path.join(gastroDir, 'src', 'hooks', 'useModules.ts');
  const hookContent = fs.readFileSync(hookPath, 'utf-8');

  assert.match(configContent, /export type UserRole/, 'Should declare user roles separately from plans');
  assert.match(configContent, /roleModuleMatrix/, 'Should expose roleModuleMatrix');
  assert.match(configContent, /waiter:\s*\[[\s\S]*'mesas'[\s\S]*'produtos'[\s\S]*\]/, 'waiter should only get mesas and cardapio modules');

  const waiterMatch = configContent.match(/waiter:\s*\[([\s\S]*?)\]/);
  assert.ok(waiterMatch, 'Should find waiter role module list');
  assert.ok(!waiterMatch[1].includes("'dashboard'"), 'waiter must not see dashboard');
  assert.ok(!waiterMatch[1].includes("'caixa'"), 'waiter must not access full cashier module');
  assert.ok(!waiterMatch[1].includes("'estoque'"), 'waiter must not see stock');
  assert.ok(!waiterMatch[1].includes("'relatorios'"), 'waiter must not see finance reports');
  assert.ok(!waiterMatch[1].includes("'configuracoes'"), 'waiter must not see settings');

  assert.match(configContent, /waiterCapabilities/, 'Should document waiter operational capabilities');
  assert.match(configContent, /pre-fechamento/, 'waiter capabilities should include account pre-closing/request flow');
  assert.match(hookContent, /currentUser\.role/, 'useModules should consume the verified role from the reactive user context');
  assert.doesNotMatch(hookContent, /localStorage\.getItem\(['"]gestao_gastro_user_role/, 'useModules must not reuse a persistent role from another user');
  assert.match(hookContent, /isModuleAllowed\(module,\s*currentPlan,\s*currentRole\)/, 'checkAccess should consider plan and role');
});

test('Inspect Layout.tsx for menu filtering based on access', () => {
  const layoutPath = path.join(gastroDir, 'src', 'components', 'Layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

  assert.match(layoutContent, /useModules/, 'Should import useModules');
  assert.match(layoutContent, /checkAccess/, 'Should extract checkAccess');
  assert.match(layoutContent, /\.filter\(\(.*?\)\s*=>\s*checkAccess\(.*?\.id\)\)/, 'Should filter nav items by checkAccess');
});

test('Inspect App.tsx for defensive content blocking', () => {
  const appPath = path.join(gastroDir, 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  assert.match(appContent, /useModules/, 'Should import useModules');
  assert.match(appContent, /if\s*\(!checkAccess\(currentView/, 'Should block view conditionally');
  assert.match(appContent, /Modulo nao disponivel no plano atual/i, 'Should render lock screen text');
});

test('UserManual only documents modules available in the current contract', () => {
  const manualPath = path.join(gastroDir, 'src', 'components', 'UserManual.tsx');
  const manualContent = fs.readFileSync(manualPath, 'utf-8');

  assert.match(manualContent, /useModules/, 'Manual should use the same module access hook as navigation');
  assert.match(manualContent, /module:\s*AppModule/, 'Each manual guide should be linked to a contracted module');
  assert.match(manualContent, /visibleModuleGuides\s*=\s*moduleGuides\.filter\(\(guide\)\s*=>\s*checkAccess\(guide\.module\)\)/, 'Manual should filter guides by checkAccess');
  assert.match(manualContent, /visibleModuleGuides\.map/, 'Manual should render only visible guides');
  assert.doesNotMatch(manualContent, /moduleGuides\.map\(\(guide\)/, 'Manual must not render every guide regardless of plan');
  assert.match(manualContent, /id:\s*'guide_clientes'[\s\S]*?module:\s*'clientes'/, 'Clientes guide should depend on clientes module');
  assert.match(manualContent, /id:\s*'guide_fornecedores'[\s\S]*?module:\s*'fornecedores'/, 'Fornecedores guide should depend on fornecedores module');
  assert.match(manualContent, /id:\s*'guide_colaboradores'[\s\S]*?module:\s*'colaboradores'/, 'Colaboradores guide should depend on colaboradores module');
  assert.match(manualContent, /activeTab\s*===\s*'tips'/, 'Professional tips tab should render with its declared tab key');
});

test('UserManual does not expose implementation-oriented first day checklist', () => {
  const manualPath = path.join(gastroDir, 'src', 'components', 'UserManual.tsx');
  const manualContent = fs.readFileSync(manualPath, 'utf-8');

  assert.doesNotMatch(manualContent, /roteiro/i, 'Manual should not expose a first day roadmap tab');
  assert.doesNotMatch(manualContent, /firstDay/i, 'Manual should not keep first-day implementation checklist code');
  assert.doesNotMatch(manualContent, /Ativar Licen/, 'Manual should not include license activation as user-facing training');
  assert.doesNotMatch(manualContent, /Conferir rota/i, 'Manual should not include deployment route checks');
});
