import React from 'react';
import type { Order, Table } from '../types';

interface ComandaMesaResumoProps {
  table: Table;
  order?: Order;
  tables: Table[];
  isBusy?: boolean;
  onBack: () => void;
  onAddItems: () => void;
  onStartNewOrder: () => void;
  onReleaseTable: () => void;
  onTransferTable: (targetTableNumber: number) => void;
  onUpdateCustomerName?: (value: string) => void;
}

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ComandaMesaResumo: React.FC<ComandaMesaResumoProps> = React.memo(({
  table,
  order,
  tables,
  isBusy = false,
  onBack,
  onAddItems,
  onStartNewOrder,
  onReleaseTable,
  onTransferTable,
  onUpdateCustomerName,
}) => {
  const itemsCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const hasConsumption = Boolean(order && (order.items.length > 0 || order.subtotal > 0 || order.total > 0));
  const [draftCustomerName, setDraftCustomerName] = React.useState(order?.customerName || '');
  const [showTransfer, setShowTransfer] = React.useState(false);
  const [showPreClose, setShowPreClose] = React.useState(false);
  const freeTables = tables.filter(item => item.status === 'livre' && item.number !== table.number);
  const partialPaymentsTotal = order?.partialPayments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const hasCheckoutPricing = Boolean(
    order && (order.serviceCharge > 0 || (order.loyaltyDiscount ?? 0) > 0 || partialPaymentsTotal > 0),
  );
  const currentTotal = order
    ? (hasCheckoutPricing ? Math.max(0, order.total) : Math.max(order.subtotal, order.total))
    : 0;
  const remainingTotal = Math.max(0, currentTotal - partialPaymentsTotal);
  const peopleCount = order
    ? Math.max(0, order.customerCount ?? ((order.adultCount ?? 0) + (order.childrenCount ?? 0)))
    : 0;

  React.useEffect(() => {
    setDraftCustomerName(order?.customerName || '');
    setShowPreClose(false);
  }, [order?.customerName, order?.id]);

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
              {order.generalObservation && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <span className="font-bold">Obs. geral:</span> {order.generalObservation}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onAddItems}
            className="w-full h-12 rounded-xl bg-slate-700 text-white text-sm font-semibold active:scale-[0.98] transition-all"
          >
            Adicionar itens
          </button>

          {hasConsumption && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-900/10">
              <button
                type="button"
                aria-expanded={showPreClose}
                aria-controls={`pre-fechamento-mesa-${table.number}`}
                onClick={() => setShowPreClose(current => !current)}
                className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-blue-800 dark:text-blue-200"
              >
                <span>Conferir pré-fechamento</span>
                <span aria-hidden="true">{showPreClose ? '−' : '+'}</span>
              </button>

              {showPreClose && (
                <section
                  id={`pre-fechamento-mesa-${table.number}`}
                  aria-label={`Pré-fechamento da mesa ${table.number}`}
                  className="mt-3 space-y-3 border-t border-blue-200 pt-3 text-xs dark:border-blue-500/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600 dark:text-gray-300">Consumo lançado</span>
                    <span className="font-semibold">{money(order.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-600 dark:text-gray-300">Taxa de serviço</span>
                    <span className="font-semibold">
                      {order.serviceCharge > 0 ? money(order.serviceCharge) : 'A confirmar no Caixa'}
                    </span>
                  </div>
                  {(order.loyaltyDiscount ?? 0) > 0 && (
                    <div className="flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                      <span>Desconto aplicado</span>
                      <span className="font-semibold">− {money(order.loyaltyDiscount ?? 0)}</span>
                    </div>
                  )}
                  {partialPaymentsTotal > 0 && (
                    <div className="flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                      <span>Pagamentos já registrados</span>
                      <span className="font-semibold">− {money(partialPaymentsTotal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 border-t border-blue-200 pt-3 text-sm dark:border-blue-500/20">
                    <span className="font-semibold">Saldo parcial</span>
                    <span className="font-bold">{money(remainingTotal)}</span>
                  </div>
                  {peopleCount > 1 && (
                    <p className="rounded-lg bg-white/70 px-3 py-2 text-gray-600 dark:bg-black/20 dark:text-gray-300">
                      Estimativa para {peopleCount} pessoas: <strong>{money(remainingTotal / peopleCount)} por pessoa</strong>.
                    </p>
                  )}
                  <p className="leading-4 text-blue-700 dark:text-blue-200">
                    Esta conferência não fecha a comanda. Taxa, descontos e pagamento final devem ser confirmados no Caixa.
                  </p>
                </section>
              )}
            </div>
          )}

          <label className="space-y-1 block rounded-xl border border-gray-100 dark:border-white/10 p-4 bg-white dark:bg-white/5">
            <span className="text-xs text-gray-500">Nome do cliente</span>
            <input
              value={draftCustomerName}
              onChange={event => setDraftCustomerName(event.target.value)}
              onBlur={() => onUpdateCustomerName?.(draftCustomerName)}
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 text-sm outline-none"
              placeholder="Ex: Cliente da mesa, Joao..."
            />
            <span className="block text-[10px] text-gray-400">O nome fica salvo na comanda aberta.</span>
          </label>

          <div className="rounded-xl border border-gray-100 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-white/5">
            {!hasConsumption && (
              <button
                type="button"
                onClick={onReleaseTable}
                disabled={isBusy}
                className="w-full h-11 rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200 text-sm font-semibold disabled:opacity-45"
              >
                Liberar mesa
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTransfer(current => !current)}
              disabled={isBusy || freeTables.length === 0}
              className="w-full h-11 rounded-xl border border-blue-300 text-blue-700 dark:border-blue-500/30 dark:text-blue-200 text-sm font-semibold disabled:opacity-45"
            >
              Trocar de mesa
            </button>

            {showTransfer && (
              <div className="grid grid-cols-4 gap-2">
                {freeTables.map(target => (
                  <button
                    key={target.number}
                    type="button"
                    onClick={() => onTransferTable(target.number)}
                    disabled={isBusy}
                    className="h-11 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-bold"
                  >
                    {target.number}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] leading-4 text-gray-500">
              {hasConsumption
                ? 'Para liberar uma mesa com itens lancados, finalize ou cancele a comanda no caixa.'
                : 'Use liberar mesa quando o cliente desistir antes de consumir.'}
            </p>
          </div>
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
          <button
            onClick={onReleaseTable}
            disabled={isBusy}
            className="w-full h-11 rounded-xl border border-emerald-300 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200 text-sm font-semibold active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Liberar mesa
          </button>
        </div>
      )}
    </div>
  );
});
