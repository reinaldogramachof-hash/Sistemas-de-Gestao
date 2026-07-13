import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const longPressRef = useRef<number | null>(null);

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

  const beginLongPress = (product: Product) => {
    longPressRef.current = window.setTimeout(() => {
      const current = quantityMap.get(product.id)?.observation || '';
      const next = window.prompt(`Observação para ${product.name}`, current);
      if (next !== null) onSetObservation(product.id, next.trim());
    }, 500);
  };

  const endLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

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

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
              onPointerDown={() => beginLongPress(product)}
              onPointerUp={endLongPress}
              onPointerLeave={endLongPress}
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
                    onClick={() => onDecrement(product.id)}
                    className="w-8 h-8 rounded-lg border border-gray-200 dark:border-white/10 text-sm font-bold"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">
                    {draftItem?.quantity || 0}
                  </span>
                  <button
                    onClick={() => onIncrement(product)}
                    className="w-8 h-8 rounded-lg bg-slate-700 text-white text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isOnline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-2">
          <p>Sem conexão. Você pode salvar este pedido na fila local.</p>
          <button onClick={onSaveOffline} className="h-8 px-3 rounded-lg border border-amber-400 font-semibold">
            Salvar pedido offline
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-3 pb-4">
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
