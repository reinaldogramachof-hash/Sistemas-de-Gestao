import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, OrderItem, Product, Table } from '../types';
import { ComandaMesaGrid } from './ComandaMesaGrid';
import { ComandaMesaResumo } from './ComandaMesaResumo';
import { ComandaMesaSelector } from './ComandaMesaSelector';
import { ComandaLancamento, ComandaDraftItem } from './ComandaLancamento';
import { ComandaConfirmacao } from './ComandaConfirmacao';
import { listTables, releaseTableSafely, setTableOccupied, subscribeToTables } from '../services/tablesSupabaseService';
import { closeComanda, createComanda as createComandaRpc, createOrder, listOpenOrders, subscribeToOrders, transferComanda, updateOrderItems, updateOrderMeta } from '../services/ordersSupabaseService';
import { writeSecureAudit } from '../services/secureAuditService';
import { isSupabaseConfigured } from '../lib/supabase';
import { findComandaWithConsumption, getComandaDisplayLabel, listOpenComandasForTable, resolveOfflineComandaTarget, resolveSelectedComandaId } from '../utils/multipleComandas';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Step = 'mesa' | 'seletor' | 'resumo' | 'lancamento' | 'confirmacao';

interface WaiterSession {
  waiterId: string;
  waiterName: string;
}

interface OfflineQueueItem {
  id: string;
  tableNumber: number | null;
  existingOrderId?: string;
  targetOrderId?: string;
  comandaLabel?: string;
  offlineIdKey?: string;
  isNewComanda?: boolean;
  mode: 'mesa' | 'balcao';
  customerName: string;
  adultCount: number;
  childrenCount: number;
  items: ComandaDraftItem[];
  generalObservation: string;
  timestamp: string;
  waiterId: string;
  waiterName: string;
  syncStage?: 'items' | 'metadata' | 'table';
  remoteOrderId?: string;
  attempts?: number;
  lastAttemptAt?: string;
  lastError?: string;
}

const OFFLINE_QUEUE_KEY = 'garcom_offline_queue';
const getOfflineQueueKey = (tenantId: string, waiterId: string) =>
  `${OFFLINE_QUEUE_KEY}:${tenantId || 'local'}:${waiterId || 'anonymous'}`;
const getLastSyncKey = (tenantId: string, waiterId: string) =>
  `garcom_last_sync:${tenantId || 'local'}:${waiterId || 'anonymous'}`;
const createOfflineIdKey = () =>
  `garcom_${Date.now()}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

// ─── Utils ────────────────────────────────────────────────────────────────────

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const loadOfflineQueue = (queueKey: string): OfflineQueueItem[] => {
  try {
    const scopedQueue = localStorage.getItem(queueKey);
    if (scopedQueue) return JSON.parse(scopedQueue);

    const legacyQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (legacyQueue && queueKey !== OFFLINE_QUEUE_KEY) {
      localStorage.setItem(queueKey, legacyQueue);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      return JSON.parse(legacyQueue);
    }

    return [];
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queueKey: string, queue: OfflineQueueItem[]) => {
  localStorage.setItem(queueKey, JSON.stringify(queue));
};

const getOfflineSyncError = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('Pedido ativo nao encontrado')) {
    return 'Conflito: a comanda foi fechada ou alterada em outro dispositivo.';
  }
  if (message.includes('Tenant nao configurado')) {
    return 'Identificacao do restaurante ausente. Entre novamente pela URL do cliente.';
  }
  return 'Falha ao enviar. Verifique a conexao e tente novamente.';
};

const formatLastSync = (value: string | null) => {
  if (!value) return 'Nenhuma sincronizacao concluida';
  return `Ultima sincronizacao: ${new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const mergeGeneralObservation = (current?: string, next?: string) =>
  [current, next?.trim()].filter(Boolean).join('\n');

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
  tenantId: string;
  onLogout: () => void;
}

export const ComandaMobile: React.FC<ComandaMobileProps> = ({
  waiterSession,
  products,
  tenantId,
  onLogout,
}) => {
  const offlineQueueKey = getOfflineQueueKey(tenantId, waiterSession.waiterId);
  const [step, setStep] = useState<Step>('mesa');
  const [tables, setTables] = useState<Table[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [tableError, setTableError] = useState<'tenant_missing' | 'db_error' | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isBalcao, setIsBalcao] = useState(false);
  const [draftItems, setDraftItems] = useState<ComandaDraftItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [adultCount, setAdultCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [generalObservation, setGeneralObservation] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableActionLoading, setTableActionLoading] = useState(false);
  const [uiMessage, setUiMessage] = useState<{ type: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => loadOfflineQueue(offlineQueueKey));
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => localStorage.getItem(getLastSyncKey(tenantId, waiterSession.waiterId)));
  // Comanda selecionada no seletor de comandas múltiplas
  const [selectedComanda, setSelectedComanda] = useState<Order | null>(null);
  const [isBusyComanda, setIsBusyComanda] = useState(false);
  const autoSyncAttemptedRef = useRef(false);

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
      setTableError(null);
      if (isSupabaseConfigured) {
        if (!tenantId) {
          setTableError('tenant_missing');
          setLoadingTables(false);
          return;
        }
        try {
          const [tablesData, ordersData] = await Promise.all([
            listTables(tenantId),
            listOpenOrders(tenantId),
          ]);
          setTables(tablesData);
          setOpenOrders(ordersData);
          unsubscribeTables = subscribeToTables(tenantId, setTables);
          unsubscribeOrders = subscribeToOrders(tenantId, setOpenOrders);
        } catch (err) {
          console.error('Erro ao carregar mesas/pedidos:', err);
          setTableError('db_error');
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
  }, [tenantId]);

  useEffect(() => {
    setOfflineQueue(loadOfflineQueue(offlineQueueKey));
    setLastSyncAt(localStorage.getItem(getLastSyncKey(tenantId, waiterSession.waiterId)));
  }, [offlineQueueKey, tenantId, waiterSession.waiterId]);

  // ─── Sync da fila offline ─────────────────────────────────────────────────

  const syncOfflineQueue = useCallback(async () => {
    if (!isOnline || !isSupabaseConfigured || offlineQueue.length === 0) return;
    setSyncing(true);

    const remaining: OfflineQueueItem[] = [];
    let syncedCount = 0;
    for (const item of offlineQueue) {
      let pendingItem = item;
      try {
        const orderItems = buildOrderItems(item.items);
        const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
        if (!tenantId) {
          throw new Error('Tenant nao configurado para sincronizar fila offline.');
        }

        if (item.isNewComanda && item.mode === 'mesa') {
          if (!item.tableNumber || !item.offlineIdKey) {
            throw new Error('Nova comanda offline sem identificador idempotente.');
          }

          const created = await createComandaRpc(tenantId, {
            tableNumber: item.tableNumber,
            comandaLabel: item.comandaLabel?.trim() || 'Comanda Geral',
            offlineIdKey: item.offlineIdKey,
            customerName: item.customerName.trim() || undefined,
            customerCount: item.adultCount + item.childrenCount,
            adultCount: item.adultCount,
            childrenCount: item.childrenCount,
            generalObservation: item.generalObservation,
            items: orderItems,
            subtotal,
            serviceCharge: 0,
            total: subtotal,
            waiterId: item.waiterId,
            waiterName: item.waiterName,
            timestamp: item.timestamp,
          });
          void writeSecureAudit(tenantId, 'comanda_offline_synced', {
            order_id: created.id,
            offline_id_key: item.offlineIdKey,
            table: item.tableNumber,
          });
          syncedCount += 1;
          continue;
        }

        if (item.remoteOrderId) {
          const freshOrders = await listOpenOrders(tenantId);
          if (!freshOrders.some(order => order.id === item.remoteOrderId)) {
            throw new Error('Pedido ativo nao encontrado para sincronizar fila offline.');
          }
          if (item.mode === 'mesa' && item.tableNumber) {
            await setTableOccupied(tenantId, item.tableNumber, item.remoteOrderId);
          }
          syncedCount += 1;
          continue;
        }

        const existingOrderId = item.targetOrderId && !item.targetOrderId.startsWith('local_comanda_')
          ? item.targetOrderId
          : item.existingOrderId;
        if (existingOrderId) {
          const freshOrders = await listOpenOrders(tenantId);
          const existingOrder = freshOrders.find(order => order.id === existingOrderId);
          if (!existingOrder) throw new Error('Pedido ativo nao encontrado para sincronizar fila offline.');

          const syncStage = item.syncStage ?? 'items';
          if (syncStage === 'items') {
            await updateOrderItems(tenantId, existingOrderId, mergeOrderItems(existingOrder.items, orderItems));
            pendingItem = { ...pendingItem, syncStage: 'metadata' };
          }
          if (syncStage !== 'table' && (item.generalObservation.trim() || item.customerName.trim() || item.adultCount !== existingOrder.adultCount || item.childrenCount !== existingOrder.childrenCount)) {
            await updateOrderMeta(tenantId, existingOrderId, {
              customerName: item.customerName.trim() || existingOrder.customerName,
              customerCount: item.adultCount + item.childrenCount,
              adultCount: item.adultCount,
              childrenCount: item.childrenCount,
              generalObservation: mergeGeneralObservation(existingOrder.generalObservation, item.generalObservation),
            });
          }
          pendingItem = { ...pendingItem, syncStage: 'table' };
          syncedCount += 1;
          continue;
        }

        const createdOrder = await createOrder(tenantId, {
          mode: item.mode,
          tableNumber: item.tableNumber ?? undefined,
          customerName: item.customerName.trim() || undefined,
          customerCount: item.adultCount + item.childrenCount,
          adultCount: item.adultCount,
          childrenCount: item.childrenCount,
          items: orderItems,
          subtotal,
          serviceCharge: 0,
          total: subtotal,
          generalObservation: item.generalObservation,
          waiterId: item.waiterId,
          waiterName: item.waiterName,
          timestamp: item.timestamp,
        });
        pendingItem = { ...pendingItem, remoteOrderId: createdOrder.id, syncStage: 'table' };
        if (item.mode === 'mesa' && item.tableNumber) {
          await setTableOccupied(tenantId, item.tableNumber, createdOrder.id);
        }
        syncedCount += 1;
      } catch (error) {
        remaining.push({
          ...pendingItem,
          attempts: (item.attempts ?? 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: getOfflineSyncError(error),
        });
      }
    }

    setOfflineQueue(remaining);
    saveOfflineQueue(offlineQueueKey, remaining);
    if (syncedCount > 0) {
      const syncedAt = new Date().toISOString();
      localStorage.setItem(getLastSyncKey(tenantId, waiterSession.waiterId), syncedAt);
      setLastSyncAt(syncedAt);
    }
    setSyncing(false);
    setUiMessage(
      remaining.length === 0
        ? { type: 'ok', text: 'Fila offline sincronizada com sucesso.' }
        : { type: 'warn', text: `${remaining.length} pedido(s) ainda aguardam sincronizacao.` },
    );
  }, [isOnline, offlineQueue, tenantId, offlineQueueKey, waiterSession.waiterId]);

  useEffect(() => {
    if (!isOnline) {
      autoSyncAttemptedRef.current = false;
      return;
    }
    if (offlineQueue.length > 0 && !autoSyncAttemptedRef.current) {
      autoSyncAttemptedRef.current = true;
      void syncOfflineQueue();
    }
  }, [isOnline, offlineQueue.length, syncOfflineQueue]);

  const handleRemoveOfflineItem = (itemId: string) => {
    const nextQueue = offlineQueue.filter(item => item.id !== itemId);
    setOfflineQueue(nextQueue);
    saveOfflineQueue(offlineQueueKey, nextQueue);
    setUiMessage({ type: 'ok', text: 'Pedido removido da fila offline.' });
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectTable = (table: Table) => {
    setUiMessage(null);
    if (table.status === 'reservada') {
      setUiMessage({ type: 'warn', text: 'Mesa reservada. Libere a reserva no PDV antes de lancar pedidos.' });
      return;
    }
    setSelectedTable(table);
    setIsBalcao(false);
    setDraftItems([]);
    setCustomerName('');
    setAdultCount(1);
    setChildrenCount(0);
    setGeneralObservation('');
    setSelectedComanda(null);

    // Mesa com comando(s) abertas → mostrar seletor de comandas
    const tableComandas = listOpenComandasForTable(openOrders, table.number);
    if (tableComandas.length > 0) {
      setStep('seletor');
      return;
    }

    // Mesa livre ou marcada como ocupada mas sem comanda → ir direto para lançamento
    setStep(table.status === 'livre' && !table.activeOrderId ? 'lancamento' : 'resumo');
  };

  const handleSelectBalcao = () => {
    setUiMessage(null);
    setSelectedTable(null);
    setIsBalcao(true);
    setDraftItems([]);
    setCustomerName('');
    setAdultCount(0);
    setChildrenCount(0);
    setGeneralObservation('');
    setStep('lancamento');
  };

  const handleStartTableOrder = () => {
    setDraftItems([]);
    setCustomerName(selectedOpenOrder?.customerName || '');
    setAdultCount(selectedOpenOrder?.adultCount ?? 1);
    setChildrenCount(selectedOpenOrder?.childrenCount ?? 0);
    setGeneralObservation(selectedOpenOrder?.generalObservation || '');
    setStep('lancamento');
  };

  const refreshTablesAndOrders = async () => {
    if (!tenantId) return;
    const [freshTables, freshOrders] = await Promise.all([
      listTables(tenantId),
      listOpenOrders(tenantId),
    ]);
    setTables(freshTables);
    setOpenOrders(freshOrders);
  };

  /**
   * Seleciona uma comanda existente no seletor e avança para o resumo.
   */
  const handleSelectComanda = (order: Order) => {
    setSelectedComanda(order);
    setCustomerName(order.customerName || '');
    setAdultCount(order.adultCount ?? 1);
    setChildrenCount(order.childrenCount ?? 0);
    setGeneralObservation(order.generalObservation || '');
    setStep('resumo');
  };

  /**
   * Cria uma nova comanda em uma mesa já ocupada usando a RPC.
   * Após criação vai direto para o lançamento de itens.
   */
  const handleCreateComandaInTable = async (label: string) => {
    if (!selectedTable) return;
    const offlineIdKey = createOfflineIdKey();
    setIsBusyComanda(true);
    setUiMessage(null);
    try {
      if (isOnline && isSupabaseConfigured && tenantId) {
        const created = await createComandaRpc(tenantId, {
          tableNumber: selectedTable.number,
          comandaLabel: label,
          offlineIdKey,
          items: [],
          subtotal: 0,
          serviceCharge: 0,
          total: 0,
          waiterId: waiterSession.waiterId,
          waiterName: waiterSession.waiterName,
          timestamp: new Date().toISOString(),
        });
        void writeSecureAudit(tenantId, 'comanda_created', { order_id: created.id, table: selectedTable.number, label });
        await refreshTablesAndOrders();
        // Avança para lançamento já associado à nova comanda
        setSelectedComanda(created);
      } else {
        // Offline: cria localmente com ID temporário
        const localComanda: Order = {
          id: `local_comanda_${offlineIdKey}`,
          mode: 'mesa',
          tableNumber: selectedTable.number,
          comandaLabel: label,
          offlineIdKey,
          items: [],
          subtotal: 0,
          serviceCharge: 0,
          total: 0,
          payments: [],
          status: 'open',
          waiterId: waiterSession.waiterId,
          timestamp: new Date().toISOString(),
        };
        setOpenOrders(prev => [...prev, localComanda]);
        setSelectedComanda(localComanda);
      }
      setDraftItems([]);
      setCustomerName('');
      setAdultCount(1);
      setChildrenCount(0);
      setGeneralObservation('');
      setStep('lancamento');
    } catch (err) {
      setUiMessage({ type: 'error', text: `Erro ao criar comanda: ${err instanceof Error ? err.message : 'tente novamente'}` });
    } finally {
      setIsBusyComanda(false);
    }
  };

  const handleReleaseSelectedTable = async () => {
    if (!tenantId || !selectedTable) return;
    setTableActionLoading(true);
    setUiMessage(null);
    try {
      const [freshTables, freshOrders] = await Promise.all([
        listTables(tenantId),
        listOpenOrders(tenantId),
      ]);
      const currentTable = freshTables.find(table => table.number === selectedTable.number);
      if (!currentTable) {
        throw new Error('Mesa nao encontrada. Atualize e tente novamente.');
      }

      const tableComandas = listOpenComandasForTable(freshOrders, selectedTable.number);
      const comandaWithConsumption = findComandaWithConsumption(freshOrders, selectedTable.number);
      if (comandaWithConsumption) {
        throw new Error(
          `Esta mesa possui consumo na comanda "${getComandaDisplayLabel(comandaWithConsumption)}". Finalize no caixa.`,
        );
      }

      for (const comanda of tableComandas) {
        await updateOrderMeta(tenantId, comanda.id, {
          generalObservation: mergeGeneralObservation(
            comanda.generalObservation,
            'Mesa liberada sem consumo pelo garcom.',
          ),
        });
        await closeComanda(tenantId, comanda.id, {
          payments: [],
          serviceCharge: 0,
          total: 0,
        });
        void writeSecureAudit(tenantId, 'order_closed_without_consumption', { order_id: comanda.id, mode: 'mesa' });
      }

      await releaseTableSafely(tenantId, selectedTable.number);
      await refreshTablesAndOrders();
      setSelectedTable(null);
      setStep('mesa');
      setUiMessage({ type: 'ok', text: 'Mesa liberada para novo atendimento.' });
    } catch (err) {
      setUiMessage({ type: 'error', text: `Erro ao liberar mesa: ${err instanceof Error ? err.message : 'tente novamente'}` });
    } finally {
      setTableActionLoading(false);
    }
  };

  const handleTransferSelectedTable = async (targetTableNumber: number) => {
    if (!tenantId || !selectedTable) return;
    setTableActionLoading(true);
    setUiMessage(null);
    try {
      const [freshTables, freshOrders] = await Promise.all([
        listTables(tenantId),
        listOpenOrders(tenantId),
      ]);
      const currentTable = freshTables.find(table => table.number === selectedTable.number);
      const targetTable = freshTables.find(table => table.number === targetTableNumber);
      const comandaId = resolveSelectedComandaId(selectedComanda, currentTable, selectedTable);

      if (!comandaId || comandaId.startsWith('local_comanda_')) {
        throw new Error('Nenhuma comanda sincronizada foi selecionada para transferencia.');
      }

      if (!targetTable || targetTable.status !== 'livre' || targetTable.activeOrderId) {
        throw new Error('A mesa escolhida nao esta mais livre. Atualize e tente novamente.');
      }

      const activeOrder =
        freshOrders.find(order => order.id === comandaId) ??
        openOrders.find(order => order.id === comandaId);
      if (!activeOrder) {
        throw new Error('Comanda ativa nao encontrada para transferencia.');
      }

      await transferComanda(tenantId, activeOrder.id, targetTableNumber);
      await refreshTablesAndOrders();
      setSelectedTable(null);
      setStep('mesa');
      setUiMessage({ type: 'ok', text: `Comanda transferida para a mesa ${targetTableNumber}.` });
    } catch (err) {
      setUiMessage({ type: 'error', text: `Erro ao trocar mesa: ${err instanceof Error ? err.message : 'tente novamente'}` });
    } finally {
      setTableActionLoading(false);
    }
  };

  const handleUpdateSelectedOrderCustomerName = async (value: string) => {
    if (!tenantId || !selectedOpenOrder) return;
    const trimmedName = value.trim();
    if ((selectedOpenOrder.customerName || '') === trimmedName) return;

    setUiMessage(null);
    try {
      await updateOrderMeta(tenantId, selectedOpenOrder.id, {
        customerName: trimmedName || undefined,
      });
      await refreshTablesAndOrders();
      setUiMessage({ type: 'ok', text: 'Nome do cliente atualizado na comanda.' });
    } catch (err) {
      setUiMessage({ type: 'error', text: `Erro ao salvar cliente: ${err instanceof Error ? err.message : 'tente novamente'}` });
    }
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
    const queueId = `offline_${createOfflineIdKey()}`;
    const queueTarget = resolveOfflineComandaTarget({
      isBalcao,
      queueId,
      selectedComanda,
      tableActiveOrderId: selectedTable?.activeOrderId,
    });
    const queueItem: OfflineQueueItem = {
      id: queueId,
      tableNumber: selectedTable?.number ?? null,
      ...queueTarget,
      mode: isBalcao ? 'balcao' : 'mesa',
      customerName,
      adultCount,
      childrenCount,
      items: draftItems,
      generalObservation,
      timestamp: new Date().toISOString(),
      waiterId: waiterSession.waiterId,
      waiterName: waiterSession.waiterName,
    };
    const newQueue = [...offlineQueue, queueItem];
    setOfflineQueue(newQueue);
    saveOfflineQueue(offlineQueueKey, newQueue);
    setDraftItems([]);
    setCustomerName('');
    setAdultCount(isBalcao ? 0 : 1);
    setChildrenCount(0);
    setGeneralObservation('');
    setSelectedComanda(null);
    setStep('mesa');
    setUiMessage({ type: 'warn', text: 'Pedido salvo na fila offline. Ele sera enviado ao reconectar.' });
  };

  const handleConfirm = async () => {
    if (isSubmitting || draftItems.length === 0) return;
    setIsSubmitting(true);
    setUiMessage(null);
    const orderItems = buildOrderItems(draftItems);
    const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

    if (!isOnline || !isSupabaseConfigured) {
      handleSaveOffline();
      setIsSubmitting(false);
      return;
    }

    try {
      if (!tenantId) {
        throw new Error('Tenant não configurado ou rota inválida.');
      }
      // Usa a comanda selecionada pelo seletor de comandas múltiplas (se houver),
      // ou cai para a lógica legada de comanda única por mesa.
      const selectedComandaIsLocal = Boolean(selectedComanda?.id.startsWith('local_comanda_'));
      let targetOrderId = isBalcao
        ? undefined
        : (selectedComandaIsLocal ? undefined : (selectedComanda?.id ?? selectedTable?.activeOrderId));

      if (!isBalcao && !selectedComandaIsLocal && selectedTable && !targetOrderId) {
        const freshTables = await listTables(tenantId);
        const currentTable = freshTables.find(t => t.number === selectedTable.number);
        if (currentTable && currentTable.activeOrderId) {
          targetOrderId = currentTable.activeOrderId;
        }
      }

      if (!isBalcao && targetOrderId) {
        const activeOrder =
          openOrders.find(order => order.id === targetOrderId) ??
          (await listOpenOrders(tenantId)).find(order => order.id === targetOrderId);

        if (activeOrder) {
          await updateOrderItems(
            tenantId,
            targetOrderId,
            mergeOrderItems(activeOrder.items, orderItems),
          );
          void writeSecureAudit(tenantId, 'order_items_added', { order_id: targetOrderId, mode: 'mesa' });
          if (generalObservation.trim() || customerName.trim() || adultCount !== activeOrder.adultCount || childrenCount !== activeOrder.childrenCount) {
            await updateOrderMeta(tenantId, targetOrderId, {
              customerName: customerName.trim() || activeOrder.customerName,
              customerCount: adultCount + childrenCount,
              adultCount,
              childrenCount,
              generalObservation: mergeGeneralObservation(activeOrder.generalObservation, generalObservation),
            });
          }
          setSuccess(true);
          setUiMessage({ type: 'ok', text: 'Itens adicionados a comanda.' });
          setTimeout(() => {
            setSuccess(false);
            setIsSubmitting(false);
            setStep('mesa');
            setDraftItems([]);
            setCustomerName('');
            setAdultCount(1);
            setChildrenCount(0);
            setGeneralObservation('');
            setSelectedTable(null);
            void Promise.all([
              listTables(tenantId).then(setTables),
              listOpenOrders(tenantId).then(setOpenOrders),
            ]).catch(() => {});
          }, 2500);
          return;
        }
      }

      const timestamp = new Date().toISOString();
      const createdOrder = isBalcao
        ? await createOrder(tenantId, {
            mode: 'balcao',
            customerName: customerName.trim() || undefined,
            customerCount: adultCount + childrenCount,
            adultCount,
            childrenCount,
            items: orderItems,
            subtotal,
            serviceCharge: 0,
            total: subtotal,
            generalObservation,
            waiterId: waiterSession.waiterId,
            waiterName: waiterSession.waiterName,
            timestamp,
          })
        : await createComandaRpc(tenantId, {
            tableNumber: selectedTable!.number,
            comandaLabel: selectedComanda?.comandaLabel?.trim() || 'Comanda Geral',
            offlineIdKey: selectedComanda?.offlineIdKey ?? createOfflineIdKey(),
            customerName: customerName.trim() || undefined,
            customerCount: adultCount + childrenCount,
            adultCount,
            childrenCount,
            items: orderItems,
            subtotal,
            serviceCharge: 0,
            total: subtotal,
            generalObservation,
            waiterId: waiterSession.waiterId,
            waiterName: waiterSession.waiterName,
            timestamp,
          });
      void writeSecureAudit(tenantId, 'order_created', { order_id: createdOrder.id, mode: isBalcao ? 'balcao' : 'mesa' });
      
      setSuccess(true);
      setUiMessage({ type: 'ok', text: 'Pedido registrado na comanda.' });
      // Volta para a seleção de mesas após 2.5s
      setTimeout(() => {
        setSuccess(false);
        setIsSubmitting(false);
        setStep('mesa');
        setDraftItems([]);
        setCustomerName('');
        setAdultCount(isBalcao ? 0 : 1);
        setChildrenCount(0);
        setGeneralObservation('');
        setSelectedTable(null);
        setSelectedComanda(null);
        // Recarrega mesas e pedidos para refletir status atualizado
        void Promise.all([
          listTables(tenantId).then(setTables),
          listOpenOrders(tenantId).then(setOpenOrders),
        ]).catch(() => {});
      }, 2500);
    } catch (err) {
      setIsSubmitting(false);
      setUiMessage({ type: 'error', text: `Erro ao concluir lancamento: ${err instanceof Error ? err.message : 'tente novamente'}` });
    }
  };

  // ─── Rótulo da mesa/balcão atual ─────────────────────────────────────────

  const tableLabel = isBalcao
    ? 'Balcão'
    : selectedComanda
      ? `${getComandaDisplayLabel(selectedComanda)} · Mesa ${selectedTable?.number ?? ''}`
      : `Mesa ${selectedTable?.number ?? ''}`;

  // Comanda atualmente selecionada: usa selectedComanda se vier do seletor, senão busca pela mesa
  const selectedOpenOrder = selectedComanda
    ? (openOrders.find(order => order.id === selectedComanda.id) ?? selectedComanda)
    : (selectedTable
      ? (
          openOrders.find(order => order.id === selectedTable.activeOrderId) ??
          openOrders.find(order => order.mode === 'mesa' && order.tableNumber === selectedTable.number)
        )
      : undefined);

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
        {uiMessage && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-xs font-semibold ${
              uiMessage.type === 'ok'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-200'
                : uiMessage.type === 'warn'
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-200'
                  : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-200'
            }`}
          >
            {uiMessage.text}
          </div>
        )}

        {offlineQueue.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-900/20 dark:text-amber-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">Fila offline</p>
                <p className="text-[11px] opacity-80">{offlineQueue.length} pedido(s) aguardando envio.</p>
                <p className="text-[10px] opacity-70">{formatLastSync(lastSyncAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => void syncOfflineQueue()}
                disabled={!isOnline || syncing}
                className="h-9 px-3 rounded-lg bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
              >
                {syncing ? 'Enviando' : 'Sincronizar'}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {offlineQueue.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-xs dark:bg-black/20">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {item.mode === 'mesa' ? `Mesa ${item.tableNumber}` : 'Balcao'} · {item.items.reduce((sum, draft) => sum + draft.quantity, 0)} item(ns)
                    </p>
                    {item.lastError && <p className="mt-1 text-[10px] leading-4 text-red-700 dark:text-red-200">{item.lastError}</p>}
                    {item.attempts && <p className="text-[9px] opacity-60">{item.attempts} tentativa(s) realizada(s)</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOfflineItem(item.id)}
                    className="text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-300"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'mesa' && (
          loadingTables ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-500 animate-pulse">Carregando mesas…</p>
            </div>
          ) : tableError === 'tenant_missing' ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-sm text-red-500 font-semibold">Identificação do restaurante ausente.</p>
              <p className="text-xs text-gray-400">Verifique se acessou a URL correta.</p>
            </div>
          ) : tableError === 'db_error' ? (
            <div className="text-center py-16 space-y-4">
              <p className="text-sm text-red-500 font-semibold">Erro de permissão ou falha de conexão.</p>
              <p className="text-xs text-gray-400">Não foi possível conectar ao banco de dados do restaurante. Verifique seu login ou acesso.</p>
              <button
                onClick={() => onLogout()}
                className="mt-2 h-10 px-6 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600"
              >
                Voltar e Fazer Login
              </button>
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
              openOrders={openOrders}
              onSelectTable={handleSelectTable}
              onSelectBalcao={handleSelectBalcao}
            />
          )
        )}

        {step === 'seletor' && selectedTable && (
          <ComandaMesaSelector
            tableNumber={selectedTable.number}
            comandas={listOpenComandasForTable(openOrders, selectedTable.number)}
            isOnline={isOnline && isSupabaseConfigured}
            isBusy={isBusyComanda}
            onBack={() => setStep('mesa')}
            onSelect={handleSelectComanda}
            onCreate={handleCreateComandaInTable}
          />
        )}

        {step === 'resumo' && selectedTable && (
          <ComandaMesaResumo
            table={selectedTable}
            order={selectedOpenOrder}
            tables={tables}
            isBusy={tableActionLoading}
            onBack={() => setStep('mesa')}
            onAddItems={handleStartTableOrder}
            onStartNewOrder={handleStartTableOrder}
            onReleaseTable={handleReleaseSelectedTable}
            onTransferTable={handleTransferSelectedTable}
            onUpdateCustomerName={handleUpdateSelectedOrderCustomerName}
          />
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
            customerName={customerName}
            setCustomerName={setCustomerName}
            adultCount={adultCount}
            setAdultCount={setAdultCount}
            childrenCount={childrenCount}
            setChildrenCount={setChildrenCount}
            generalObservation={generalObservation}
            setGeneralObservation={setGeneralObservation}
            isOnline={isOnline && isSupabaseConfigured}
            success={success}
            isSubmitting={isSubmitting}
            onBack={() => setStep('lancamento')}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </main>
    </div>
  );
};
