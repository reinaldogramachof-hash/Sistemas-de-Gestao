import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const support = readFileSync(join(root, 'gestao-gastro', 'src', 'components', 'Support.tsx'), 'utf8');
const diagnostic = readFileSync(join(root, 'gestao-gastro', 'src', 'utils', 'supportDiagnostic.ts'), 'utf8');

test('Suporte oferece diagnóstico copiável com retorno acessível', () => {
  assert.match(support, /Copiar diagnóstico/);
  assert.match(support, /navigator\.clipboard\.writeText\(diagnostic\)/);
  assert.match(support, /aria-live="polite"/);
  assert.match(support, /Não foi possível copiar automaticamente/);
});

test('diagnóstico cobre versão, rota, tenant, conexão, PWA e módulos', () => {
  for (const field of ['Versão:', 'Rota:', 'Tenant:', 'Módulos visíveis:', 'Sincronização remota:', 'PWA instalado:', 'Service worker controlando a página:']) {
    assert.ok(diagnostic.includes(field), `diagnóstico deve incluir ${field}`);
  }
});

test('diagnóstico não lê armazenamentos ou credenciais do navegador', () => {
  assert.doesNotMatch(diagnostic, /localStorage\.getItem|sessionStorage\.getItem|document\.cookie|supabase\.auth|getSession\(/i);
  assert.match(support, /Senhas, tokens, chaves e dados de pedidos não são coletados/);
});
