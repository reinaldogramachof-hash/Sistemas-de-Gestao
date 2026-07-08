import React from 'react';
import { useApp } from '../store/AppContext';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Package, ShoppingCart } from 'lucide-react';

interface MenuListProps {
  category: string;
  searchTerm: string;
  onSelect: (product: Product) => void;
}

export const MenuList: React.FC<MenuListProps> = ({ category, searchTerm, onSelect }) => {
  const { products, theme } = useApp();
  const isDark = theme === 'dark';

  const filteredProducts = products.filter(p => {
    const matchesCategory = category === 'Todos' || p.category === category;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getEmoji = (cat: string) => {
    switch (cat) {
      case 'Drinks': return '🍸';
      case 'Petiscos': return '🍟';
      case 'Pratos': return '🍽️';
      case 'Sobremesas': return '🍰';
      default: return '📦';
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      <AnimatePresence mode="popLayout">
        {filteredProducts.map((product) => (
          <motion.button
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={product.id}
            onClick={() => onSelect(product)}
            className={`group relative flex flex-col items-start p-5 rounded-xl border text-left transition-all duration-300
              ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] hover:border-[#475569]/40' : 'bg-white border-gray-100 hover:border-[#475569]/40 shadow-sm hover:shadow-sm shadow-gray-200/20'}
            `}
          >
            {/* Price Tag */}
            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl font-black text-[10px] tracking-tight shadow-sm
              ${isDark ? 'bg-white/5 text-white' : 'bg-[#475569] text-white'}`}>
              R$ {product.price.toFixed(2)}
            </div>

            {/* Icon/Emoji Container */}
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-4 transition-all duration-500 group-
              ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              {getEmoji(product.category)}
            </div>

            {/* Product Info */}
            <div className="space-y-1 w-full flex-1">
              <h4 className="text-xs font-black uppercase tracking-tight group-hover:text-[#475569] transition-colors leading-tight line-clamp-2">
                {product.name}
              </h4>
              <p className="text-[9px] font-bold opacity-30 uppercase tracking-tight line-clamp-1 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Stock Indicator & Add Button */}
            <div className="mt-4 pt-4 border-t border-dashed border-current/5 flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 10 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">
                  {product.stock} em estoque
                </span>
              </div>
              <div className={`p-2 rounded-lg transition-all duration-300 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100
                ${isDark ? 'bg-white/10 text-white' : 'bg-[#475569]/10 text-[#475569]'}`}>
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
};
