import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Product, Order } from '../types';
import { MenuList } from './MenuList';
import { ShoppingBag, Search, Minus, Trash2, Plus, ArrowRight, User } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { motion, AnimatePresence } from 'motion/react';
import { ui } from '../ui/styles';

export const PDV: React.FC = () => {
  const { waiters, customers, theme, draftOrder, setDraftOrder } = useApp();
  const isDark = theme === 'dark';

  const [activeOrder, setActiveOrder] = useState<Order>(() => {
    if (draftOrder) return draftOrder;
    return {
      id: Date.now().toString(),
      mode: 'balcao',
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      total: 0,
      payments: [],
      status: 'open',
      waiterId: waiters[0]?.id || 'w1',
      timestamp: new Date().toISOString(),
    };
  });

  useEffect(() => {
    setDraftOrder(activeOrder);
  }, [activeOrder, setDraftOrder]);

  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todos');
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Custom item state
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  const addItemToOrder = (product: Product) => {
    const existingIdx = activeOrder.items.findIndex(i => i.product.id === product.id);
    let updatedItems = [...activeOrder.items];

    if (existingIdx !== -1) {
      updatedItems[existingIdx] = {
        ...updatedItems[existingIdx],
        quantity: updatedItems[existingIdx].quantity + 1,
      };
    } else {
      updatedItems.push({
        id: Date.now().toString() + Math.random(),
        product,
        quantity: 1,
        price: product.price,
        kitchenStatus: 'aguardando',
        addedAt: new Date().toISOString(),
      });
    }

    const subtotal = updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    setActiveOrder({ ...activeOrder, items: updatedItems, subtotal, total: subtotal });
  };

  const addCustomItem = () => {
    const price = parseFloat(customItemPrice.replace(',', '.'));
    if (!customItemName.trim() || isNaN(price) || price <= 0) return;

    const customProduct: Product = {
      id: `custom_${Date.now()}`,
      name: customItemName.trim(),
      description: 'Item avulso',
      price: price,
      category: 'Diversos',
    };

    addItemToOrder(customProduct);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  const changeItemQty = (itemId: string, delta: number) => {
    const updatedItems = activeOrder.items
      .map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0);
    const subtotal = updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    setActiveOrder({ ...activeOrder, items: updatedItems, subtotal, total: subtotal });
  };

  const categories = ['Todos', 'Drinks', 'Petiscos', 'Pratos', 'Sobremesas'];
  const totalItems = activeOrder.items.reduce((acc, i) => acc + i.quantity, 0);
  const getCategoryCode = (category: string) => {
    if (category === 'Drinks') return 'DR';
    if (category === 'Petiscos') return 'PT';
    if (category === 'Pratos') return 'PR';
    if (category === 'Sobremesas') return 'SB';
    return 'AV';
  };

  const handleSuccess = () => {
    setCheckoutOpen(false);
    const newOrder: Order = {
      id: Date.now().toString(),
      mode: 'balcao',
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      total: 0,
      payments: [],
      status: 'open',
      waiterId: waiters[0]?.id || 'w1',
      timestamp: new Date().toISOString(),
    };
    setActiveOrder(newOrder);
    setDraftOrder(null);
  };

  const clearCart = () => {
    setActiveOrder({ ...activeOrder, items: [], subtotal: 0, total: 0 });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-8">
      {/* Left side: Menu */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className={ui.pageTitle}>Venda Rápida</h2>
            <p className={ui.pageSubtitle}>Atendimento direto</p>
          </div>

          <div className={`flex items-center px-4 py-2.5 w-full md:w-72 focus-within:ring-4 focus-within:ring-accent/10 ${ui.input(isDark)}`}>
            <Search className="w-5 h-5 mr-3 opacity-40" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar produto..."
              className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:opacity-30"
            />
          </div>
        </div>

        <div className={`${ui.tabShell(isDark)} w-fit mb-8 overflow-x-auto scrollbar-none`}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-6 py-2.5 ${ui.tab(category === cat, isDark)}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <MenuList category={category} searchTerm={searchTerm} onSelect={addItemToOrder} />
        </div>
      </div>

      {/* Right side: Cart */}
      <div className={`w-full lg:w-[420px] xl:w-[440px] flex flex-col rounded-panel border overflow-hidden shrink-0 shadow-sm relative
        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>

        {/* Cart Header */}
        <div className={`p-6 border-b flex flex-col gap-4 ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-lg bg-[#475569] flex items-center justify-center text-white">
                  <ShoppingBag className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold uppercase tracking-tighter text-lg">Carrinho</h3>
                 <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold uppercase text-[#475569]">{totalItems} Itens</span>
                   <span className="opacity-20 text-[10px]">|</span>
                   <span className="text-[10px] font-bold uppercase flex items-center gap-1 opacity-40"><User className="w-3 h-3" /> Balcão</span>
                 </div>
               </div>
             </div>
             <button onClick={clearCart} className={`p-3 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500 opacity-20 hover:opacity-100`}>
                <Trash2 className="w-5 h-5" />
             </button>
           </div>

           <div className="grid grid-cols-2 gap-3 mt-2">
             <div className="space-y-1">
               <label className="text-[9px] font-bold uppercase tracking-wide opacity-50">Operador</label>
               <select
                 value={activeOrder.waiterId}
                 onChange={e => setActiveOrder({...activeOrder, waiterId: e.target.value})}
                 className={`w-full p-2.5 rounded-lg border outline-none font-bold text-xs ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-white border-gray-200'}`}
               >
                 {waiters.map(w => (
                   <option key={w.id} value={w.id}>{w.name}</option>
                 ))}
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-bold uppercase tracking-wide opacity-50">Cliente</label>
               <select
                 value={activeOrder.customerId || ''}
                 onChange={e => setActiveOrder({...activeOrder, customerId: e.target.value || undefined})}
                 className={`w-full p-2.5 rounded-lg border outline-none font-bold text-xs ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-white border-gray-200'}`}
               >
                 <option value="">Consumidor Final</option>
                 {customers.map(c => (
                   <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
               </select>
             </div>
           </div>
        </div>

        {/* Custom Item Row */}
        <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'bg-[#1A1A1C] border-[#2C2C2E]' : 'bg-gray-100 border-gray-200'}`}>
          <div className="flex-1 flex items-center gap-2">
             <input
               value={customItemName}
               onChange={e => setCustomItemName(e.target.value)}
               placeholder="Nome do item avulso..."
               className={`w-full p-2.5 rounded-lg border outline-none font-bold text-xs ${isDark ? 'bg-[#121214] border-[#2C2C2E] placeholder:opacity-30' : 'bg-white border-gray-200'}`}
             />
             <div className="relative w-24 shrink-0">
               <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">R$</span>
               <input
                 value={customItemPrice}
                 onChange={e => setCustomItemPrice(e.target.value)}
                 placeholder="0,00"
                 className={`w-full pl-7 pr-2.5 py-2.5 rounded-lg border outline-none font-bold text-xs ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-white border-gray-200'}`}
               />
             </div>
             <button
               onClick={addCustomItem}
               disabled={!customItemName.trim() || !customItemPrice.trim()}
               className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border transition-all disabled:opacity-30
                 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm'}`}
             >
               <Plus className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[200px]">
          <AnimatePresence initial={false}>
            {activeOrder.items.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center py-10 text-center space-y-4">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <ShoppingBag className="w-8 h-8 opacity-10" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-20">O carrinho está vazio</p>
                    <p className="text-xs font-bold opacity-10">Adicione produtos do menu</p>
                 </div>
              </motion.div>
            ) : activeOrder.items.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all group ${isDark ? 'bg-[#121214] hover:bg-[#121214]/80' : 'bg-gray-50/50 hover:bg-gray-50 border border-gray-100/50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold text-[#475569] ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                  {getCategoryCode(item.product.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase truncate group-hover:text-[#475569] transition-colors leading-tight">{item.product.name}</p>
                  <p className={`text-[9px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    R$ {item.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => changeItemQty(item.id, -1)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90
                      ${item.quantity === 1
                        ? 'border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500'
                        : isDark ? 'border-[#2C2C2E] hover:bg-white/5' : 'border-gray-200 hover:bg-white shadow-sm'}`}
                  >
                    {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </button>
                  <span className="w-4 text-center text-[11px] font-bold tracking-tighter">{item.quantity}</span>
                  <button
                    onClick={() => addItemToOrder(item.product)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90
                      ${isDark ? 'border-[#2C2C2E] hover:bg-[#475569]/10 hover:text-[#475569] hover:border-[#475569]' : 'border-gray-200 hover:bg-white shadow-sm hover:text-[#475569] hover:border-[#475569]'}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Cart Footer */}
        <div className={`p-6 border-t space-y-4 ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold tracking-wide opacity-40">Total do pedido</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-[#475569] opacity-50">R$</span>
                <span className="text-4xl font-bold text-[#475569] tracking-tighter">{activeOrder.total.toFixed(2)}</span>
              </div>
            </div>
            <button
              disabled={activeOrder.items.length === 0}
              onClick={() => setCheckoutOpen(true)}
              className={`${ui.primaryButton} flex items-center gap-2 px-7 py-4 text-[10px] disabled:opacity-30 disabled:scale-100`}
            >
              Finalizar venda
              <ArrowRight className="w-4 h-4 stroke-[3px]" />
            </button>
          </div>
        </div>
      </div>

      {checkoutOpen && (
        <CheckoutModal
          order={activeOrder}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};
