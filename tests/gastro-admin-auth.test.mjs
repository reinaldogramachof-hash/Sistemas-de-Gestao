import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Inspect AdminAuthGate.tsx for security structure and first access flow', () => {
  const source = read('gestao-gastro/src/components/AdminAuthGate.tsx');

  // a) Deve fazer chamadas corretas à API PHP para buscar status e cadastrar administradora
  assert.ok(
    source.includes('get_owner_status') && source.includes('create_owner'),
    'AdminAuthGate.tsx deve conter as ações get_owner_status e create_owner'
  );

  // b) Deve fazer login pelo Supabase Auth
  assert.ok(
    source.includes('signInWithPassword') && source.includes('onAuthStateChange'),
    'AdminAuthGate.tsx deve gerenciar login e mudanças de estado usando Supabase Auth'
  );

  // c) Deve validar a permissão de membros de forma segura
  assert.ok(
    (source.includes('tenant_members') || source.includes('validate_member_access')) && source.includes('role'),
    'AdminAuthGate.tsx deve verificar cargo e ativação de membros'
  );
});

test('Inspect api_admin_users.php for secure actions and JWT validation', () => {
  const source = read('api_admin_users.php');

  // a) Deve validar JWT enviando requisição para a API do Supabase Auth /auth/v1/user
  assert.ok(
    source.includes('/auth/v1/user') && source.includes('Authorization'),
    'api_admin_users.php deve validar o JWT enviando requisição para o auth do Supabase'
  );

  // b) Deve suportar as 4 ações fundamentais
  assert.ok(
    source.includes('get_owner_status') && source.includes('create_owner') &&
    source.includes('create_member') && source.includes('toggle_member_status'),
    'api_admin_users.php deve implementar get_owner_status, create_owner, create_member e toggle_member_status'
  );

  // c) Deve ter tratamento RLS e restrições de permissão (apenas owner/admin gerenciam membros)
  assert.ok(
    source.includes('tenant_members') && source.includes('role') && (source.includes('owner') || source.includes('admin')),
    'api_admin_users.php deve verificar permissões administrativas antes de gerenciar equipe'
  );

  assert.ok(source.includes("'display_name' => $name") && source.includes('user_metadata'));
  assert.ok(
    source.includes("'active' => true,\n        'display_name' => $name"),
    'api_admin_users.php deve gravar display_name no vinculo tenant_members'
  );
  assert.equal(
    source.includes("'cantinho-da-resenha' => 'cd8f21f4-73a1-4c87-a385-9b6deacaeae7'"),
    false,
    'api_admin_users.php nao deve manter fallback do Cantinho para tenant legado'
  );
  assert.equal(
    source.includes("'cantinhodaresenha' => 'cd8f21f4-73a1-4c87-a385-9b6deacaeae7'"),
    false,
    'api_admin_users.php nao deve manter alias do Cantinho apontando para tenant legado'
  );
});

test('Inspect api_licenca_ml.php for Gastro activation and verification contract', () => {
  const source = read('api_licenca_ml.php');

  const activateStart = source.indexOf("if ($action === 'activate')");
  const verifyStart = source.indexOf("if ($action === 'verify')");
  assert.notEqual(activateStart, -1, 'api_licenca_ml.php deve implementar action activate');
  assert.notEqual(verifyStart, -1, 'api_licenca_ml.php deve implementar action verify');

  const activateBlock = source.slice(activateStart, verifyStart);
  const verifyBlock = source.slice(verifyStart, source.indexOf("if ($action === 'confirm_receipt'"));

  assert.ok(
    activateBlock.includes("'tenant_id'") && activateBlock.includes("'plan'") && activateBlock.includes("'is_master'"),
    'activate deve devolver tenant_id, plan e is_master para o ActivationGate validar o restaurante sem revogar a licenca'
  );

  assert.ok(
    verifyBlock.includes("'tenant_id'") && verifyBlock.includes("'plan'") && verifyBlock.includes("'is_master'"),
    'verify deve devolver tenant_id, plan e is_master para manter a sessao licenciada no tenant correto'
  );
  assert.equal(
    source.includes("'cantinho-da-resenha' => 'cd8f21f4-73a1-4c87-a385-9b6deacaeae7'"),
    false,
    'api_licenca_ml.php nao deve manter fallback do Cantinho para tenant legado'
  );
});

test('Inspect AppContext.tsx for empty states, reloadCollaborators and mock clearance on first access', () => {
  const source = read('gestao-gastro/src/store/AppContext.tsx');

  // a) Deve expor reloadCollaborators no contexto
  assert.ok(
    source.includes('reloadCollaborators') && source.includes('reloadCollaborators: () => Promise<void>'),
    'AppContext.tsx deve declarar e exportar a função reloadCollaborators'
  );

  // b) Deve limpar os dados de demonstração fictícios no primeiro acesso do cliente
  assert.ok(
    source.includes('gastro_cantinho_initialized') && source.includes('settings') && source.includes('stockItems') && source.includes('collaborators'),
    'AppContext.tsx deve rodar rotina de limpeza de mocks fictícios no primeiro acesso'
  );

  // c) O primeiro acesso define o nome do restaurante e mantém o cardápio real do Supabase
  assert.ok(
    source.includes('Cantinho da Resenha') && source.includes('listActiveProducts'),
    'AppContext.tsx deve manter o catálogo real baixando os produtos ativos na inicialização'
  );
});

test('Inspect comandaAccess.ts and Settings.tsx for localTestOrigin validation', () => {
  const comandaSource = read('gestao-gastro/src/utils/comandaAccess.ts');
  const settingsSource = read('gestao-gastro/src/components/Settings.tsx');

  // a) comandaAccess.ts suporta o terceiro parâmetro localTestOrigin
  assert.ok(
    comandaSource.includes('localTestOrigin') && comandaSource.includes('localhost') && comandaSource.includes('sistemasdegestao.tech'),
    'comandaAccess.ts deve suportar localTestOrigin e forçar domínio HTTPS em produção'
  );

  // b) Settings.tsx renderiza campo de IP local com validações e gerencia equipe remota
  assert.ok(
    settingsSource.includes('localTestOrigin') && settingsSource.includes('toggle_member_status') && settingsSource.includes('create_member'),
    'Settings.tsx deve renderizar o input de IP local, permitir cadastro de membros e alteração de status remoto'
  );
});

test('Verify that frontend does not contain service_role, secret_key or bypass mechanisms', () => {
  const adminGate = read('gestao-gastro/src/components/AdminAuthGate.tsx');
  const appContext = read('gestao-gastro/src/store/AppContext.tsx');
  const settings = read('gestao-gastro/src/components/Settings.tsx');

  const forbiddenKeys = ['service_role', 'SERVICE_ROLE', 'supabase_admin', 'serviceRole', 'secret_key', 'bypass'];

  for (const key of forbiddenKeys) {
    assert.equal(adminGate.includes(key), false, `AdminAuthGate.tsx não deve conter a palavra proibida: ${key}`);
    assert.equal(appContext.includes(key), false, `AppContext.tsx não deve conter a palavra proibida: ${key}`);
    assert.equal(settings.includes(key), false, `Settings.tsx não deve conter a palavra proibida: ${key}`);
  }
});

test('Inspect single owner SQL migration file existence and structure', () => {
  const migrationPath = 'gestao-gastro/supabase/migrations/20260714_gastro_single_owner.sql';
  assert.ok(existsSync(new URL(`../${migrationPath}`, import.meta.url)), 'Arquivo de migração 20260714_gastro_single_owner.sql deve existir');

  const content = read(migrationPath);
  assert.ok(content.includes('CREATE UNIQUE INDEX'), 'A migração deve criar um índice único');
  assert.ok(content.includes("role = 'owner'"), 'A migração deve filtrar pelo cargo owner');
  assert.ok(content.includes('active = true'), 'A migração deve filtrar apenas por donas ativas');
  assert.ok(content.includes('HAVING COUNT(*) > 1'), 'A migração deve bloquear duplicidades já existentes antes de criar o índice');
});

const hasPhp = spawnSync('php', ['-v'], { stdio: 'ignore' }).status === 0;

const listen = (server) => new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const waitForServer = async (url) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fetch(url, { method: 'POST', body: '{}' });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error(`Servidor PHP não iniciou em ${url}`);
};

test('HTTP Contract - license proof rejects tenant and email mismatch using an isolated fixture', { skip: !hasPhp }, async (t) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'gastro-admin-contract-'));
  const fakeSupabase = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(request.url?.startsWith('/rest/v1/tenant_members') ? '[]' : '{}');
  });
  const fakeSupabasePort = await listen(fakeSupabase);
  const phpPortProbe = createServer();
  const phpPort = await listen(phpPortProbe);
  phpPortProbe.close();

  cpSync(new URL('../api_admin_users.php', import.meta.url), join(fixtureRoot, 'api_admin_users.php'));
  cpSync(new URL('../env_loader.php', import.meta.url), join(fixtureRoot, 'env_loader.php'));
  mkdirSync(join(fixtureRoot, 'api_data'));
  writeFileSync(join(fixtureRoot, 'api_data', 'database_licenses_secure.json'), JSON.stringify({
    'TEST-ONLY-LICENSE': {
      status: 'active',
      tenant_id: 'tenant-contract',
      email_activation: 'owner.contract@example.test'
    },
    'CANTINHO-SLUG-ONLY': {
      status: 'active',
      tenant_slug: 'cantinho-da-resenha',
      email_activation: 'cantinho.owner@example.test'
    }
  }));

  const phpServer = spawn('php', ['-S', `127.0.0.1:${phpPort}`, '-t', fixtureRoot], {
    cwd: fixtureRoot,
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${fakeSupabasePort}`,
      SUPABASE_SERVICE_KEY: 'contract-service-key'
    },
    stdio: 'ignore'
  });

  t.after(async () => {
    await new Promise((resolve) => fakeSupabase.close(resolve));
    if (!phpServer.killed) {
      await new Promise((resolve) => {
        phpServer.once('exit', resolve);
        phpServer.kill();
      });
    }
    rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  const endpoint = `http://127.0.0.1:${phpPort}/api_admin_users.php`;
  await waitForServer(endpoint);
  const post = async (body) => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const wrongTenant = await post({
    action: 'create_owner', tenant_id: 'tenant-other', license_key: 'TEST-ONLY-LICENSE',
    email: 'owner.contract@example.test', name: 'Owner', password: 'password123'
  });
  assert.equal(wrongTenant.status, 403, 'A licença não pode criar owner em outro tenant');

  const wrongEmail = await post({
    action: 'create_owner', tenant_id: 'tenant-contract', license_key: 'TEST-ONLY-LICENSE',
    email: 'other.contract@example.test', name: 'Owner', password: 'password123'
  });
  assert.equal(wrongEmail.status, 403, 'A licença não pode criar owner com e-mail divergente');

  const validProof = await post({
    action: 'get_owner_status', tenant_id: 'tenant-contract', license_key: 'TEST-ONLY-LICENSE',
    email: 'owner.contract@example.test'
  });
  const validProofBody = await validProof.text();
  assert.equal(validProof.status, 200, `A licença isolada válida deve passar pela validação do endpoint: ${validProofBody}`);
  assert.deepEqual(JSON.parse(validProofBody), { status: 'success', has_owner: false });

  const retiredCantinhoSlugOnly = await post({
    action: 'get_owner_status',
    tenant_id: 'cd8f21f4-73a1-4c87-a385-9b6deacaeae7',
    license_key: 'CANTINHO-SLUG-ONLY',
    email: 'cantinho.owner@example.test'
  });
  const retiredCantinhoSlugOnlyBody = await retiredCantinhoSlugOnly.text();
  assert.equal(
    retiredCantinhoSlugOnly.status,
    403,
    `Licenca antiga do Cantinho sem tenant_id nao deve mapear o tenant legado: ${retiredCantinhoSlugOnlyBody}`
  );
});

test('Inspect Layout.tsx for dynamic profile, dropdown and logout button', () => {
  const source = read('gestao-gastro/src/components/Layout.tsx');

  // a) Deve consumir currentUser e exibir nome/cargo
  assert.ok(
    source.includes('currentUser') && source.includes('currentUser.name') && source.includes('currentUser.role'),
    'Layout.tsx deve consumir currentUser para exibir perfil dinâmico'
  );

  // b) Deve renderizar dropdown interativo com botão "Sair" e acionar handleLogout
  assert.ok(
    source.includes('showProfileMenu') && source.includes('handleLogout') && source.includes('Sair'),
    'Layout.tsx deve gerenciar o estado showProfileMenu e botão Sair que aciona o handleLogout'
  );

  // c) No logout, deve chamar auth.signOut e limpar local/session storage
  assert.ok(
    source.includes('signOut') && source.includes('removeItem') && source.includes('gestao_gastro_user_name'),
    'Layout.tsx deve limpar sessões locais e chamar signOut do Supabase Auth'
  );
});

test('Inspect AppContext.tsx for prefixing localstorage keys and initializeTables method', () => {
  const source = read('gestao-gastro/src/store/AppContext.tsx');

  // a) Deve gerar chaves prefixadas por tenant usando getTenantKey
  assert.ok(
    source.includes('getTenantKey') && source.includes('gestao_gastro:'),
    'AppContext.tsx deve implementar getTenantKey para isolamento por tenant'
  );

  // b) Deve expor initializeTables no contexto
  assert.ok(
    source.includes('initializeTables: initializeTenantTables') || source.includes('initializeTenantTables'),
    'AppContext.tsx deve implementar e expor initializeTables para inicialização'
  );

  // c) ResetToMocks restringe limpeza apenas de chaves do tenant atual em SaaS
  assert.ok(
    source.includes('resetToMocks') && source.includes('isSaaS') && source.includes('window.confirm') &&
    source.includes('CANTINHO_CLEANUP_VERSION') &&
    source.includes('CANTINHO_OPERATIONAL_KEYS_TO_CLEAR') &&
    source.includes("localStorage.removeItem('garcom_offline_queue')"),
    'AppContext.tsx deve pedir confirmação e limpar seletivamente chaves do tenant'
  );
});

test('Inspect Settings.tsx for private LAN IP validation regex', () => {
  const source = read('gestao-gastro/src/components/Settings.tsx');

  // a) Deve usar validateLanOrigin importado do utilitário centralizado
  assert.ok(
    source.includes('validateLanOrigin') && source.includes('result.valid'),
    'Settings.tsx deve usar validateLanOrigin centralizado do utilitário'
  );

  // b) Deve renderizar a aba "Mesas do salão" com totalizador e botão de inicialização
  assert.ok(
    source.includes('tables') && source.includes('initializeTables') &&
    source.includes('withTimeout') &&
    source.includes('Deteccao automatica indisponivel neste endereco online') &&
    source.includes('Detectar endereco atual'),
    'Settings.tsx deve renderizar a aba de gerenciamento de mesas'
  );
});

test('Inspect HelpTooltip.tsx for HELP_CONTENTS static mapping', () => {
  const source = read('gestao-gastro/src/components/HelpTooltip.tsx');

  // a) Deve conter dicionário estático HELP_CONTENTS mapeando as views do manual
  assert.ok(
    source.includes('HELP_CONTENTS') && source.includes('guide_dashboard') && source.includes('guide_pdv'),
    'HelpTooltip.tsx deve conter mapeamento estático HELP_CONTENTS'
  );

  // b) Deve aceitar prop moduleKey
  assert.ok(
    source.includes('moduleKey') && source.includes('HelpTooltipProps'),
    'HelpTooltip.tsx deve definir moduleKey na tipagem de props'
  );
});
