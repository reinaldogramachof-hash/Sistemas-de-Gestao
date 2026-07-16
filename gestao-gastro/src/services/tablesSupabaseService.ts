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
  sector: string;
  created_at: string;
  updated_at: string;
}

export type UpdateTableInput = Partial<Omit<Table, 'number'>>;

interface TableUpdatePayload {
  status?: 'livre' | 'ocupada' | 'aguardando' | 'reservada';
  active_order_id?: string | null;
  reservation_reason?: string | null;
  sector?: string;
  updated_at?: string;
}

interface TableInsertRow {
  tenant_id: string;
  number: number;
  status: 'livre' | 'ocupada' | 'aguardando' | 'reservada';
  active_order_id: string | null;
  reservation_reason: string | null;
  sector: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const throwIfError = (message: string, error: { message: string } | null) => {
  if (error) throw new Error(`${message}: ${error.message}`);
};

const toRealtimeChannelName = (prefix: string, tenantId: string) =>
  `${prefix}_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const toTable = (row: TableRow): Table => ({
  number: row.number,
  status: row.status,
  activeOrderId: row.active_order_id ?? undefined,
  reservationReason: row.reservation_reason ?? undefined,
  sector: row.sector ?? 'Salão',
});

const toUpdatePayload = (data: UpdateTableInput): TableUpdatePayload => {
  const payload: TableUpdatePayload = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) payload.status = data.status;
  if (data.activeOrderId !== undefined) payload.active_order_id = data.activeOrderId;
  if (data.reservationReason !== undefined) payload.reservation_reason = data.reservationReason;
  if (data.sector !== undefined) payload.sector = data.sector;
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

  // 1. Identificar lacunas e mesas que precisam ser criadas (de 1 a count)
  const existingNumbers = new Set(current.map(t => t.number));
  const toCreate: TableInsertRow[] = [];
  for (let i = 1; i <= count; i++) {
    if (!existingNumbers.has(i)) {
      toCreate.push({
        tenant_id: tenantId,
        number: i,
        status: 'livre',
        active_order_id: null,
        reservation_reason: null,
        sector: 'Salão',
      });
    }
  }

  // 2. Identificar se existem mesas a serem removidas (número > count)
  const toDelete = current.filter(t => t.number > count);

  // 3. Se houver mesas para remover, validar e executar a remoção
  if (toDelete.length > 0) {
    const activeOrReserved = toDelete.filter(t => t.status !== 'livre' || t.activeOrderId);
    if (activeOrReserved.length > 0) {
      const busyNumbers = activeOrReserved.map(t => t.number).join(', ');
      throw new Error(`Não é possível reduzir para ${count} mesas pois as seguintes mesas possuem pedidos ativos ou estão ocupadas/reservadas: ${busyNumbers}`);
    }

    const numbersToDelete = toDelete.map(t => t.number);
    const { error } = await supabase
      .from('restaurant_tables')
      .delete()
      .eq('tenant_id', tenantId)
      .in('number', numbersToDelete);
    throwIfError('Erro ao reduzir quantidade de mesas', error);
  }

  // 4. Se houver mesas a serem criadas, executamos a inserção
  if (toCreate.length > 0) {
    const { error } = await supabase
      .from('restaurant_tables')
      .insert(toCreate);
    throwIfError('Erro ao adicionar novas mesas', error);
  }

  // Retorna a lista fresca do banco
  return listTables(tenantId);
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export type TablesRealtimeCallback = (tables: Table[]) => void;

export function subscribeToTables(
  tenantId: string,
  onUpdate: TablesRealtimeCallback,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(toRealtimeChannelName('restaurant_tables', tenantId))
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
