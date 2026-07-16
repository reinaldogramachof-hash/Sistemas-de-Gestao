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
  const ordersByTable = new Map(
    openOrders
      .filter(order => order.mode === 'mesa' && typeof order.tableNumber === 'number')
      .map(order => [order.tableNumber, order]),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Selecione a mesa</h2>
        <p className="text-xs opacity-60 mt-0.5">Toque na mesa para abrir a comanda.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tables.map(table => {
          const order = ordersByTable.get(table.number);
          const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

          return (
            <button
              key={table.number}
              onClick={() => onSelectTable(table)}
              className={`min-h-20 rounded-xl border-2 p-3 transition-all active:scale-[0.97] ${statusClass[table.status]}`}
            >
              <p className="text-base font-bold">Mesa {table.number}</p>
              <p className="text-[11px] mt-1 opacity-80">{statusLabel[table.status]}</p>
              {order && (
                <p className="text-[10px] mt-1 font-semibold opacity-90">
                  {itemCount} item(ns) · {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              )}
            </button>
          );
        })}
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
