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

test('Gestao Gastro must require a known client slug before loading tenant data', () => {
  const mainSource = read('gestao-gastro/src/main.tsx');
  const routeSource = read('gestao-gastro/src/config/clientRoutes.ts');
  const contextSource = read('gestao-gastro/src/store/AppContext.tsx');

  assert.match(mainSource, /isMissingClientRoute/, 'main.tsx deve bloquear /gestao-gastro/ sem slug de cliente');
  assert.match(mainSource, /Cliente n[aã]o identificado/, 'rota sem cliente deve exibir aviso em vez de abrir o dashboard');
  assert.match(routeSource, /displayName:\s*'Cantinho da Resenha'/, 'clientRoutes deve centralizar o nome publico do cliente');
  assert.match(routeSource, /CANTINHO_DA_RESENHA_SLUG_ALIAS\s*=\s*'cantinho-da-resenha'/, 'clientRoutes deve aceitar o slug com hifen gerado pelo painel admin');
  assert.match(routeSource, /\[CANTINHO_DA_RESENHA_SLUG_ALIAS\]/, 'clientRoutes deve mapear o alias com hifen para o mesmo tenant');
  assert.match(contextSource, /clientRoute\?\.tenantId/, 'AppContext deve preferir o tenant resolvido pela rota');
  assert.equal(
    contextSource.includes("settings.establishment.name || 'Cantinho da Resenha'"),
    false,
    'currentEmpresa nao deve cair em Cantinho da Resenha quando a rota nao for do cliente'
  );
});
