import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function read(filePath) {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf-8');
}

test('frontend .env.example is documented correctly without inline comments on anon key', () => {
  const envExample = read('gestao-gastro/.env.example');
  assert.match(envExample, /VITE_SUPABASE_URL=/);
  assert.match(envExample, /VITE_SUPABASE_ANON_KEY=\n/);
  assert.match(envExample, /VITE_GASTRO_TENANT_ID=cd8f21f4-73a1-4c87-a385-9b6deacaeae7/);
});

test('readiness document exists and contains real supabase state without generic table names', () => {
  const mdContent = read('gestao-gastro/docs/PRONTIDAO_TESTES_REAIS_E_DEPLOY_CANTINHO.md');
  assert.match(mdContent, /restaurant_tables/);
  assert.match(mdContent, /restaurant_orders/);
  assert.doesNotMatch(mdContent, /`comandas`/);
  assert.doesNotMatch(mdContent, /`mesas`/);
  assert.match(mdContent, /12 mesas já existentes/);
  assert.match(mdContent, /cashier/);
});

test('vite config keeps base /gestao-gastro/', () => {
  const viteConfig = read('gestao-gastro/vite.config.ts');
  assert.match(viteConfig, /base:\s*['"]\/gestao-gastro\/['"]/);
});

test('htaccess contains SPA fallback', () => {
  const htaccess = read('gestao-gastro/public/.htaccess');
  assert.match(htaccess, /RewriteBase \/gestao-gastro\//);
  assert.match(htaccess, /RewriteRule \. index\.html \[L\]/);
});

test('client routes maintains slug and tenant', () => {
  const clientRoutes = read('gestao-gastro/src/config/clientRoutes.ts');
  assert.match(clientRoutes, /cantinhodaresenha/);
  assert.match(clientRoutes, /cd8f21f4-73a1-4c87-a385-9b6deacaeae7/);
});

test('no service_role key leaks in frontend code', () => {
  const srcDir = path.resolve(process.cwd(), 'gestao-gastro/src');
  
  function checkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        checkDir(fullPath);
      } else {
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.doesNotMatch(content, /service_role/, `File ${fullPath} contains service_role`);
        assert.doesNotMatch(content, /SUPABASE_SERVICE_KEY/, `File ${fullPath} contains SUPABASE_SERVICE_KEY`);
      }
    }
  }

  checkDir(srcDir);
});
