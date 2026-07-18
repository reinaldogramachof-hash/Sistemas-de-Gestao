import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const api = readFileSync(join(root, 'api_admin_users.php'), 'utf8');
const auditHook = readFileSync(join(root, 'gestao-gastro', 'src', 'hooks', 'useAudit.ts'), 'utf8');
const migration = readFileSync(join(root, 'supabase', 'migrations', '20260717_gastro_tenant_access_and_audit_hardening.sql'), 'utf8');
const privilegeMigration = readFileSync(join(root, 'supabase', 'migrations', '20260718214429_gastro_tenant_table_privilege_hardening.sql'), 'utf8');
const settingsMigration = readFileSync(join(root, 'supabase', 'migrations', '20260718214659_gastro_waiter_settings_atomic_update.sql'), 'utf8');

test('eventos enviados pelo cliente são distinguíveis de eventos administrativos', () => {
  assert.match(api, /\$actionName = 'client\.' \./);
  assert.match(api, /get_member_role\(\$adminUserId, \$tenantId\)/);
  assert.match(api, /write_saas_audit\(\$adminUserId, \$tenantId, \$actionName/);
});

test('auditoria remota não incorpora texto descritivo no nome do evento', () => {
  assert.match(auditHook, /action: type\.replace/);
  assert.doesNotMatch(auditHook, /action: `\$\{type\}:\$\{detail\}`/);
  assert.match(auditHook, /sanitizeAuditMetadata\(extra\)/);
});

test('origem LAN é validada como IPv4 privado completo e porta válida', () => {
  assert.match(api, /function is_valid_private_lan_origin/);
  assert.match(api, /FILTER_VALIDATE_IP, FILTER_FLAG_IPV4/);
  assert.match(api, /\$port < 1 \|\| \$port > 65535/);
  assert.ok(api.includes("preg_match('/^172\\.(1[6-9]|2\\d|3[01])\\./'"));
});

test('políticas Supabase autorizam por membro ativo do mesmo tenant', () => {
  assert.match(migration, /ON public\.tenant_modules FOR SELECT TO authenticated[\s\S]*member\.tenant_id = tenant_modules\.tenant_id[\s\S]*member\.user_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /ON public\.saas_audit_logs FOR SELECT TO authenticated[\s\S]*member\.tenant_id = saas_audit_logs\.tenant_id[\s\S]*member\.role IN \('owner', 'admin'\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.purge_saas_audit_logs\(integer\) FROM PUBLIC, anon, authenticated/);
});

test('tabelas expostas mantêm privilégio mínimo para usuários da aplicação', () => {
  assert.match(privilegeMigration, /REVOKE ALL ON TABLE public\.tenant_modules FROM anon, authenticated/);
  assert.match(privilegeMigration, /GRANT SELECT ON TABLE public\.tenant_modules TO authenticated/);
  assert.match(privilegeMigration, /REVOKE ALL ON TABLE public\.saas_audit_logs FROM anon, authenticated/);
});

test('configuração do garçom é atualizada atomicamente e apenas pelo servidor', () => {
  assert.match(api, /rpc\/set_tenant_waiter_access_settings/);
  assert.doesNotMatch(api, /\/rest\/v1\/tenants\?id=eq\.[^\n]+\['metadata' => \$metadata\]/);
  assert.match(settingsMigration, /metadata = COALESCE\(metadata, '\{\}'::jsonb\)[\s\S]*jsonb_build_object\('waiter_access', p_settings\)/);
  assert.match(settingsMigration, /REVOKE ALL ON FUNCTION public\.set_tenant_waiter_access_settings\(uuid, jsonb\)[\s\S]*FROM PUBLIC, anon, authenticated/);
});
