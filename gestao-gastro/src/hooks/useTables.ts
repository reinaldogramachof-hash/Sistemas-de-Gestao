import { useCallback, useEffect, useRef, useState } from 'react';
import type { Table } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { isLocalHomologationMode } from '../utils/localHomologation';
import {
  clearTable as clearTableInSupabase,
  initializeTables,
  listTables,
  reserveTables as reserveTablesInSupabase,
  setTableOccupied as setTableOccupiedInSupabase,
  subscribeToTables,
  updateTable as updateTableInSupabase,
  UpdateTableInput,
} from '../services/tablesSupabaseService';

export interface UseTablesReturn {
  tables: Table[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
  updateTable: (tableNumber: number, data: UpdateTableInput) => Promise<void>;
  setOccupied: (tableNumber: number, orderId: string) => Promise<void>;
  clear: (tableNumber: number) => Promise<void>;
  reserve: (tableNumbers: number[], reason: string) => Promise<void>;
  initialize: (count: number) => Promise<void>;
  // Fallback local-first (quando Supabase não está configurado)
  setTablesLocal: (tables: Table[]) => void;
}

export function useTables(tenantId: string): UseTablesReturn {
  const [tables, setTables] = useState<Table[]>([]);
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
      const data = await listTables(tenantId);
      setTables(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mesas.');
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

    unsubscribeRef.current = subscribeToTables(tenantId, (freshTables) => {
      setTables(freshTables);
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, [online, tenantId, refresh]);

  const updateTable = useCallback(async (tableNumber: number, data: UpdateTableInput) => {
    if (!online) return;
    const updated = await updateTableInSupabase(tenantId, tableNumber, data);
    setTables(prev => prev.map(t => t.number === tableNumber ? updated : t));
  }, [online, tenantId]);

  const setOccupied = useCallback(async (tableNumber: number, orderId: string) => {
    if (!online) return;
    const updated = await setTableOccupiedInSupabase(tenantId, tableNumber, orderId);
    setTables(prev => prev.map(t => t.number === tableNumber ? updated : t));
  }, [online, tenantId]);

  const clear = useCallback(async (tableNumber: number) => {
    if (!online) return;
    const updated = await clearTableInSupabase(tenantId, tableNumber);
    setTables(prev => prev.map(t => t.number === tableNumber ? updated : t));
  }, [online, tenantId]);

  const reserve = useCallback(async (tableNumbers: number[], reason: string) => {
    if (!online) return;
    await reserveTablesInSupabase(tenantId, tableNumbers, reason);
    setTables(prev => prev.map(t =>
      tableNumbers.includes(t.number)
        ? { ...t, status: 'reservada' as const, reservationReason: reason }
        : t,
    ));
  }, [online, tenantId]);

  const initialize = useCallback(async (count: number) => {
    if (!online) return;
    const initialized = await initializeTables(tenantId, count);
    setTables(initialized);
  }, [online, tenantId]);

  const setTablesLocal = useCallback((localTables: Table[]) => {
    setTables(localTables);
    setLoading(false);
  }, []);

  return {
    tables,
    loading,
    error,
    isOnline: online,
    refresh,
    updateTable,
    setOccupied,
    clear,
    reserve,
    initialize,
    setTablesLocal,
  };
}
