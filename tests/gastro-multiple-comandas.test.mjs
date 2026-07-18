import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const migrationPath = join(
  root,
  'gestao-gastro',
  'supabase',
  'migrations',
  '20260718201532_gastro_multiple_comandas.sql',
);
const migration = readFileSync(migrationPath, 'utf8');

const functionBody = (name) => {
  const match = migration.match(
    new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`,
      'i',
    ),
  );

  assert.ok(match, `migration must define ${name}`);
  return match[0];
};

test('migration adds dedicated labels and offline idempotency keys', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS comanda_label varchar\(80\)/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS offline_id_key text/i);
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS restaurant_orders_open_comanda_label_key[\s\S]*lower\(btrim\(comanda_label\)\)[\s\S]*status = 'open'/i,
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS restaurant_orders_offline_id_key_key[\s\S]*\(tenant_id, offline_id_key\)[\s\S]*WHERE offline_id_key IS NOT NULL/i,
  );
});

test('existing open table orders receive deterministic labels', () => {
  assert.match(
    migration,
    /row_number\(\) OVER \([\s\S]*PARTITION BY tenant_id, table_number[\s\S]*ORDER BY created_at, id/i,
  );
  assert.match(migration, /WHEN ranked\.position = 1 THEN 'Comanda Geral'/i);
  assert.match(migration, /ELSE 'Comanda ' \|\| ranked\.position::text/i);
});

test('create RPC is idempotent and preserves the oldest order as compatibility anchor', () => {
  const body = functionBody('gastro_create_comanda_rpc');

  assert.match(body, /SECURITY INVOKER/i);
  assert.doesNotMatch(body, /SECURITY DEFINER/i);
  assert.match(body, /FROM public\.restaurant_tables[\s\S]*FOR UPDATE/i);
  assert.match(
    body,
    /ON CONFLICT \(tenant_id, offline_id_key\)[\s\S]*WHERE offline_id_key IS NOT NULL[\s\S]*DO NOTHING/i,
  );
  assert.match(
    body,
    /AND status = 'open'[\s\S]*ORDER BY created_at, id[\s\S]*LIMIT 1/i,
  );
  assert.match(body, /SET status = 'ocupada',[\s\S]*active_order_id = v_table\.active_order_id/i);
});

test('close RPC only releases a table after its last open check', () => {
  const body = functionBody('gastro_close_comanda_rpc');

  assert.match(body, /SECURITY INVOKER/i);
  assert.match(body, /AND status = 'open'[\s\S]*RETURNING \* INTO v_order/i);
  assert.match(
    body,
    /SELECT id[\s\S]*AND table_number = v_order\.table_number[\s\S]*AND status = 'open'[\s\S]*ORDER BY created_at, id/i,
  );
  assert.match(
    body,
    /SET status = CASE WHEN v_next_order_id IS NULL THEN 'livre' ELSE 'ocupada' END,[\s\S]*active_order_id = v_next_order_id/i,
  );
});

test('transfer RPC moves one check and reconciles both table states', () => {
  const body = functionBody('gastro_transfer_comanda_rpc');

  assert.match(body, /number IN \(v_source_table_number, p_target_table_number\)[\s\S]*ORDER BY number[\s\S]*FOR UPDATE/i);
  assert.match(body, /v_target_table\.status <> 'livre'/i);
  assert.match(body, /SET table_number = p_target_table_number/i);
  assert.match(
    body,
    /SET status = CASE WHEN v_source_active_order_id IS NULL THEN 'livre' ELSE 'ocupada' END/i,
  );
  assert.match(
    body,
    /SET status = 'ocupada',[\s\S]*active_order_id = v_order\.id/i,
  );
});

test('release RPC refuses to clear tables with any open check', () => {
  const body = functionBody('gastro_release_table_rpc');

  assert.match(body, /FROM public\.restaurant_tables[\s\S]*FOR UPDATE/i);
  assert.match(
    body,
    /IF EXISTS \([\s\S]*table_number = p_table_number[\s\S]*status = 'open'[\s\S]*RAISE EXCEPTION 'Mesa possui comandas abertas'/i,
  );
});

test('all public RPCs are restricted to authenticated callers and service role', () => {
  for (const name of [
    'gastro_create_comanda_rpc',
    'gastro_close_comanda_rpc',
    'gastro_transfer_comanda_rpc',
    'gastro_release_table_rpc',
  ]) {
    assert.match(
      migration,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([\\s\\S]*?FROM PUBLIC, anon;`, 'i'),
    );
    assert.match(
      migration,
      new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([\\s\\S]*?TO authenticated, service_role;`, 'i'),
    );
  }
});
