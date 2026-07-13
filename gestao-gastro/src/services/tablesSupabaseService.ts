import { supabase } from '../lib/supabase';
import type { Table } from '../types';

// ─── Row shapes ──────────────────────────────────────────────────────────────

interface TableRow {
  id: string;
  tenant_id: string;
  number: number;
  status: 'livre' | 'ocupada' | 'aguardando' | 'reservada';
  active_order_id: string | null;
  reservation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type UpdateTableInput = Partial<Omit<Table, 'number'>>;

interface TableUpdatePayload {
  status?: 'livre' | 'ocupada' | 'aguardando' | 'reservada';
  active_order_id?: string | null;
  reservation_reason?: string | null;
  updated_at?: string;
}

interface TableInsertRow {
  tenant_id: string;
  number: number;
  status: 'livre' | 'ocupada' | 'aguardando' | 'reservada';
  active_order_id: string | null;
  reservation_reason: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const throwIfError = (message: string, error: { message: string } | null) => {
  if (error) throw new Error(`${message}: ${error.message}`);
};

const toTable = (row: TableRow): Table => ({
  number: row.number,
  status: row.status,
  activeOrderId: row.active_order_id ?? undefined,
  reservationReason: row.reservation_reason ?? undefined,
});

const toUpdatePayload = (data: UpdateTableInput): TableUpdatePayload => {
  const payload: TableUpdatePayload = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) payload.status = data.status;
  if (data.activeOrderId !== undefined) payload.active_order_id = data.activeOrderId;
  if (data.reservationReason !== undefined) payload.reservation_reason = data.reservationReason;
  return payload;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listTables(tenantId: string): Promise<Table[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('number', { ascending: true })
    .returns<TableRow[]>();

  throwIfError('Erro ao listar mesas', error);
  return (data ?? []).map(toTable);
}

export async function updateTable(
  tenantId: string,
  tableNumber: number,
  data: UpdateTableInput,
): Promise<Table> {
  if (!supabase) throw new Error('Supabase não configurado');

  const { data: updated, error } = await supabase
    .from('restaurant_tables')
    .update(toUpdatePayload(data))
    .eq('tenant_id', tenantId)
    .eq('number', tableNumber)
    .select('*')
    .maybeSingle<TableRow>();

  throwIfError('Erro ao atualizar mesa', error);
  if (!updated) throw new Error('Mesa não encontrada.');
  return toTable(updated);
}

export async function setTableOccupied(
  tenantId: string,
  tableNumber: number,
  orderId: string,
): Promise<Table> {
  return updateTable(tenantId, tableNumber, { status: 'ocupada', activeOrderId: orderId });
}

export async function clearTable(tenantId: string, tableNumber: number): Promise<Table> {
  return updateTable(tenantId, tableNumber, {
    status: 'livre',
    activeOrderId: undefined,
    reservationReason: undefined,
  });
}

export async function reserveTables(
  tenantId: string,
  tableNumbers: number[],
  reason: string,
): Promise<void> {
  if (!supabase || tableNumbers.length === 0) return;

  const { error } = await supabase
    .from('restaurant_tables')
    .update({ status: 'reservada', reservation_reason: reason, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .in('number', tableNumbers);

  throwIfError('Erro ao reservar mesas', error);
}

export async function initializeTables(tenantId: string, count: number): Promise<Table[]> {
  if (!supabase) return [];

  const current = await listTables(tenantId);
  if (current.length > 0) return current;

  const rows: TableInsertRow[] = Array.from({ length: count }, (_, i) => ({
    tenant_id: tenantId,
    number: i + 1,
    status: 'livre',
    active_order_id: null,
    reservation_reason: null,
  }));

  const { data, error } = await supabase
    .from('restaurant_tables')
    .insert(rows)
    .select('*')
    .order('number', { ascending: true })
    .returns<TableRow[]>();

  throwIfError('Erro ao inicializar mesas', error);
  return (data ?? []).map(toTable);
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export type TablesRealtimeCallback = (tables: Table[]) => void;

export function subscribeToTables(
  tenantId: string,
  onUpdate: TablesRealtimeCallback,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`restaurant_tables:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'restaurant_tables',
        filter: `tenant_id=eq.${tenantId}`,
      },
      async () => {
        // Ao receber qualquer mudança, recarrega a lista completa para garantir consistência
        const fresh = await listTables(tenantId);
        onUpdate(fresh);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
