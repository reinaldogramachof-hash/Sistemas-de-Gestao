import { supabase } from '../lib/supabase';
import type { Order, OrderItem, PaymentItem } from '../types';

// ─── Row shapes ──────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  tenant_id: string;
  mode: 'mesa' | 'balcao';
  table_number: number | null;
  customer_name: string | null;
  items: OrderItem[];
  subtotal: number;
  service_charge: number;
  total: number;
  payments: PaymentItem[];
  status: 'open' | 'closed';
  waiter_id: string;
  waiter_name: string | null;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  mode: 'mesa' | 'balcao';
  tableNumber?: number;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  serviceCharge: number;
  total: number;
  waiterId: string;
  waiterName?: string;
  timestamp: string;
}

export interface CloseOrderInput {
  payments: PaymentItem[];
  serviceCharge: number;
  total: number;
}

interface OrderInsertRow {
  tenant_id: string;
  mode: 'mesa' | 'balcao';
  table_number: number | null;
  customer_name: string | null;
  items: OrderItem[];
  subtotal: number;
  service_charge: number;
  total: number;
  payments: PaymentItem[];
  status: 'open';
  waiter_id: string;
  waiter_name: string | null;
  timestamp: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const throwIfError = (message: string, error: { message: string } | null) => {
  if (error) throw new Error(`${message}: ${error.message}`);
};

const toOrder = (row: OrderRow): Order => ({
  id: row.id,
  mode: row.mode,
  tableNumber: row.table_number ?? undefined,
  customerName: row.customer_name ?? undefined,
  items: row.items,
  subtotal: row.subtotal,
  serviceCharge: row.service_charge,
  total: row.total,
  payments: row.payments,
  status: row.status,
  waiterId: row.waiter_id,
  timestamp: row.timestamp,
});

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listOpenOrders(tenantId: string): Promise<Order[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('restaurant_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'open')
    .order('timestamp', { ascending: true })
    .returns<OrderRow[]>();

  throwIfError('Erro ao listar pedidos abertos', error);
  return (data ?? []).map(toOrder);
}

export async function createOrder(
  tenantId: string,
  data: CreateOrderInput,
): Promise<Order> {
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: OrderInsertRow = {
    tenant_id: tenantId,
    mode: data.mode,
    table_number: data.tableNumber ?? null,
    customer_name: data.customerName ?? null,
    items: data.items,
    subtotal: data.subtotal,
    service_charge: data.serviceCharge,
    total: data.total,
    payments: [],
    status: 'open',
    waiter_id: data.waiterId,
    waiter_name: data.waiterName ?? null,
    timestamp: data.timestamp,
  };

  const { data: created, error } = await supabase
    .from('restaurant_orders')
    .insert(payload)
    .select('*')
    .single<OrderRow>();

  throwIfError('Erro ao criar pedido', error);
  if (!created) throw new Error('Resposta vazia do Supabase ao criar pedido.');
  return toOrder(created);
}

export async function updateOrderItems(
  tenantId: string,
  orderId: string,
  items: OrderItem[],
): Promise<Order> {
  if (!supabase) throw new Error('Supabase não configurado');

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const { data: updated, error } = await supabase
    .from('restaurant_orders')
    .update({ items, subtotal, total: subtotal, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle<OrderRow>();

  throwIfError('Erro ao atualizar itens do pedido', error);
  if (!updated) throw new Error('Pedido não encontrado.');
  return toOrder(updated);
}

export async function closeOrder(
  tenantId: string,
  orderId: string,
  data: CloseOrderInput,
): Promise<Order> {
  if (!supabase) throw new Error('Supabase não configurado');

  const { data: closed, error } = await supabase
    .from('restaurant_orders')
    .update({
      status: 'closed',
      payments: data.payments,
      service_charge: data.serviceCharge,
      total: data.total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle<OrderRow>();

  throwIfError('Erro ao fechar pedido', error);
  if (!closed) throw new Error('Pedido não encontrado.');
  return toOrder(closed);
}

export async function deleteOrder(tenantId: string, orderId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('restaurant_orders')
    .delete()
    .eq('id', orderId)
    .eq('tenant_id', tenantId);

  throwIfError('Erro ao excluir pedido', error);
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export type OrdersRealtimeCallback = (orders: Order[]) => void;

export function subscribeToOrders(
  tenantId: string,
  onUpdate: OrdersRealtimeCallback,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`restaurant_orders:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'restaurant_orders',
        filter: `tenant_id=eq.${tenantId}`,
      },
      async () => {
        // Ao receber qualquer mudança, recarrega apenas os pedidos abertos
        const fresh = await listOpenOrders(tenantId);
        onUpdate(fresh);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
