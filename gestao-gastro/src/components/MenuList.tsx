import React from 'react';
import { useApp } from '../store/AppContext';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ui } from '../ui/styles';
import { getProductIcon } from '../utils/productIcons';
import { ShoppingCart } from 'lucide-react';

import { getProductStock } from '../services/stockGuard';

interface MenuListProps {
  category: string;
  searchTerm: string;
  onSelect: (product: Product) => void;
}

export const MenuList: React.FC<MenuListProps> = ({ category, searchTerm, onSelect }) => {
  const { products, stockItems, theme } = useApp();
  const isDark = theme === 'dark';

  const filteredProducts = products.filter(p => {
    const matchesCategory = category === 'Todos' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isActive = p.active !== false;
    return matchesCategory && matchesSearch && isActive;
  });

  const getCategoryIcon = (cat: string, name: string) => {
    return getProductIcon(cat, name);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 xl:gap-4">
      <AnimatePresence mode="popLayout">
        {filteredProducts.map((product) => {
          const stockQty = getProductStock(product, stockItems);
          const isOutOfStock = stockQty === 0;
          const CategoryIcon = getCategoryIcon(product.category, product.name);

          return (
            <motion.button
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={isOutOfStock ? {} : { y: -3, scale: 1.01 }}
              whileTap={isOutOfStock ? {} : { scale: 0.98 }}
              key={product.id}
              onClick={() => !isOutOfStock && onSelect(product)}
              disabled={isOutOfStock}
              className={`group relative min-h-[190px] flex flex-col items-start p-4 rounded-panel border text-left transition-all duration-300
                ${isOutOfStock
                  ? `cursor-not-allowed opacity-50 ${ui.panelMuted(isDark)}`
                  : `${ui.panel(isDark)} hover:border-accent/40 hover:shadow-md`
                }
              `}
            >
              <div className={`absolute top-3 right-3 px-3 py-1 rounded-control font-bold text-[10px] tracking-tight shadow-sm
                ${isDark ? 'bg-white/5 text-white' : 'bg-[#475569] text-white'}`}>
                R$ {product.price.toFixed(2)}
              </div>

              <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 transition-all duration-500
                ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <CategoryIcon className="w-5 h-5 opacity-80" />
              </div>

              <div className="space-y-1 w-full flex-1">
                <h4 className="text-xs font-bold uppercase tracking-tight group-hover:text-accent transition-colors leading-tight line-clamp-2 pr-12">
                  {product.name}
                </h4>
                <p className="text-[9px] font-bold opacity-35 uppercase line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-dashed border-current/5 flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-red-500' : stockQty > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-bold uppercase tracking-tight opacity-45">
                    {stockQty === 999 ? 'Disponível' : isOutOfStock ? 'Sem estoque' : `${stockQty} em estoque`}
                  </span>
                </div>
                {!isOutOfStock && (
                  <div className={`p-2 rounded-lg transition-all duration-300 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100
                    ${isDark ? 'bg-white/10 text-white' : 'bg-accent/10 text-accent'}`}>
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
