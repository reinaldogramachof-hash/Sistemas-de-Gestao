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

test('local runtime proxies the waiter manifest and keeps PWA updates automatic', () => {
  const viteConfig = read('gestao-gastro/vite.config.ts');

  assert.match(
    viteConfig,
    /['"]\/api_comanda_manifest\.php['"]:\s*\{[\s\S]*?target:\s*['"]http:\/\/127\.0\.0\.1:8000['"]/,
    'Vite deve encaminhar o manifest dinamico da comanda ao backend PHP local',
  );
  assert.match(
    viteConfig,
    /registerType:\s*['"]autoUpdate['"]/,
    'PWA deve buscar e ativar novas versoes automaticamente',
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
  assert.match(contextSource, /resolveTenant\(window\.location\.pathname\)/, 'AppContext deve preferir o tenant resolvido dinamicamente pela rota/licenca');
  assert.equal(
    contextSource.includes("settings.establishment.name || 'Cantinho da Resenha'"),
    false,
    'currentEmpresa nao deve cair em Cantinho da Resenha quando a rota nao for do cliente'
  );
});

test('dynamic tenant slug uses pending local storage until license resolves tenant', () => {
  const contextSource = read('gestao-gastro/src/store/AppContext.tsx');
  const gateSource = read('gestao-gastro/src/components/ActivationGate.tsx');

  assert.match(contextSource, /pending-\$\{slug\}/, 'AppContext deve usar chave local provisoria para slug ainda nao resolvido');
  assert.doesNotMatch(contextSource, /throw new Error\('Tenant ID ausente/, 'AppContext nao deve derrubar a tela antes da ativacao resolver o tenant');
  assert.match(gateSource, /if \(!resolvedTenant && data\.tenant_id\)/, 'ActivationGate deve recarregar apos persistir tenant de slug dinamico');
});

test('waiter PWA manifest opens the installed app directly on the client comanda', () => {
  const manifestEndpoint = read('api_comanda_manifest.php');
  const mobileApp = read('gestao-gastro/src/components/ComandaMobileApp.tsx');

  assert.match(manifestEndpoint, /Content-Type.*application\/manifest\+json/, 'endpoint deve responder como manifest PWA');
  assert.match(manifestEndpoint, /\$startUrl = "\{\$basePath\}\/comanda\?access=\{\$access\}"/, 'manifest da comanda deve iniciar diretamente na rota mobile');
  assert.match(manifestEndpoint, /'start_url' => \$startUrl/, 'manifest deve publicar a URL inicial calculada');
  assert.match(manifestEndpoint, /scope.*basePath/s, 'manifest deve limitar o escopo ao cliente atual');
  assert.match(manifestEndpoint, /pwa-512x512\.png/, 'manifest deve referenciar icone instalavel');
  assert.match(mobileApp, /api_comanda_manifest\.php\?slug=/, 'ComandaMobileApp deve carregar manifest dinamico por slug');
});
