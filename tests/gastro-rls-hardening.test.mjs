import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync(
  new URL('../gestao-gastro/supabase/migrations/20260714_gastro_rls_hardening.sql', import.meta.url),
  'utf8',
);

test('RLS hardening keeps tenant membership checks in a private schema', () => {
  assert.match(migration, /CREATE SCHEMA IF NOT EXISTS app_private/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /REVOKE ALL ON FUNCTION app_private\.tenant_role\(UUID\) FROM PUBLIC/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION app_private\.is_tenant_member\(UUID\) TO authenticated/);
});

test('waiters can only change their own open orders and cannot manage memberships from the browser', () => {
  assert.match(migration, /Direct browser writes to memberships are deliberately denied/);
  assert.match(migration, /waiter_id = \(SELECT auth\.uid\(\)\)::TEXT AND status = 'open'/);
  assert.match(migration, /Administracao pode excluir pedidos/);
  assert.doesNotMatch(migration, /CREATE POLICY "Admin\/owner do tenant podem gerenciar membros"/);
});
