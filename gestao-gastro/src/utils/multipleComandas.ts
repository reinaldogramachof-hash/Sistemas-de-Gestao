import type { Order, Table } from '../types';

const orderTime = (order: Order): number => {
  const parsed = Date.parse(order.createdAt ?? order.timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const listOpenComandasForTable = (
  orders: Order[],
  tableNumber: number,
): Order[] => orders
  .filter(order => (
    order.mode === 'mesa'
    && order.status === 'open'
    && order.tableNumber === tableNumber
  ))
  .sort((left, right) => orderTime(left) - orderTime(right) || left.id.localeCompare(right.id));

export const getComandaDisplayLabel = (order: Order, index = 0): string => {
  const persistedLabel = order.comandaLabel?.trim();
  if (persistedLabel) return persistedLabel;

  const customerName = order.customerName?.trim();
  if (customerName) return customerName;

  return index === 0 ? 'Comanda Geral' : `Comanda ${index + 1}`;
};

export const resolveCompatibilityOrderId = (
  table: Table,
  openComandas: Order[],
): string | undefined => {
  if (table.activeOrderId && openComandas.some(order => order.id === table.activeOrderId)) {
    return table.activeOrderId;
  }
  return openComandas[0]?.id;
};

export const reconcileTablesWithOpenComandas = (
  tables: Table[],
  orders: Order[],
): Table[] => tables.map(table => {
  const openComandas = listOpenComandasForTable(orders, table.number);

  if (openComandas.length > 0) {
    return {
      ...table,
      status: table.status === 'aguardando' ? 'aguardando' : 'ocupada',
      activeOrderId: resolveCompatibilityOrderId(table, openComandas),
      reservationReason: undefined,
    };
  }

  if (table.status === 'ocupada' || table.status === 'aguardando') {
    return {
      ...table,
      status: 'livre',
      activeOrderId: undefined,
      reservationReason: undefined,
    };
  }

  return table.activeOrderId ? { ...table, activeOrderId: undefined } : table;
});

export const canReleaseTable = (orders: Order[], tableNumber: number): boolean =>
  listOpenComandasForTable(orders, tableNumber).length === 0;

export const orderHasConsumption = (order: Order): boolean =>
  order.items.length > 0 || order.subtotal > 0 || order.total > 0;

export const findComandaWithConsumption = (
  orders: Order[],
  tableNumber: number,
): Order | undefined => listOpenComandasForTable(orders, tableNumber).find(orderHasConsumption);

export const resolveSelectedComandaId = (
  selectedComanda: Pick<Order, 'id'> | null | undefined,
  currentTable: Pick<Table, 'activeOrderId'> | null | undefined,
  fallbackTable: Pick<Table, 'activeOrderId'> | null | undefined,
): string | undefined => selectedComanda?.id ?? currentTable?.activeOrderId ?? fallbackTable?.activeOrderId;

interface OfflineComandaTargetInput {
  isBalcao: boolean;
  queueId: string;
  selectedComanda?: Pick<Order, 'id' | 'comandaLabel' | 'offlineIdKey'> | null;
  tableActiveOrderId?: string;
}

export interface OfflineComandaTarget {
  existingOrderId?: string;
  targetOrderId?: string;
  comandaLabel?: string;
  offlineIdKey?: string;
  isNewComanda: boolean;
}

export const resolveOfflineComandaTarget = ({
  isBalcao,
  queueId,
  selectedComanda,
  tableActiveOrderId,
}: OfflineComandaTargetInput): OfflineComandaTarget => {
  if (isBalcao) return { isNewComanda: false };

  const selectedComandaId = selectedComanda?.id;
  const selectedIsLocal = Boolean(selectedComandaId?.startsWith('local_comanda_'));
  const targetOrderId = selectedComandaId ?? tableActiveOrderId;
  const isNewComanda = selectedIsLocal || !targetOrderId;

  return {
    existingOrderId: targetOrderId && !selectedIsLocal ? targetOrderId : undefined,
    targetOrderId,
    comandaLabel: selectedComanda?.comandaLabel ?? (isNewComanda ? 'Comanda Geral' : undefined),
    offlineIdKey: isNewComanda ? (selectedComanda?.offlineIdKey ?? queueId) : undefined,
    isNewComanda,
  };
};
