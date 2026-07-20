import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, OrderItem, PaymentItem } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { isLocalHomologationMode } from '../utils/localHomologation';
import {
  closeOrder as closeOrderInSupabase,
  CloseOrderInput,
  createOrder as createOrderInSupabase,
  CreateOrderInput,
  deleteOrder as deleteOrderInSupabase,
  listOpenOrders,
  subscribeToOrders,
  updateOrderItems as updateOrderItemsInSupabase,
} from '../services/ordersSupabaseService';

export interface UseOrdersReturn {
  openOrders: Order[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
  createOrder: (data: CreateOrderInput) => Promise<Order | null>;
  updateOrderItems: (orderId: string, items: OrderItem[]) => Promise<void>;
  closeOrder: (orderId: string, data: CloseOrderInput) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  // Fallback local-first
  setOrdersLocal: (orders: Order[]) => void;
  addOrderLocal: (order: Order) => void;
  updateOrderLocal: (order: Order) => void;
  closeOrderLocal: (orderId: string) => void;
}

export function useOrders(tenantId: string): UseOrdersReturn {
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const online = isSupabaseConfigured && Boolean(tenantId) && !isLocalHomologationMode(tenantId);

  const refresh = useCallback(async () => {
    if (!online) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orders = await listOpenOrders(tenantId);
      setOpenOrders(orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }, [online, tenantId]);

  // Carga inicial + Realtime
  useEffect(() => {
    if (!online) {
      setLoading(false);
      return;
    }

    void refresh();

    unsubscribeRef.current = subscribeToOrders(tenantId, (freshOrders) => {
      setOpenOrders(freshOrders);
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, [online, tenantId, refresh]);

  const createOrder = useCallback(async (data: CreateOrderInput): Promise<Order | null> => {
    if (!online) return null;
    try {
      const created = await createOrderInSupabase(tenantId, data);
      setOpenOrders(prev => [...prev, created].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ));
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido.');
      return null;
    }
  }, [online, tenantId]);

  const updateOrderItems = useCallback(async (orderId: string, items: OrderItem[]) => {
    if (!online) return;
    const updated = await updateOrderItemsInSupabase(tenantId, orderId, items);
    setOpenOrders(prev => prev.map(o => o.id === orderId ? updated : o));
  }, [online, tenantId]);

  const closeOrder = useCallback(async (orderId: string, data: CloseOrderInput) => {
    if (!online) return;
    await closeOrderInSupabase(tenantId, orderId, data);
    setOpenOrders(prev => prev.filter(o => o.id !== orderId));
  }, [online, tenantId]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!online) return;
    await deleteOrderInSupabase(tenantId, orderId);
    setOpenOrders(prev => prev.filter(o => o.id !== orderId));
  }, [online, tenantId]);

  // ─── Fallbacks Local-First ─────────────────────────────────────────────────

  const setOrdersLocal = useCallback((orders: Order[]) => {
    setOpenOrders(orders.filter(o => o.status === 'open'));
    setLoading(false);
  }, []);

  const addOrderLocal = useCallback((order: Order) => {
    setOpenOrders(prev => {
      if (prev.some(o => o.id === order.id)) return prev;
      return [...prev, order].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    });
  }, []);

  const updateOrderLocal = useCallback((order: Order) => {
    setOpenOrders(prev => prev.map(o => o.id === order.id ? order : o));
  }, []);

  const closeOrderLocal = useCallback((orderId: string) => {
    setOpenOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  return {
    openOrders,
    loading,
    error,
    isOnline: online,
    refresh,
    createOrder,
    updateOrderItems,
    closeOrder,
    deleteOrder,
    setOrdersLocal,
    addOrderLocal,
    updateOrderLocal,
    closeOrderLocal,
  };
}
