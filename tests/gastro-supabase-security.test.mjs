import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const GASTRO_SRC = join(process.cwd(), 'gestao-gastro', 'src');
const GASTRO_TESTS = join(process.cwd(), 'tests');
const GASTRO_MIGRATION = join(process.cwd(), 'gestao-gastro', 'supabase', 'migrations', '20260713_garcom_mobile_online.sql');

// ─── Utilitários ──────────────────────────────────────────────────────────────

function readSrc(relativePath) {
  return readFileSync(join(GASTRO_SRC, relativePath), 'utf-8');
}

function readTest(relativePath) {
  return readFileSync(join(GASTRO_TESTS, relativePath), 'utf-8');
}

function fileContains(content, pattern) {
  return typeof pattern === 'string'
    ? content.includes(pattern)
    : pattern.test(content);
}

// ─── Testes de Segurança do Supabase ─────────────────────────────────────────

describe('Supabase Security — gestao-gastro', () => {

  test('service_role NÃO deve aparecer em nenhum arquivo src', () => {
    const forbidden = ['service_role', 'SUPABASE_SERVICE_ROLE', 'supabaseServiceRole'];
    const walk = (dir) => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx|js|jsx|env)$/.test(entry.name)) continue;
        const content = readFileSync(full, 'utf-8');
        for (const bad of forbidden) {
          assert.ok(
            !content.includes(bad),
            `🔴 SEGURANÇA: "${bad}" encontrado em ${full}`,
          );
        }
      }
    };
    walk(GASTRO_SRC);
  });

  test('VITE_SUPABASE_URL deve estar definido em .env.local', () => {
    const envPath = join(process.cwd(), 'gestao-gastro', '.env.local');
    let content;
    try {
      content = readFileSync(envPath, 'utf-8');
    } catch {
      assert.fail('.env.local não encontrado em gestao-gastro/');
    }
    assert.ok(
      content.includes('VITE_SUPABASE_URL='),
      'VITE_SUPABASE_URL não encontrado no .env.local',
    );
  });

  test('VITE_SUPABASE_ANON_KEY deve estar definido em .env.local', () => {
    const envPath = join(process.cwd(), 'gestao-gastro', '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    assert.ok(
      content.includes('VITE_SUPABASE_ANON_KEY='),
      'VITE_SUPABASE_ANON_KEY não encontrado no .env.local',
    );
  });

  test('VITE_GASTRO_TENANT_ID deve estar definido em .env.local', () => {
    const envPath = join(process.cwd(), 'gestao-gastro', '.env.local');
    const content = readFileSync(envPath, 'utf-8');
    assert.ok(
      content.includes('VITE_GASTRO_TENANT_ID='),
      'VITE_GASTRO_TENANT_ID não encontrado no .env.local',
    );
  });

  test('supabase.ts deve usar isSupabaseConfigured como guard', () => {
    const content = readSrc('lib/supabase.ts');
    assert.ok(
      content.includes('isSupabaseConfigured'),
      'supabase.ts deve exportar isSupabaseConfigured',
    );
    assert.ok(
      content.includes('VITE_SUPABASE_URL'),
      'supabase.ts deve referenciar VITE_SUPABASE_URL',
    );
    assert.ok(
      content.includes('VITE_SUPABASE_ANON_KEY'),
      'supabase.ts deve referenciar VITE_SUPABASE_ANON_KEY',
    );
  });

  test('supabase.ts NÃO deve exportar null como cliente sem guard', () => {
    const content = readSrc('lib/supabase.ts');
    // Garante que o cliente é condicional, não sempre null ou sempre non-null
    assert.ok(
      content.includes('isSupabaseConfigured'),
      'supabase.ts precisa ter guard isSupabaseConfigured',
    );
  });

  test('tablesSupabaseService.ts deve existir', () => {
    const content = readSrc('services/tablesSupabaseService.ts');
    assert.ok(content.includes('listTables'), 'listTables deve estar presente');
    assert.ok(content.includes('subscribeToTables'), 'subscribeToTables deve estar presente');
    assert.ok(content.includes('tenant_id'), 'Deve usar tenant_id (não empresa_id)');
  });

  test('ordersSupabaseService.ts deve existir', () => {
    const content = readSrc('services/ordersSupabaseService.ts');
    assert.ok(content.includes('createOrder'), 'createOrder deve estar presente');
    assert.ok(content.includes('closeOrder'), 'closeOrder deve estar presente');
    assert.ok(content.includes('subscribeToOrders'), 'subscribeToOrders deve estar presente');
    assert.ok(content.includes('tenant_id'), 'Deve usar tenant_id');
  });

  test('rota /comanda deve estar no main.tsx', () => {
    const content = readSrc('main.tsx');
    assert.ok(
      content.includes('/comanda'),
      'main.tsx deve detectar a rota /comanda',
    );
    assert.ok(
      content.includes('ComandaMobileApp'),
      'main.tsx deve renderizar ComandaMobileApp na rota /comanda',
    );
  });

  test('AppContext não deve usar setOrders ou setTables diretamente (deve ser setLocalOrders/setLocalTables)', () => {
    const content = readSrc('store/AppContext.tsx');
    // Garante que não há referência ao setter antigo que não existe mais
    assert.ok(
      !content.includes('setOrders('),
      'AppContext não deve chamar setOrders() — use setLocalOrders()',
    );
    assert.ok(
      !content.includes('setTables('),
      'AppContext não deve chamar setTables() — use setLocalTables()',
    );
  });

  test('migration deve gerar id de restaurant_orders compativel com createOrder()', () => {
    const migration = readFileSync(GASTRO_MIGRATION, 'utf-8');
    const service = readSrc('services/ordersSupabaseService.ts');

    assert.match(
      migration,
      /CREATE TABLE IF NOT EXISTS public\.restaurant_orders[\s\S]*id TEXT PRIMARY KEY DEFAULT/,
      'restaurant_orders.id deve ter DEFAULT porque o frontend nao envia id no insert',
    );
    assert.ok(
      !/interface OrderInsertRow[\s\S]*\bid: string;/.test(service),
      'OrderInsertRow nao deve exigir id quando o banco gera o id',
    );
    assert.ok(
      !/const payload: OrderInsertRow = \{[\s\S]*\bid:/.test(service),
      'createOrder nao deve montar id manual se o banco tem DEFAULT',
    );
  });

  test('migration deve ter WITH CHECK nas policies de UPDATE', () => {
    const migration = readFileSync(GASTRO_MIGRATION, 'utf-8');

    const tablesUpdatePolicy = /CREATE POLICY "Membros do tenant podem atualizar mesas"[\s\S]*?FOR UPDATE[\s\S]*?USING \([\s\S]*?\)[\s\S]*?WITH CHECK \(/.test(migration);
    const ordersUpdatePolicy = /CREATE POLICY "Membros do tenant podem atualizar pedidos"[\s\S]*?FOR UPDATE[\s\S]*?USING \([\s\S]*?\)[\s\S]*?WITH CHECK \(/.test(migration);

    assert.ok(tablesUpdatePolicy, 'Policy UPDATE de restaurant_tables precisa de WITH CHECK');
    assert.ok(ordersUpdatePolicy, 'Policy UPDATE de restaurant_orders precisa de WITH CHECK');
  });

  test('fluxo online nao deve usar default-empresa como fallback de tenant', () => {
    const comanda = readSrc('components/ComandaMobile.tsx');
    const appContext = readSrc('store/AppContext.tsx');

    assert.ok(!comanda.includes("|| 'default-empresa'"), 'ComandaMobile nao deve ter fallback default-empresa');
    assert.ok(!comanda.includes('fallbackTenant'), 'ComandaMobile nao deve usar fallbackTenant em chamadas online');
    assert.ok(!appContext.includes("|| 'default-empresa'"), 'AppContext nao deve ter fallback default-empresa para hooks online');
  });

});
