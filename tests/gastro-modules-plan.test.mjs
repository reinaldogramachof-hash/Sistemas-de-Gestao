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
  
  assert.ok(!baseModules.includes("'colaboradores'"), 'Base plan should NOT have colaboradores');
  assert.ok(!baseModules.includes("'fornecedores'"), 'Base plan should NOT have fornecedores');
  assert.ok(!baseModules.includes("'seguranca'"), 'Base plan should NOT have seguranca');
  assert.ok(!baseModules.includes("'evolucao'"), 'Base plan should NOT have evolucao');

  // Verifica premium e master plan tem os módulos que faltam
  const premiumMatch = configContent.match(/premium:\s*\{[\s\S]*?allowedModules:\s*\[([\s\S]*?)\]/);
  assert.ok(premiumMatch[1].includes("'colaboradores'"));
  
  const masterMatch = configContent.match(/master:\s*\{[\s\S]*?allowedModules:\s*\[([\s\S]*?)\]/);
  assert.ok(masterMatch[1].includes("'colaboradores'"));
});

test('Inspect useModules.ts for localStorage usage and fallback', () => {
  const hookPath = path.join(gastroDir, 'src', 'hooks', 'useModules.ts');
  const hookContent = fs.readFileSync(hookPath, 'utf-8');

  assert.match(hookContent, /localStorage\.getItem\('gestao_gastro_plan'\)/, 'Should read plan from localStorage');
  assert.match(hookContent, /setCurrentPlan\('base'\)/, 'Should have fallback to base plan');
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
