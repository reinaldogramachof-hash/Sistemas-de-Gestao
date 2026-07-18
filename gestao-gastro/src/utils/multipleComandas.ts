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
