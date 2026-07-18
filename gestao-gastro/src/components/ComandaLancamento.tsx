import React, { useEffect, useMemo, useState } from 'react';
import type { Product } from '../types';

export interface ComandaDraftItem {
  product: Product;
  quantity: number;
  observation?: string;
}

interface ComandaLancamentoProps {
  tableLabel: string;
  products: Product[];
  items: ComandaDraftItem[];
  isOnline: boolean;
  onBack: () => void;
  onIncrement: (product: Product) => void;
  onDecrement: (productId: string) => void;
  onSetObservation: (productId: string, observation: string) => void;
  onProceed: () => void;
  onSaveOffline: () => void;
}

const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ComandaLancamento: React.FC<ComandaLancamentoProps> = React.memo(({
  tableLabel,
  products,
  items,
  isOnline,
  onBack,
  onIncrement,
  onDecrement,
  onSetObservation,
  onProceed,
  onSaveOffline,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [editingObservationId, setEditingObservationId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTerm(searchTerm.trim().toLowerCase());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set<string>(products.map(p => p.category)));
    unique.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return ['todas', ...unique];
  }, [products]);

  const quantityMap = useMemo(() => {
    const map = new Map<string, ComandaDraftItem>();
    items.forEach(item => map.set(item.product.id, item));
    return map;
  }, [items]);

  const filteredProducts = useMemo(() =>
    products.filter(p => {
      const matchCat = selectedCategory === 'todas' || p.category === selectedCategory;
      const matchSearch = debouncedTerm.length === 0 || p.name.toLowerCase().includes(debouncedTerm);
      return (p.active ?? true) && matchCat && matchSearch;
    }),
  [products, selectedCategory, debouncedTerm]);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const totalValue = useMemo(() => items.reduce((s, i) => s + i.quantity * i.product.price, 0), [items]);

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="h-9 px-3 rounded-lg border border-gray-300 dark:border-white/10 text-xs font-medium">
          ← Voltar
        </button>
        <p className="text-sm font-semibold">{tableLabel}</p>
      </div>

      <input
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Buscar produto..."
        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-sm outline-none"
      />

      <div className="flex gap-2 overflow-x-auto scroll-x-touch pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-slate-700 text-white border-slate-700'
                : 'border-gray-200 dark:border-white/10 text-gray-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredProducts.map(product => {
          const draftItem = quantityMap.get(product.id);
          return (
            <div
              key={product.id}
              className="rounded-xl border border-gray-100 dark:border-white/10 p-3 bg-white dark:bg-white/5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{money(product.price)}</p>
                  {draftItem?.observation && (
                    <p className="text-[11px] text-amber-600 mt-1 truncate">Obs: {draftItem.observation}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!draftItem) onIncrement(product);
                      setEditingObservationId(current => current === product.id ? null : product.id);
                    }}
                    className={`h-8 px-2 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${
                      draftItem?.observation
                        ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200'
                        : 'border-gray-200 dark:border-white/10 text-gray-500'
                    }`}
                  >
                    Obs
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecrement(product.id)}
                    disabled={!draftItem || draftItem.quantity === 0}
                    aria-label={`Diminuir quantidade de ${product.name}`}
                    className="w-11 h-11 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-bold disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">
                    {draftItem?.quantity || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => onIncrement(product)}
                    aria-label={`Aumentar quantidade de ${product.name}`}
                    className="w-11 h-11 rounded-lg bg-slate-700 text-white text-sm font-bold active:scale-[0.95]"
                  >
                    +
                  </button>
                </div>
              </div>
              {editingObservationId === product.id && (
                <div className="mt-3">
                  <textarea
                    value={draftItem?.observation || ''}
                    onChange={event => onSetObservation(product.id, event.target.value)}
                    rows={2}
                    placeholder="Ex: sem cebola, ponto da carne, alergia..."
                    className="w-full rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs outline-none resize-none dark:border-amber-500/30 dark:bg-amber-900/10"
                  />
                </div>
              )}
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-6 text-center">
            <p className="text-sm font-semibold">Nenhum produto encontrado.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedTerm('');
                setSelectedCategory('todas');
              }}
              className="mt-3 h-9 px-4 rounded-lg bg-slate-700 text-white text-xs font-semibold"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {!isOnline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-2">
          <p>Sem conexão. Você pode salvar este pedido na fila local.</p>
          <button onClick={onSaveOffline} className="h-8 px-3 rounded-lg border border-amber-400 font-semibold">
            Salvar pedido offline
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 p-3 flex items-center justify-between gap-3 shadow-lg">
          <div>
            <p className="text-xs text-gray-500">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
            <p className="text-sm font-bold">{money(totalValue)}</p>
          </div>
          <button
            onClick={onProceed}
            disabled={totalItems === 0}
            className="h-10 px-5 rounded-lg bg-slate-700 text-white text-sm font-semibold disabled:opacity-40 transition-all"
          >
            Revisar →
          </button>
        </div>
      </div>
    </div>
  );
});
