import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('Gestao Gastro build must be published under /gestao-gastro/', () => {
  const viteConfig = read('gestao-gastro/vite.config.ts');

  assert.ok(
    viteConfig.includes("base: '/gestao-gastro/'"),
    'vite.config.ts deve usar base absoluto /gestao-gastro/ para assets em rotas profundas',
  );
  assert.equal(
    viteConfig.includes("base: './'"),
    false,
    'base relativo quebra assets em /gestao-gastro/cantinhodaresenha/comanda',
  );
});

test('Gestao Gastro build must include Apache SPA fallback for client routes', () => {
  const htaccess = read('gestao-gastro/public/.htaccess');

  assert.match(htaccess, /RewriteEngine\s+On/, 'deve habilitar mod_rewrite');
  assert.match(htaccess, /RewriteBase\s+\/gestao-gastro\//, 'deve declarar a base publica do app');
  assert.match(htaccess, /RewriteCond\s+%\{REQUEST_FILENAME\}\s+!-f/, 'deve preservar arquivos reais');
  assert.match(htaccess, /RewriteCond\s+%\{REQUEST_FILENAME\}\s+!-d/, 'deve preservar diretorios reais');
  assert.match(htaccess, /RewriteRule\s+\.\s+index\.html\s+\[L\]/, 'deve redirecionar subrotas para index.html');
});

test('Root htaccess documents the required Gastro deployment path', () => {
  const rootHtaccess = read('.htaccess');

  assert.ok(
    rootHtaccess.includes('gestao-gastro/dist'),
    'htaccess raiz deve documentar que o conteudo de dist precisa ser publicado em /gestao-gastro/',
  );
});
