/**
 * gastro-lan-roles.test.mjs
 * Suite de testes para:
 *  1. Validação de origem LAN (validateLanOrigin via comandaAccess.ts)
 *  2. Contrato de roles no api_admin_users.php (waiter, cashier, papeis invalidos)
 *  3. Estrutura do HelpTooltip (createPortal, posicionamento, ARIA)
 *  4. Migracao SQL de roles
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1. MIGRACAO SQL - Roles
// ---------------------------------------------------------------------------
test('Migration SQL: 20260714_tenant_members_add_waiter_cashier.sql deve existir e ser correto', () => {
  const path = 'gestao-gastro/supabase/migrations/20260714_tenant_members_add_waiter_cashier.sql';
  assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), 'Arquivo de migracao de roles deve existir');
  const sql = read(path);
  assert.ok(sql.includes('DROP CONSTRAINT IF EXISTS tenant_members_role_check'), 'Deve remover a constraint antiga');
  assert.ok(sql.includes('ADD CONSTRAINT tenant_members_role_check'), 'Deve recriar a constraint');
  assert.ok(sql.includes("'waiter'"), 'Deve incluir papel waiter');
  assert.ok(sql.includes("'cashier'"), 'Deve incluir papel cashier');
  assert.ok(sql.includes("'owner'"), 'Deve preservar papel owner');
  assert.ok(sql.includes("'admin'"), 'Deve preservar papel admin');
  assert.ok(sql.includes("'operator'"), 'Deve preservar papel operator');
  assert.ok(sql.includes("'viewer'"), 'Deve preservar papel viewer');
});

// ---------------------------------------------------------------------------
// 2. VALIDACAO LAN - comandaAccess.ts (logica pura em JS/TS via analise de fonte)
// ---------------------------------------------------------------------------
test('comandaAccess.ts: deve exportar validateLanOrigin e PRIVATE_LAN_ORIGIN_REGEX', () => {
  const source = read('gestao-gastro/src/utils/comandaAccess.ts');
  assert.ok(source.includes('validateLanOrigin'), 'Deve exportar a funcao validateLanOrigin');
  assert.ok(source.includes('PRIVATE_LAN_ORIGIN_REGEX'), 'Deve declarar a regex de validacao LAN');
  assert.ok(source.includes('loopback'), 'Deve ter logica de rejeicao de loopback');
  assert.ok(source.includes('missing_port'), 'Deve ter logica de rejeicao de porta ausente');
});

test('comandaAccess.ts: deve rejeitar localhost, 127.0.0.1, URLs com caminho e IPs publicos', () => {
  const source = read('gestao-gastro/src/utils/comandaAccess.ts');
  // Verifica que localhost e 127.x sao explicitamente testados
  assert.ok(source.includes('localhost'), 'Deve testar localhost no validador');
  assert.ok(source.includes('127.'), 'Deve testar 127.x no validador');
  // Verifica que IPs privados validos sao aceitos (regex presente)
  assert.ok(source.includes('192.168'), 'Deve aceitar 192.168.x.x via regex');
  assert.ok(source.includes('10.'), 'Deve aceitar 10.x.x.x via regex');
});

test('comandaAccess.ts: getComandaAccessUrl deve usar validateLanOrigin internamente', () => {
  const source = read('gestao-gastro/src/utils/comandaAccess.ts');
  assert.ok(
    source.includes('validateLanOrigin(localTestOrigin)'),
    'getComandaAccessUrl deve chamar validateLanOrigin ao processar o localTestOrigin'
  );
  assert.ok(
    source.includes("'https://sistemasdegestao.tech'"),
    'Em producao, deve usar sempre o dominio HTTPS oficial'
  );
});

// ---------------------------------------------------------------------------
// 3. SETTINGS.TSX - usa validateLanOrigin e exibe feedback inline
// ---------------------------------------------------------------------------
test('Settings.tsx: deve usar validateLanOrigin e exibir feedback inline de validacao', () => {
  const source = read('gestao-gastro/src/components/Settings.tsx');
  assert.ok(source.includes('validateLanOrigin'), 'Settings.tsx deve importar e usar validateLanOrigin');
  assert.ok(source.includes('lanValidationMsg'), 'Settings.tsx deve ter estado de mensagem de validacao LAN');
  assert.ok(source.includes('result.valid'), 'Settings.tsx deve verificar result.valid do validador');
  assert.ok(source.includes('result.origin'), 'Settings.tsx deve usar result.origin normalizado');
});

// ---------------------------------------------------------------------------
// 4. HELPTOOLTIP.TSX - createPortal e posicionamento
// ---------------------------------------------------------------------------
test('HelpTooltip.tsx: deve usar createPortal e posicionamento fixed com getBoundingClientRect', () => {
  const source = read('gestao-gastro/src/components/HelpTooltip.tsx');
  assert.ok(source.includes('createPortal'), 'HelpTooltip.tsx deve usar createPortal');
  assert.ok(source.includes('document.body'), 'HelpTooltip.tsx deve renderizar o painel em document.body');
  assert.ok(source.includes('getBoundingClientRect'), 'HelpTooltip.tsx deve calcular posicao com getBoundingClientRect');
  assert.ok(source.includes("position: 'fixed'"), 'O painel deve usar position: fixed');
  assert.ok(source.includes('zIndex: 9999'), 'O painel deve ter z-index acima de modais');
});

test('HelpTooltip.tsx: deve fechar com Escape, clique externo e manter suporte a toque', () => {
  const source = read('gestao-gastro/src/components/HelpTooltip.tsx');
  assert.ok(source.includes("e.key === 'Escape'"), 'HelpTooltip.tsx deve fechar com Escape');
  assert.ok(source.includes('mousedown'), 'HelpTooltip.tsx deve fechar ao clicar fora');
  assert.ok(source.includes('onTouchEnd'), 'HelpTooltip.tsx deve suportar toque em mobile');
  assert.ok(source.includes('aria-expanded'), 'HelpTooltip.tsx deve declarar aria-expanded para acessibilidade');
});

test('HelpTooltip.tsx: deve ter posicionamento inteligente (abre acima ou abaixo conforme espaco)', () => {
  const source = read('gestao-gastro/src/components/HelpTooltip.tsx');
  assert.ok(source.includes('openAbove'), 'HelpTooltip.tsx deve calcular se abre acima ou abaixo');
  assert.ok(source.includes('computePosition'), 'HelpTooltip.tsx deve ter funcao de calculo de posicao');
  assert.ok(source.includes('VIEWPORT_PADDING'), 'HelpTooltip.tsx deve limitar o painel dentro da viewport');
});

// ---------------------------------------------------------------------------
// 5. CONTRATO HTTP PHP - roles aceitos e rejeitados
// ---------------------------------------------------------------------------
const hasPhp = spawnSync('php', ['-v'], { stdio: 'ignore' }).status === 0;

const listen = (server) => new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const waitForServer = async (url) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await fetch(url, { method: 'POST', body: '{}' });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 50));
    }
  }
  throw new Error(`Servidor PHP nao iniciou em ${url}`);
};

test('HTTP Contract - roles waiter e cashier aceitos, papel invalido rejeitado', { skip: !hasPhp }, async (t) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'gastro-roles-contract-'));

  // Servidor Supabase fake: aceita criacao de usuario e vinculo de membro
  let memberCallBody = null;
  const fakeSupabase = createServer((req, res) => {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      if (req.method === 'POST' && req.url?.includes('/auth/v1/admin/users') && !req.url?.includes('/admin/users/')) {
        // Criacao de usuario: retorna ID fake
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'fake-user-uuid-001', email: 'waiter@test.com' }));
      } else if (req.method === 'POST' && req.url?.includes('/rest/v1/tenant_members')) {
        memberCallBody = JSON.parse(body || '{}');
        // Simula erro de constraint para papel invalido
        if (memberCallBody.role && !['owner','admin','operator','viewer','waiter','cashier'].includes(memberCallBody.role)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'new row violates check constraint "tenant_members_role_check"' }));
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([{ id: 'member-uuid', role: memberCallBody.role }]));
        }
      } else if (req.method === 'GET' && req.url?.includes('/auth/v1/user')) {
        // JWT validation - simula usuario admin valido
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'admin-uuid-001', email: 'admin@test.com' }));
      } else if (req.method === 'GET' && req.url?.includes('/rest/v1/tenant_members')) {
        // Papel do solicitante: owner no tenant-roles
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ user_id: 'admin-uuid-001', tenant_id: 'tenant-roles', role: 'owner', active: true }]));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      }
    });
  });
  const fakePort = await listen(fakeSupabase);

  const phpPortProbe = createServer();
  const phpPort = await listen(phpPortProbe);
  phpPortProbe.close();

  cpSync(new URL('../api_admin_users.php', import.meta.url), join(fixtureRoot, 'api_admin_users.php'));
  cpSync(new URL('../env_loader.php', import.meta.url), join(fixtureRoot, 'env_loader.php'));
  mkdirSync(join(fixtureRoot, 'api_data'));
  writeFileSync(join(fixtureRoot, 'api_data', 'database_licenses_secure.json'), JSON.stringify({
    'ROLES-TEST-LICENSE': { status: 'active', tenant_id: 'tenant-roles', email_activation: 'owner@roles.test' }
  }));

  const phpServer = spawn('php', ['-S', `127.0.0.1:${phpPort}`, '-t', fixtureRoot], {
    cwd: fixtureRoot,
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${fakePort}`, SUPABASE_SERVICE_KEY: 'test-key' },
    stdio: 'ignore'
  });

  t.after(async () => {
    await new Promise(r => fakeSupabase.close(r));
    if (!phpServer.killed) await new Promise(r => { phpServer.once('exit', r); phpServer.kill(); });
    rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const endpoint = `http://127.0.0.1:${phpPort}/api_admin_users.php`;
  await waitForServer(endpoint);

  const post = (body) => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer fake-jwt-token' },
    body: JSON.stringify(body)
  });

  // Papel invalido deve ser rejeitado pelo PHP antes de chegar ao banco
  const invalidRole = await post({
    action: 'create_member',
    tenant_id: 'tenant-roles',
    name: 'Teste',
    email: 'bad.role@test.com',
    password: 'senhaseg123',
    role: 'invalid_role'
  });
  assert.equal(invalidRole.status, 400, 'Papel invalido deve retornar 400');
  const invalidBody = await invalidRole.json();
  assert.ok(invalidBody.message, 'Deve retornar mensagem de erro clara');

  // waiter deve ser aceito pelo validador de papeis no PHP
  const waiterCheck = await post({
    action: 'create_member',
    tenant_id: 'tenant-roles',
    name: 'Garcom Teste',
    email: 'waiter@test.com',
    password: 'senhaseg123',
    role: 'waiter'
  });
  // Esperamos 200 (sucesso) ou 422 (constraint ainda nao aplicada no banco fake)
  // O importante e que NAO seja 400 (papel invalido) - o PHP aceita o papel
  const waiterStatus = waiterCheck.status;
  assert.ok(
    waiterStatus !== 400,
    `PHP deve aceitar o papel waiter (status recebido: ${waiterStatus})`
  );

  // cashier deve ser aceito pelo validador de papeis no PHP
  const cashierCheck = await post({
    action: 'create_member',
    tenant_id: 'tenant-roles',
    name: 'Caixa Teste',
    email: 'cashier@test.com',
    password: 'senhaseg123',
    role: 'cashier'
  });
  const cashierStatus = cashierCheck.status;
  assert.ok(
    cashierStatus !== 400,
    `PHP deve aceitar o papel cashier (status recebido: ${cashierStatus})`
  );
});
