import React from 'react';
import type { Order, Table } from '../types';

interface ComandaMesaResumoProps {
  table: Table;
  order?: Order;
  onBack: () => void;
  onAddItems: () => void;
  onStartNewOrder: () => void;
}

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ComandaMesaResumo: React.FC<ComandaMesaResumoProps> = React.memo(({
  table,
  order,
  onBack,
  onAddItems,
  onStartNewOrder,
}) => {
  const itemsCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium">
          ← Voltar
        </button>
        <div className="text-right">
          <p className="text-sm font-semibold">Mesa {table.number}</p>
          <p className="text-[11px] text-gray-500">{order ? `${itemsCount} item(ns) na comanda` : 'Sem comanda aberta'}</p>
        </div>
      </div>

      {order ? (
        <>
          <div className="rounded-xl border border-gray-100 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-white/5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Comanda aberta</span>
              <span className="text-sm font-bold">{money(order.total)}</span>
            </div>

            <div className="space-y-3">
              {order.items.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.quantity}× {item.product.name}</p>
                    {item.observation && (
                      <p className="text-[11px] text-amber-600 truncate">Obs: {item.observation}</p>
                    )}
                  </div>
                  <p className="font-semibold flex-shrink-0">{money(item.quantity * item.price)}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onAddItems}
            className="w-full h-12 rounded-xl bg-slate-700 text-white text-sm font-semibold active:scale-[0.98] transition-all"
          >
            Adicionar itens
          </button>
        </>
      ) : (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Nenhuma comanda aberta encontrada</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-100/70 mt-1">
              Esta mesa está marcada como ocupada, mas não há pedido aberto para consulta. Você pode iniciar uma nova comanda.
            </p>
          </div>
          <button
            onClick={onStartNewOrder}
            className="w-full h-11 rounded-xl bg-slate-700 text-white text-sm font-semibold active:scale-[0.98] transition-all"
          >
            Iniciar nova comanda
          </button>
        </div>
      )}
    </div>
  );
});
