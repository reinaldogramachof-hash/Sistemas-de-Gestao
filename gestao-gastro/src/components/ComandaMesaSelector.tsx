import React from 'react';
import type { Order } from '../types';
import { getComandaDisplayLabel } from '../utils/multipleComandas';

interface ComandaMesaSelectorProps {
  tableNumber: number;
  comandas: Order[];
  isOnline: boolean;
  isBusy?: boolean;
  onBack: () => void;
  onSelect: (order: Order) => void;
  onCreate: (label: string) => void | Promise<void>;
}

const money = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const ComandaMesaSelector: React.FC<ComandaMesaSelectorProps> = React.memo(({
  tableNumber,
  comandas,
  isOnline,
  isBusy = false,
  onBack,
  onSelect,
  onCreate,
}) => {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [draftLabel, setDraftLabel] = React.useState('');
  const [validationError, setValidationError] = React.useState('');
  const inputId = `nova-comanda-mesa-${tableNumber}`;
  const total = comandas.reduce((sum, order) => sum + order.total, 0);

  const submitNewComanda = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedLabel = draftLabel.trim();

    if (!normalizedLabel) {
      setValidationError('Informe um nome ou número para identificar a comanda.');
      return;
    }

    if (comandas.some((order, index) => (
      getComandaDisplayLabel(order, index).localeCompare(normalizedLabel, 'pt-BR', {
        sensitivity: 'base',
      }) === 0
    ))) {
      setValidationError('Já existe uma comanda aberta com esse identificador.');
      return;
    }

    setValidationError('');
    await onCreate(normalizedLabel);
    setDraftLabel('');
    setShowCreateForm(false);
  };

  return (
    <section className="space-y-4" aria-labelledby={`comandas-mesa-${tableNumber}`}>
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl border border-gray-200 px-4 text-xs font-semibold dark:border-white/10"
        >
          ← Mesas
        </button>
        <div className="text-right">
          <h2 id={`comandas-mesa-${tableNumber}`} className="text-base font-bold">
            Mesa {tableNumber}
          </h2>
          <p className="text-xs text-gray-500">
            {comandas.length} {comandas.length === 1 ? 'conta aberta' : 'contas abertas'}
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-900/10">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200">
            Total da mesa
          </span>
          <strong className="text-base text-blue-900 dark:text-blue-100">{money(total)}</strong>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-blue-700/80 dark:text-blue-200/80">
          Cada conta é fechada separadamente no Caixa.
        </p>
      </div>

      <div className="space-y-2" role="list" aria-label={`Contas abertas da mesa ${tableNumber}`}>
        {comandas.map((order, index) => {
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
          const label = getComandaDisplayLabel(order, index);

          return (
            <button
              key={order.id}
              type="button"
              role="listitem"
              onClick={() => onSelect(order)}
              disabled={isBusy}
              className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 text-left transition-all active:scale-[0.99] disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
              aria-label={`Abrir ${label}, ${money(order.total)}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{label}</span>
                <span className="mt-1 block text-[11px] text-gray-500">
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                  {order.waiterId ? ` · Garçom responsável` : ''}
                </span>
              </span>
              <span className="flex-shrink-0 text-right">
                <strong className="block text-sm">{money(order.total)}</strong>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">Abrir →</span>
              </span>
            </button>
          );
        })}
      </div>

      {showCreateForm ? (
        <form
          onSubmit={submitNewComanda}
          className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-900/10"
        >
          <label htmlFor={inputId} className="block text-xs font-semibold text-emerald-900 dark:text-emerald-100">
            Nome ou número da nova comanda
          </label>
          <input
            id={inputId}
            value={draftLabel}
            onChange={event => {
              setDraftLabel(event.target.value);
              setValidationError('');
            }}
            maxLength={80}
            autoFocus
            autoComplete="off"
            placeholder="Ex: Maria, Comanda 45"
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? `${inputId}-error` : `${inputId}-hint`}
            className="h-12 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 dark:border-emerald-500/20 dark:bg-slate-900"
          />
          {validationError ? (
            <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 dark:text-red-300">
              {validationError}
            </p>
          ) : (
            <p id={`${inputId}-hint`} className="text-[11px] text-emerald-700 dark:text-emerald-200">
              Use um identificador diferente das outras contas abertas nesta mesa.
            </p>
          )}
          {!isOnline && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              Sem conexão: a nova comanda será enviada quando a sincronização voltar.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setDraftLabel('');
                setValidationError('');
              }}
              disabled={isBusy}
              className="min-h-11 rounded-xl border border-gray-200 text-sm font-semibold disabled:opacity-50 dark:border-white/10"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="min-h-11 rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isBusy ? 'Criando…' : 'Criar comanda'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          disabled={isBusy}
          className="min-h-12 w-full rounded-xl bg-slate-700 px-4 text-sm font-semibold text-white transition-all active:scale-[0.99] disabled:opacity-50"
        >
          + Nova comanda nesta mesa
        </button>
      )}
    </section>
  );
});

ComandaMesaSelector.displayName = 'ComandaMesaSelector';
