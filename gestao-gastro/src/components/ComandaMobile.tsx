import React, { useCallback, useEffect, useState } from 'react';
import type { Order, OrderItem, Product, Table } from '../types';
import { ComandaMesaGrid } from './ComandaMesaGrid';
import { ComandaLancamento, ComandaDraftItem } from './ComandaLancamento';
import { ComandaConfirmacao } from './ComandaConfirmacao';
import { listTables, setTableOccupied, subscribeToTables } from '../services/tablesSupabaseService';
import { createOrder, listOpenOrders, subscribeToOrders, updateOrderItems } from '../services/ordersSupabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Step = 'mesa' | 'lancamento' | 'confirmacao';

interface WaiterSession {
  waiterId: string;
  waiterName: string;
}

interface OfflineQueueItem {
  id: string;
  tableNumber: number | null;
  existingOrderId?: string;
  mode: 'mesa' | 'balcao';
  items: ComandaDraftItem[];
  generalObservation: string;
  timestamp: string;
  waiterId: string;
  waiterName: string;
}

const OFFLINE_QUEUE_KEY = 'garcom_offline_queue';
const TENANT_ID = import.meta.env.VITE_GASTRO_TENANT_ID as string;

// ─── Utils ────────────────────────────────────────────────────────────────────

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const loadOfflineQueue = (): OfflineQueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue: OfflineQueueItem[]) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
};

const buildOrderItems = (items: ComandaDraftItem[]): OrderItem[] => {
  return items.map(i => ({
    id: `${i.product.id}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    product: i.product,
    quantity: i.quantity,
    price: i.product.price,
    observation: i.observation,
    kitchenStatus: 'aguardando',
  }));
};

const mergeOrderItems = (existingItems: OrderItem[], newItems: OrderItem[]): OrderItem[] => {
  const merged = [...existingItems];

  for (const newItem of newItems) {
    const existingIndex = merged.findIndex(item =>
      item.product.id === newItem.product.id &&
      (item.observation || '') === (newItem.observation || '') &&
      item.price === newItem.price &&
      !item.comboId &&
      !newItem.comboId
    );

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: merged[existingIndex].quantity + newItem.quantity,
        kitchenStatus: merged[existingIndex].kitchenStatus || 'aguardando',
      };
    } else {
      merged.push(newItem);
    }
  }

  return merged;
};

// ─── Componente ───────────────────────────────────────────────────────────────

interface ComandaMobileProps {
  waiterSession: WaiterSession;
  products: Product[];
  onLogout: () => void;
}

export const ComandaMobile: React.FC<ComandaMobileProps> = ({
  waiterSession,
  products,
  onLogout,
}) => {
  const [step, setStep] = useState<Step>('mesa');
  const [tables, setTables] = useState<Table[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isBalcao, setIsBalcao] = useState(false);
  const [draftItems, setDraftItems] = useState<ComandaDraftItem[]>([]);
  const [generalObservation, setGeneralObservation] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(loadOfflineQueue);
  const [syncing, setSyncing] = useState(false);

  // ─── Network detection ────────────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Carregar mesas ───────────────────────────────────────────────────────

  useEffect(() => {
    let unsubscribeTables: (() => void) | undefined;
    let unsubscribeOrders: (() => void) | undefined;

    const load = async () => {
      setLoadingTables(true);
      if (isSupabaseConfigured) {
        try {
          if (!TENANT_ID) throw new Error('TENANT_ID ausente (obrigatório em modo online)');
          const [tablesData, ordersData] = await Promise.all([
            listTables(TENANT_ID),
            listOpenOrders(TENANT_ID),
          ]);
          setTables(tablesData);
          setOpenOrders(ordersData);
          unsubscribeTables = subscribeToTables(TENANT_ID, setTables);
          unsubscribeOrders = subscribeToOrders(TENANT_ID, setOpenOrders);
        } catch {
          // Sem conexão: mostra lista vazia com aviso
          setTables([]);
          setOpenOrders([]);
        }
      }
      setLoadingTables(false);
    };
    void load();

    return () => {
      unsubscribeTables?.();
      unsubscribeOrders?.();
    };
  }, []);

  // ─── Sync da fila offline ─────────────────────────────────────────────────

  const syncOfflineQueue = useCallback(async () => {
    if (!isOnline || !isSupabaseConfigured || offlineQueue.length === 0) return;
    setSyncing(true);

    const remaining: OfflineQueueItem[] = [];
    for (const item of offlineQueue) {
      try {
        const orderItems = buildOrderItems(item.items);
        const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
        if (!TENANT_ID) {
          throw new Error('Tenant nao configurado para sincronizar fila offline.');
        }

        if (item.existingOrderId) {
          const freshOrders = await listOpenOrders(TENANT_ID);
          const existingOrder = freshOrders.find(order => order.id === item.existingOrderId);
          if (!existingOrder) throw new Error('Pedido ativo nao encontrado para sincronizar fila offline.');
          await updateOrderItems(TENANT_ID, item.existingOrderId, mergeOrderItems(existingOrder.items, orderItems));
          continue;
        }

        const createdOrder = await createOrder(TENANT_ID, {
          mode: item.mode,
          tableNumber: item.tableNumber ?? undefined,
          items: orderItems,
          subtotal,
          serviceCharge: 0,
          total: subtotal,
          waiterId: item.waiterId,
          waiterName: item.waiterName,
          timestamp: item.timestamp,
        });
        if (item.mode === 'mesa' && item.tableNumber) {
          await setTableOccupied(TENANT_ID, item.tableNumber, createdOrder.id);
        }
      } catch {
        remaining.push(item);
      }
    }

    setOfflineQueue(remaining);
    saveOfflineQueue(remaining);
    setSyncing(false);
  }, [isOnline, offlineQueue]);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      void syncOfflineQueue();
    }
  }, [isOnline, syncOfflineQueue]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectTable = (table: Table) => {
    if (table.status === 'reservada') {
      alert('Mesa reservada. Libere a reserva no PDV antes de lançar pedidos.');
      return;
    }
    setSelectedTable(table);
    setIsBalcao(false);
    setDraftItems([]);
    setStep('lancamento');
  };

  const handleSelectBalcao = () => {
    setSelectedTable(null);
    setIsBalcao(true);
    setDraftItems([]);
    setStep('lancamento');
  };

  const handleIncrement = (product: Product) => {
    setDraftItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleDecrement = (productId: string) => {
    setDraftItems(prev => {
      const existing = prev.find(i => i.product.id === productId);
      if (!existing || existing.quantity <= 1) {
        return prev.filter(i => i.product.id !== productId);
      }
      return prev.map(i =>
        i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
      );
    });
  };

  const handleSetObservation = (productId: string, observation: string) => {
    setDraftItems(prev =>
      prev.map(i => i.product.id === productId ? { ...i, observation } : i),
    );
  };

  const handleSaveOffline = () => {
    const queueItem: OfflineQueueItem = {
      id: `offline_${Date.now()}`,
      tableNumber: selectedTable?.number ?? null,
      existingOrderId: selectedTable?.activeOrderId,
      mode: isBalcao ? 'balcao' : 'mesa',
      items: draftItems,
      generalObservation,
      timestamp: new Date().toISOString(),
      waiterId: waiterSession.waiterId,
      waiterName: waiterSession.waiterName,
    };
    const newQueue = [...offlineQueue, queueItem];
    setOfflineQueue(newQueue);
    saveOfflineQueue(newQueue);
    setDraftItems([]);
    setStep('mesa');
    alert('Pedido salvo na fila offline. Será enviado ao reconectar.');
  };

  const handleConfirm = async () => {
    const orderItems = buildOrderItems(draftItems);
    const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

    if (!isOnline || !isSupabaseConfigured) {
      handleSaveOffline();
      return;
    }

    try {
      if (!TENANT_ID) {
        throw new Error('Tenant não configurado. VITE_GASTRO_TENANT_ID é obrigatório quando Supabase está ativo.');
      }
      
      if (!isBalcao && selectedTable?.activeOrderId) {
        const activeOrder =
          openOrders.find(order => order.id === selectedTable.activeOrderId) ??
          (await listOpenOrders(TENANT_ID)).find(order => order.id === selectedTable.activeOrderId);

        if (!activeOrder) {
          throw new Error('Pedido ativo da mesa nao encontrado. Atualize a tela e tente novamente.');
        }

        await updateOrderItems(
          TENANT_ID,
          selectedTable.activeOrderId,
          mergeOrderItems(activeOrder.items, orderItems),
        );
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setStep('mesa');
          setDraftItems([]);
          setGeneralObservation('');
          setSelectedTable(null);
          void Promise.all([
            listTables(TENANT_ID).then(setTables),
            listOpenOrders(TENANT_ID).then(setOpenOrders),
          ]).catch(() => {});
        }, 2500);
        return;
      }

      const createdOrder = await createOrder(TENANT_ID, {
        mode: isBalcao ? 'balcao' : 'mesa',
        tableNumber: selectedTable?.number,
        items: orderItems,
        subtotal,
        serviceCharge: 0,
        total: subtotal,
        waiterId: waiterSession.waiterId,
        waiterName: waiterSession.waiterName,
        timestamp: new Date().toISOString(),
      });
      
      if (!isBalcao && selectedTable?.number) {
        await setTableOccupied(TENANT_ID, selectedTable.number, createdOrder.id);
      }
      setSuccess(true);
      // Volta para a seleção de mesas após 2.5s
      setTimeout(() => {
        setSuccess(false);
        setStep('mesa');
        setDraftItems([]);
        setGeneralObservation('');
        setSelectedTable(null);
        // Recarrega mesas e pedidos para refletir status atualizado
        void Promise.all([
          listTables(TENANT_ID).then(setTables),
          listOpenOrders(TENANT_ID).then(setOpenOrders),
        ]).catch(() => {});
      }, 2500);
    } catch (err) {
      alert(`Erro ao enviar pedido: ${err instanceof Error ? err.message : 'tente novamente'}`);
    }
  };

  // ─── Rótulo da mesa/balcão atual ─────────────────────────────────────────

  const tableLabel = isBalcao ? 'Balcão' : `Mesa ${selectedTable?.number ?? ''}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Comanda Gastro</p>
            <p className="text-sm font-semibold">{waiterSession.waiterName}</p>
          </div>
          <div className="flex items-center gap-3">
            {syncing && (
              <span className="text-[10px] text-amber-500 font-semibold animate-pulse">Sincronizando…</span>
            )}
            {offlineQueue.length > 0 && !syncing && (
              <span className="text-[10px] text-amber-500 font-semibold">{offlineQueue.length} pedido(s) na fila</span>
            )}
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <button onClick={onLogout} className="text-xs text-gray-500 underline">Sair</button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {step === 'mesa' && (
          loadingTables ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-500">Carregando mesas…</p>
            </div>
          ) : tables.length === 0 && isSupabaseConfigured ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-sm text-gray-500">Nenhuma mesa encontrada no Supabase.</p>
              <p className="text-xs text-gray-400">O administrador precisa inicializar as mesas.</p>
              <button
                onClick={handleSelectBalcao}
                className="mt-4 h-10 px-6 rounded-xl bg-slate-700 text-white text-sm font-semibold"
              >
                Usar Balcão
              </button>
            </div>
          ) : (
            <ComandaMesaGrid
              tables={tables}
              onSelectTable={handleSelectTable}
              onSelectBalcao={handleSelectBalcao}
            />
          )
        )}

        {step === 'lancamento' && (
          <ComandaLancamento
            tableLabel={tableLabel}
            products={products}
            items={draftItems}
            isOnline={isOnline && isSupabaseConfigured}
            onBack={() => setStep('mesa')}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onSetObservation={handleSetObservation}
            onProceed={() => setStep('confirmacao')}
            onSaveOffline={handleSaveOffline}
          />
        )}

        {step === 'confirmacao' && (
          <ComandaConfirmacao
            tableLabel={tableLabel}
            items={draftItems}
            generalObservation={generalObservation}
            setGeneralObservation={setGeneralObservation}
            isOnline={isOnline && isSupabaseConfigured}
            success={success}
            onBack={() => setStep('lancamento')}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </main>
    </div>
  );
};
