import { supabase } from '../lib/supabase';
import type { Order, OrderItem, PaymentItem } from '../types';

// ─── Row shapes ──────────────────────────────────────────────────────────────

interface OrderRow {
  id: string;
  tenant_id: string;
  mode: 'mesa' | 'balcao';
  table_number: number | null;
  comanda_label: string | null;
  offline_id_key: string | null;
  customer_name: string | null;
  customer_count: number | null;
  adult_count: number | null;
  children_count: number | null;
  general_observation: string | null;
  partial_payments: any | null;
  loyalty_discount: number | null;
  loyalty_points_earned: number | null;
  loyalty_points_redeemed: number | null;
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
  comandaLabel?: string;
  offlineIdKey?: string;
  customerName?: string;
  customerCount?: number;
  adultCount?: number;
  childrenCount?: number;
  generalObservation?: string;
  partialPayments?: any[];
  loyaltyDiscount?: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
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

export interface CreateComandaInput extends Omit<CreateOrderInput, 'mode' | 'tableNumber'> {
  tableNumber: number;
  comandaLabel: string;
}

interface OrderInsertRow {
  tenant_id: string;
  mode: 'mesa' | 'balcao';
  table_number: number | null;
  comanda_label: string | null;
  offline_id_key: string | null;
  customer_name: string | null;
  customer_count: number | null;
  adult_count: number | null;
  children_count: number | null;
  general_observation: string | null;
  partial_payments: any | null;
  loyalty_discount: number | null;
  loyalty_points_earned: number | null;
  loyalty_points_redeemed: number | null;
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

const toRealtimeChannelName = (prefix: string, tenantId: string) =>
  `${prefix}_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const toOrder = (row: OrderRow): Order => ({
  id: row.id,
  mode: row.mode,
  tableNumber: row.table_number ?? undefined,
  comandaLabel: row.comanda_label ?? undefined,
  offlineIdKey: row.offline_id_key ?? undefined,
  customerName: row.customer_name ?? undefined,
  customerCount: row.customer_count ?? undefined,
  adultCount: row.adult_count ?? undefined,
  childrenCount: row.children_count ?? undefined,
  generalObservation: row.general_observation ?? undefined,
  partialPayments: row.partial_payments ?? undefined,
  loyaltyDiscount: row.loyalty_discount ?? undefined,
  loyaltyPointsEarned: row.loyalty_points_earned ?? undefined,
  loyaltyPointsRedeemed: row.loyalty_points_redeemed ?? undefined,
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
    comanda_label: data.comandaLabel?.trim() || null,
    offline_id_key: data.offlineIdKey?.trim() || null,
    customer_name: data.customerName ?? null,
    customer_count: data.customerCount ?? null,
    adult_count: data.adultCount ?? null,
    children_count: data.childrenCount ?? null,
    general_observation: data.generalObservation?.trim() || null,
    partial_payments: data.partialPayments ?? [],
    loyalty_discount: data.loyaltyDiscount ?? 0,
    loyalty_points_earned: data.loyaltyPointsEarned ?? 0,
    loyalty_points_redeemed: data.loyaltyPointsRedeemed ?? 0,
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

export async function createComanda(
  tenantId: string,
  data: CreateComandaInput,
): Promise<Order> {
  if (!supabase) throw new Error('Supabase nÃ£o configurado');

  const { data: created, error } = await supabase
    .rpc('gastro_create_comanda_rpc', {
      p_tenant_id: tenantId,
      p_table_number: data.tableNumber,
      p_comanda_label: data.comandaLabel,
      p_offline_id_key: data.offlineIdKey?.trim() || null,
      p_customer_name: data.customerName?.trim() || null,
      p_customer_count: data.customerCount ?? null,
      p_adult_count: data.adultCount ?? null,
      p_children_count: data.childrenCount ?? null,
      p_general_observation: data.generalObservation?.trim() || null,
      p_items: data.items,
      p_subtotal: data.subtotal,
      p_service_charge: data.serviceCharge,
      p_total: data.total,
      p_waiter_id: data.waiterId,
      p_waiter_name: data.waiterName?.trim() || null,
      p_timestamp: data.timestamp,
    })
    .single<OrderRow>();

  throwIfError('Erro ao criar comanda', error);
  if (!created) throw new Error('Resposta vazia do Supabase ao criar comanda.');
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

export async function updateOrderMeta(
  tenantId: string,
  orderId: string,
  data: Partial<Omit<Order, 'id' | 'items' | 'mode'>>
): Promise<Order> {
  if (!supabase) throw new Error('Supabase não configurado');

  const payload: Partial<OrderRow> = { updated_at: new Date().toISOString() };
  if (data.tableNumber !== undefined) payload.table_number = data.tableNumber;
  if (data.comandaLabel !== undefined) payload.comanda_label = data.comandaLabel.trim();
  if (data.customerName !== undefined) payload.customer_name = data.customerName;
  if (data.customerCount !== undefined) payload.customer_count = data.customerCount;
  if (data.adultCount !== undefined) payload.adult_count = data.adultCount;
  if (data.childrenCount !== undefined) payload.children_count = data.childrenCount;
  if (data.generalObservation !== undefined) payload.general_observation = data.generalObservation;
  if (data.partialPayments !== undefined) payload.partial_payments = data.partialPayments;
  if (data.loyaltyDiscount !== undefined) payload.loyalty_discount = data.loyaltyDiscount;
  if (data.loyaltyPointsEarned !== undefined) payload.loyalty_points_earned = data.loyaltyPointsEarned;
  if (data.loyaltyPointsRedeemed !== undefined) payload.loyalty_points_redeemed = data.loyaltyPointsRedeemed;

  const { data: updated, error } = await supabase
    .from('restaurant_orders')
    .update(payload)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle<OrderRow>();

  throwIfError('Erro ao atualizar metadata do pedido', error);
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

export async function closeComanda(
  tenantId: string,
  orderId: string,
  data: CloseOrderInput,
): Promise<Order> {
  if (!supabase) throw new Error('Supabase nÃ£o configurado');

  const { data: closed, error } = await supabase
    .rpc('gastro_close_comanda_rpc', {
      p_tenant_id: tenantId,
      p_order_id: orderId,
      p_payments: data.payments,
      p_service_charge: data.serviceCharge,
      p_total: data.total,
    })
    .single<OrderRow>();

  throwIfError('Erro ao fechar comanda', error);
  if (!closed) throw new Error('Comanda nÃ£o encontrada.');
  return toOrder(closed);
}

export async function transferComanda(
  tenantId: string,
  orderId: string,
  targetTableNumber: number,
): Promise<Order> {
  if (!supabase) throw new Error('Supabase nÃ£o configurado');

  const { data: transferred, error } = await supabase
    .rpc('gastro_transfer_comanda_rpc', {
      p_tenant_id: tenantId,
      p_order_id: orderId,
      p_target_table_number: targetTableNumber,
    })
    .single<OrderRow>();

  throwIfError('Erro ao transferir comanda', error);
  if (!transferred) throw new Error('Comanda nÃ£o encontrada.');
  return toOrder(transferred);
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
    .channel(toRealtimeChannelName('restaurant_orders', tenantId))
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
