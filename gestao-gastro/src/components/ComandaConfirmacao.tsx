import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ComandaDraftItem } from './ComandaLancamento';

interface ComandaConfirmacaoProps {
  tableLabel: string;
  items: ComandaDraftItem[];
  generalObservation: string;
  setGeneralObservation: (value: string) => void;
  isOnline: boolean;
  success: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ComandaConfirmacao: React.FC<ComandaConfirmacaoProps> = React.memo(({
  tableLabel,
  items,
  generalObservation,
  setGeneralObservation,
  isOnline,
  success,
  onBack,
  onConfirm,
}) => {
  const total = items.reduce((sum, item) => sum + item.quantity * item.product.price, 0);

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Lançamento concluído!</h3>
          <p className="text-xs text-gray-500 mt-1">Os itens foram registrados na comanda da mesa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium">
          ← Voltar
        </button>
        <p className="text-sm font-semibold">{tableLabel}</p>
      </div>

      <div className="rounded-xl border border-gray-100 dark:border-white/10 p-3 space-y-2 bg-white dark:bg-white/5">
        {items.map(item => (
          <div key={item.product.id} className="flex items-start justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium truncate">{item.quantity}× {item.product.name}</p>
              {item.observation && (
                <p className="text-[11px] text-amber-600 truncate">Obs: {item.observation}</p>
              )}
            </div>
            <p className="font-semibold flex-shrink-0">{money(item.quantity * item.product.price)}</p>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-base font-bold">{money(total)}</span>
        </div>
      </div>

      <label className="space-y-1 block">
        <span className="text-xs text-gray-500">Observação geral</span>
        <textarea
          value={generalObservation}
          onChange={e => setGeneralObservation(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none resize-none"
          placeholder="Ex: sem cebola, alergia a lactose..."
        />
      </label>

      <button
        onClick={onConfirm}
        className="w-full h-12 rounded-xl bg-slate-700 text-white text-sm font-semibold active:scale-[0.98] transition-all"
      >
        {isOnline ? 'Concluir lançamento ✓' : 'Salvar na fila offline'}
      </button>
    </div>
  );
});
