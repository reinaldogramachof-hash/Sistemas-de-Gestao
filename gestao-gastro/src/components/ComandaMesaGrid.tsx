import React from 'react';
import type { Order, Table } from '../types';

interface ComandaMesaGridProps {
  tables: Table[];
  openOrders?: Order[];
  onSelectTable: (table: Table) => void;
  onSelectBalcao: () => void;
}

const statusClass: Record<Table['status'], string> = {
  livre:     'border-emerald-500 bg-emerald-500/10 text-emerald-600',
  ocupada:   'border-blue-500 bg-blue-500/10 text-blue-600',
  reservada: 'border-purple-500 bg-purple-500/10 text-purple-600',
  aguardando:'border-amber-500 bg-amber-500/10 text-amber-600',
};

const statusLabel: Record<Table['status'], string> = {
  livre:     'Livre',
  ocupada:   'Ocupada',
  reservada: 'Reservada',
  aguardando:'Aguardando',
};

export const ComandaMesaGrid: React.FC<ComandaMesaGridProps> = React.memo(({
  tables,
  openOrders = [],
  onSelectTable,
  onSelectBalcao,
}) => {
  const [statusFilter, setStatusFilter] = React.useState<Table['status'] | 'todas'>('todas');
  const computedTables = tables.map(t => {
    let visualStatus = t.status;
    if (visualStatus === 'ocupada' && t.activeOrderId) {
      const activeOrder = openOrders.find(o => o.id === t.activeOrderId);
      if (activeOrder && activeOrder.items.some(item => item.kitchenStatus === 'aguardando' || item.kitchenStatus === 'preparo')) {
        visualStatus = 'aguardando';
      }
    }
    return { ...t, status: visualStatus };
  });

  const ordersByTable = new Map(
    openOrders
      .filter(order => order.mode === 'mesa' && typeof order.tableNumber === 'number')
      .map(order => [order.tableNumber, order]),
  );
  const filteredTables = statusFilter === 'todas'
    ? computedTables
    : computedTables.filter(table => table.status === statusFilter);
  const statusCounts = computedTables.reduce(
    (acc, table) => {
      acc.todas += 1;
      acc[table.status as Table['status']] += 1;
      return acc;
    },
    { todas: 0, livre: 0, ocupada: 0, reservada: 0, aguardando: 0 } as Record<Table['status'] | 'todas', number>,
  );
  const filters: Array<Table['status'] | 'todas'> = ['todas', 'livre', 'ocupada', 'aguardando', 'reservada'];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Selecione a mesa</h2>
        <p className="text-xs opacity-60 mt-0.5">Toque na mesa para abrir a comanda.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filters.map(filter => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`h-10 rounded-lg border px-3 text-left transition-all ${
              statusFilter === filter
                ? 'border-slate-700 bg-slate-700 text-white'
                : 'border-gray-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wide">
              {filter === 'todas' ? 'Todas' : statusLabel[filter]}
            </span>
            <span className="block text-[10px] opacity-70">{statusCounts[filter]} mesa(s)</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filteredTables.map(table => {
          const order = ordersByTable.get(table.number);
          const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

          return (
            <button
              key={table.number}
              onClick={() => onSelectTable(table)}
              className={`min-h-20 rounded-xl border-2 p-3 transition-all active:scale-[0.97] ${statusClass[table.status]}`}
            >
              <p className="text-base font-bold">Mesa {table.number}</p>
              {table.sector && (
                <p className="text-[10px] mt-0.5 opacity-70">{table.sector}</p>
              )}
              <p className="text-[11px] mt-1 opacity-80">{statusLabel[table.status]}</p>
              {order && (
                <p className="text-[10px] mt-1 font-semibold opacity-90">
                  {itemCount} item(ns) · {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              )}
            </button>
          );
        })}
        {filteredTables.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-gray-200 p-6 text-center text-xs font-semibold opacity-60 dark:border-white/10">
            Nenhuma mesa neste filtro.
          </div>
        )}
      </div>

      <button
        onClick={onSelectBalcao}
        className="w-full h-12 rounded-xl bg-slate-700 text-white text-sm font-semibold active:scale-[0.98] transition-all"
      >
        Nova Comanda Balcão
      </button>
    </div>
  );
});
