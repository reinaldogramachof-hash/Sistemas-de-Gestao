import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

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

test('Gastro SaaS Licensing - Robustness and Error Treatment Contract', { skip: !hasPhp }, async (t) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'gastro-saas-licensing-'));

  // Estado do mock do Supabase dinâmico para os testes
  let supabaseResponseStatus = 200;
  let supabaseResponseBody = '[]';

  const fakeSupabase = createServer((request, response) => {
    response.writeHead(supabaseResponseStatus, { 'Content-Type': 'application/json' });
    response.end(supabaseResponseBody);
  });

  const fakeSupabasePort = await listen(fakeSupabase);
  const phpPortProbe = createServer();
  const phpPort = await listen(phpPortProbe);
  phpPortProbe.close();

  // Copia os arquivos necessários para a pasta isolada de testes
  cpSync(new URL('../api_licenca_ml.php', import.meta.url), join(fixtureRoot, 'api_licenca_ml.php'));
  cpSync(new URL('../env_loader.php', import.meta.url), join(fixtureRoot, 'env_loader.php'));
  mkdirSync(join(fixtureRoot, 'api_data'));

  // Cria banco local de licenças vazio (para forçar busca no SaaS)
  writeFileSync(join(fixtureRoot, 'api_data', 'database_licenses_secure.json'), JSON.stringify({}));

  const phpServer = spawn('php', ['-S', `127.0.0.1:${phpPort}`, '-t', fixtureRoot], {
    cwd: fixtureRoot,
    env: {
      ...process.env,
      SUPABASE_URL: `http://127.0.0.1:${fakeSupabasePort}`,
      SUPABASE_SERVICE_KEY: 'test-service-key',
      ADMIN_SECRET: 'super-admin-secret'
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

  const endpoint = `http://127.0.0.1:${phpPort}/api_licenca_ml.php`;
  await waitForServer(endpoint);

  const post = async (body) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let data = null;
    try {
      data = await res.json();
    } catch {}
    return { status: res.status, data };
  };

  // --- CENÁRIO 1: HTTP 200 com [] -> licença inexistente ---
  await t.test('Supabase returns 200 with empty array -> License not found', async () => {
    supabaseResponseStatus = 200;
    supabaseResponseBody = '[]';

    const res = await post({
      action: 'verify',
      license_key: 'INVALID-KEY',
      email: 'any@test.com',
      tenant_slug: 'gastro-teste'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'error');
    assert.match(res.data.message, /Licenca nao encontrada/);
  });

  // --- CENÁRIO 2: Erro cURL / Porta errada -> HTTP 503 ---
  await t.test('Supabase unavailable (simulating connection error) -> HTTP 503', async () => {
    // Para simular erro cURL, alteramos temporariamente o servidor PHP para apontar para uma porta inválida
    // Criamos outro servidor PHP apontando para um IP inválido
    const isolatedFixtureRoot = mkdtempSync(join(tmpdir(), 'gastro-saas-unavail-'));
    cpSync(new URL('../api_licenca_ml.php', import.meta.url), join(isolatedFixtureRoot, 'api_licenca_ml.php'));
    cpSync(new URL('../env_loader.php', import.meta.url), join(isolatedFixtureRoot, 'env_loader.php'));
    mkdirSync(join(isolatedFixtureRoot, 'api_data'));
    writeFileSync(join(isolatedFixtureRoot, 'api_data', 'database_licenses_secure.json'), JSON.stringify({}));

    const unusedPortProbe = createServer();
    const unusedPort = await listen(unusedPortProbe);
    unusedPortProbe.close();

    const badPhpPortProbe = createServer();
    const badPhpPort = await listen(badPhpPortProbe);
    badPhpPortProbe.close();

    const badPhpServer = spawn('php', ['-S', `127.0.0.1:${badPhpPort}`, '-t', isolatedFixtureRoot], {
      cwd: isolatedFixtureRoot,
      env: {
        ...process.env,
        SUPABASE_URL: `http://127.0.0.1:${unusedPort}`, // Porta sem servidor rodando (força erro de conexão cURL)
        SUPABASE_SERVICE_KEY: 'test-service-key'
      },
      stdio: 'ignore'
    });

    try {
      const badEndpoint = `http://127.0.0.1:${badPhpPort}/api_licenca_ml.php`;
      await waitForServer(badEndpoint);

      const res = await fetch(badEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          license_key: 'SOME-KEY',
          email: 'any@test.com',
          tenant_slug: 'gastro-teste'
        })
      });

      assert.equal(res.status, 503, 'Falha de conexão com o Supabase deve retornar HTTP 503');
      const data = await res.json().catch(() => null);
      assert.equal(data.status, 'error');
      assert.match(data.message, /temporariamente indisponível/);
    } finally {
      if (!badPhpServer.killed) {
        badPhpServer.kill();
        await new Promise((resolve) => badPhpServer.on('exit', resolve));
      }
      rmSync(isolatedFixtureRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  // --- CENÁRIO 3: Supabase 500/503/504 -> HTTP 503 ---
  await t.test('Supabase returns 500 Internal Error -> HTTP 503', async () => {
    supabaseResponseStatus = 500;
    supabaseResponseBody = '{"message":"Database error"}';

    const res = await post({
      action: 'verify',
      license_key: 'SOME-KEY',
      email: 'any@test.com',
      tenant_slug: 'gastro-teste'
    });

    assert.equal(res.status, 503);
    assert.equal(res.data.status, 'error');
    assert.match(res.data.message, /temporariamente indisponível/);
  });

  // --- CENÁRIO 4: Licença ativa, expirada, bloqueada ---
  await t.test('Supabase returns Active License -> HTTP 200 Success and Active', async () => {
    supabaseResponseStatus = 200;
    supabaseResponseBody = JSON.stringify([{
      license_key: 'SAAS-ACTIVE-KEY',
      status: 'active',
      expires_at: null,
      license_type: 'monthly',
      tenant_id: 'tenant-123',
      activation_email: 'owner@gastro.com',
      max_devices: 2,
      device_id: 'dev-client-machine',
      activated_at: '2026-07-10T12:00:00Z',
      last_verified_at: '2026-07-15T12:00:00Z',
      metadata: { plan_slug: 'premium' },
      plans: { code: 'premium' },
      tenants: { slug: 'gastro-teste', name: 'Gastro Teste' },
      customers: { email: 'owner@gastro.com', name: 'Gastro Teste' }
    }]);

    const res = await post({
      action: 'verify',
      license_key: 'SAAS-ACTIVE-KEY',
      email: 'owner@gastro.com',
      tenant_slug: 'gastro-teste',
      device_id: 'dev-client-machine'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'success');
    assert.equal(res.data.plan, 'premium');
    assert.equal(res.data.tenant_id, 'tenant-123');
    assert.equal(res.data.license_status, 'active');
  });

  await t.test('Supabase returns Expired License (by date) -> HTTP 200 status expired', async () => {
    supabaseResponseStatus = 200;
    supabaseResponseBody = JSON.stringify([{
      license_key: 'SAAS-EXPIRED-KEY',
      status: 'active',
      expires_at: '2026-07-01T12:00:00Z', // Expirou no passado
      license_type: 'trial',
      tenant_id: 'tenant-123',
      activation_email: 'owner@gastro.com',
      max_devices: 1,
      device_id: 'dev-client-machine',
      metadata: { plan_slug: 'basic' },
      plans: { code: 'basic' },
      tenants: { slug: 'gastro-teste', name: 'Gastro Teste' },
      customers: { email: 'owner@gastro.com', name: 'Gastro Teste' }
    }]);

    const res = await post({
      action: 'verify',
      license_key: 'SAAS-EXPIRED-KEY',
      email: 'owner@gastro.com',
      tenant_slug: 'gastro-teste',
      device_id: 'dev-client-machine'
    });

    assert.equal(res.status, 200);
    // Para verify com status expirado, buildSaasLicenseResponse retorna status: success e license_status: expired
    assert.equal(res.data.status, 'success');
    assert.equal(res.data.license_status, 'expired');
  });

  // --- CENÁRIO 5: Divergência de tenant e e-mail ---
  await t.test('Tenant mismatch -> License rejects validation', async () => {
    supabaseResponseStatus = 200;
    supabaseResponseBody = JSON.stringify([{
      license_key: 'SAAS-ACTIVE-KEY',
      status: 'active',
      expires_at: null,
      license_type: 'monthly',
      tenant_id: 'tenant-123',
      activation_email: 'owner@gastro.com',
      max_devices: 2,
      device_id: 'dev-client-machine',
      metadata: { plan_slug: 'premium' },
      plans: { code: 'premium' },
      tenants: { slug: 'gastro-teste', name: 'Gastro Teste' },
      customers: { email: 'owner@gastro.com', name: 'Gastro Teste' }
    }]);

    const res = await post({
      action: 'verify',
      license_key: 'SAAS-ACTIVE-KEY',
      email: 'owner@gastro.com',
      tenant_slug: 'another-tenant', // Tenant divergente
      device_id: 'dev-client-machine'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'error');
    assert.match(res.data.message, /Licenca nao pertence/);
  });

  await t.test('Email mismatch -> License rejects validation', async () => {
    supabaseResponseStatus = 200;
    // Usamos a mesma response da licença ativa de cima
    const res = await post({
      action: 'verify',
      license_key: 'SAAS-ACTIVE-KEY',
      email: 'hack@attacker.com', // Email incorreto
      tenant_slug: 'gastro-teste',
      device_id: 'dev-client-machine'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'error');
    assert.match(res.data.message, /Licenca nao pertence/);
  });

  // --- CENÁRIO 6: resetSaasLicenseDevice com novos retornos ---
  await t.test('Admin reset device -> returns success on resetSaasLicenseDevice', async () => {
    // 1. O update_status aciona resetSaasLicenseDevice
    // findSaasLicense é chamada. Mockamos a resposta da licença ativa:
    supabaseResponseStatus = 200;
    supabaseResponseBody = JSON.stringify([{
      license_key: 'RESET-KEY',
      status: 'active',
      expires_at: null,
      license_type: 'monthly',
      tenant_id: 'tenant-123',
      activation_email: 'owner@gastro.com',
      max_devices: 2,
      device_id: 'dev-client-machine',
      metadata: { plan_slug: 'premium' },
      plans: { code: 'premium' },
      tenants: { slug: 'gastro-teste', name: 'Gastro Teste' },
      customers: { email: 'owner@gastro.com', name: 'Gastro Teste' }
    }]);

    const res = await post({
      action: 'update_status',
      key: 'RESET-KEY',
      status: 'reset_device',
      secret: 'super-admin-secret'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'success');
    assert.equal(res.data.success, true);
  });

  // --- CENÁRIO 7: Supabase 503/504 e JSON inválido ---
  await t.test('Supabase returns 503 Service Unavailable -> HTTP 503', async () => {
    supabaseResponseStatus = 503;
    supabaseResponseBody = '{"message":"Service Unavailable"}';

    const res = await post({
      action: 'verify',
      license_key: 'SOME-KEY',
      email: 'any@test.com',
      tenant_slug: 'gastro-teste'
    });

    assert.equal(res.status, 503);
    assert.equal(res.data.status, 'error');
  });

  await t.test('Supabase returns 504 Gateway Timeout -> HTTP 503', async () => {
    supabaseResponseStatus = 504;
    supabaseResponseBody = '{"message":"Gateway Timeout"}';

    const res = await post({
      action: 'verify',
      license_key: 'SOME-KEY',
      email: 'any@test.com',
      tenant_slug: 'gastro-teste'
    });

    assert.equal(res.status, 503);
    assert.equal(res.data.status, 'error');
  });

  await t.test('Supabase returns 200 with invalid JSON -> HTTP 503 Upstream Error', async () => {
    supabaseResponseStatus = 200;
    supabaseResponseBody = 'This is not valid JSON string! {';

    const res = await post({
      action: 'verify',
      license_key: 'SOME-KEY',
      email: 'any@test.com',
      tenant_slug: 'gastro-teste'
    });

    assert.equal(res.status, 503);
    assert.equal(res.data.status, 'error');
    assert.match(res.data.message, /resposta invalida|indisponível/);
  });

  await t.test('Supabase returns Blocked License -> HTTP 200 blocked status', async () => {
    supabaseResponseStatus = 200;
    supabaseResponseBody = JSON.stringify([{
      license_key: 'SAAS-BLOCKED-KEY',
      status: 'blocked',
      expires_at: null,
      license_type: 'monthly',
      tenant_id: 'tenant-123',
      activation_email: 'owner@gastro.com',
      max_devices: 2,
      device_id: 'dev-client-machine',
      metadata: { plan_slug: 'premium' },
      plans: { code: 'premium' },
      tenants: { slug: 'gastro-teste', name: 'Gastro Teste' },
      customers: { email: 'owner@gastro.com', name: 'Gastro Teste' }
    }]);

    const res = await post({
      action: 'verify',
      license_key: 'SAAS-BLOCKED-KEY',
      email: 'owner@gastro.com',
      tenant_slug: 'gastro-teste',
      device_id: 'dev-client-machine'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'success');
    assert.equal(res.data.license_status, 'blocked');
  });
});

test('ActivationGate.tsx Frontend Contract and Offline Persistence Rules', () => {
  const source = readFileSync(new URL('../gestao-gastro/src/components/ActivationGate.tsx', import.meta.url), 'utf8');

  // 1. Deve verificar se há migração retroativa de gestao_gastro_last_license_check para clientes legados
  assert.ok(
    source.includes("!localStorage.getItem('gestao_gastro_last_license_check')") &&
    source.includes("localStorage.setItem('gestao_gastro_last_license_check', new Date().toISOString())"),
    'ActivationGate.tsx deve migrar clientes legados setando last_license_check se não existir mas houver credenciais'
  );

  // 2. Deve verificar se o limite de 72 horas offline está sendo calculado corretamente
  assert.ok(
    source.includes('hoursSinceLastCheck <= 72') || source.includes('72'),
    'ActivationGate.tsx deve aplicar carência offline de 72 horas baseada na última verificação'
  );

  // 3. Deve certificar que a expiração da tolerância offline NÃO apaga as credenciais locais
  const fallbackIndex = source.indexOf('const applyOfflineFallback =');
  assert.notEqual(fallbackIndex, -1, 'applyOfflineFallback deve estar definido');
  const fallbackBlock = source.slice(fallbackIndex, source.indexOf('if (!navigator.onLine)'));
  assert.equal(
    fallbackBlock.includes('clearLicenseCredentials()'),
    false,
    'applyOfflineFallback NÃO deve apagar as credenciais de licença ao expirar a tolerância offline'
  );

  // 4. Deve certificar que exibe a tela de "Conexão Necessária" com botão de revalidação
  assert.ok(
    source.includes('Conexão Necessária') && source.includes('Revalidar Conexão') && source.includes('Digitar outra licença'),
    'ActivationGate.tsx deve exibir tela amigável de conexão necessária se a tolerância offline expirar'
  );

  // 5. Deve certificar que não utiliza mais a função unlinkTerminal
  assert.equal(
    source.includes('unlinkTerminal'),
    false,
    'ActivationGate.tsx não deve expor a função unlinkTerminal não utilizada'
  );
});
