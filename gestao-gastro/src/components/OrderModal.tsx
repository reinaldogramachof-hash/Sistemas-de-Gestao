import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Product, Order } from '../types';
import { MenuList } from './MenuList';
import { X, Search, Minus, Trash2, Plus, MoveRight, Merge, Clock, Settings, Users, Baby, User, CalendarCheck, PlayCircle, Loader2, AlertTriangle, RefreshCw, ShoppingBag, ChevronRight, LayoutGrid, List, CheckCircle } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { motion, AnimatePresence } from 'motion/react';
import { validateStock } from '../services/stockGuard';
import { isSupabaseConfigured } from '../lib/supabase';
import { OperationFeedback, OperationFeedbackMessage } from './OperationFeedback';

interface OrderModalProps {
  tableNumber: number | null;
  mode: 'mesa' | 'balcao';
  onClose: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({ tableNumber, mode, onClose }) => {
  const { tables, orders, waiters, theme, addOrder, updateOrder, transferTable, mergeTables, clearTable, stockItems } = useApp();
  const isDark = theme === 'dark';

  const table = useMemo(() => tableNumber ? tables.find(t => t.number === tableNumber) : null, [tableNumber, tables]);
  const isLivre = table ? table.status === 'livre' : false;
  const isReservada = table ? table.status === 'reservada' : false;

  const [customerName, setCustomerName] = useState('');
  const [adultCount, setAdultCount] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [selectedWaiterId, setSelectedWaiterId] = useState(waiters[0]?.id || 'w1');

  const initialOrder = useMemo(() => {
    if (mode === 'mesa' && table?.activeOrderId) {
      return orders.find(o => o.id === table.activeOrderId) || null;
    }
    return null;
  }, [table?.activeOrderId, orders, mode]);

  const [activeOrder, setActiveOrder] = useState<Order | null>(initialOrder);
  const [isOpening, setIsOpening] = useState(isLivre && mode === 'mesa');
  const [isCreating, setIsCreating] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(true); // Default to true on desktop
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todos');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [operationFeedback, setOperationFeedback] = useState<OperationFeedbackMessage | null>(null);
  const activeOrderHasConsumption = Boolean(
    activeOrder &&
    (activeOrder.items.length > 0 || activeOrder.subtotal > 0 || activeOrder.total > 0),
  );

  const triggerFeedback = () => {
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2500);
  };

  useEffect(() => {
    if (initialOrder) {
      setActiveOrder(initialOrder);
      setAdultCount(prev => initialOrder.adultCount ?? prev);
      setChildrenCount(prev => initialOrder.childrenCount ?? prev);
      setCustomerName(prev => initialOrder.customerName ?? prev);
      setIsOpening(false);
    }
  }, [initialOrder]);

  useEffect(() => {
    if (operationFeedback?.title !== 'Mesa atualizada por outro dispositivo') return;

    const closeTimer = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(closeTimer);
  }, [operationFeedback?.title, onClose]);

  const handleOpenTable = async () => {
    setIsCreating(true);
    const newOrder: Order = {
      id: Date.now().toString(),
      mode: 'mesa',
      tableNumber: tableNumber!,
      customerName,
      customerCount: adultCount + childrenCount,
      adultCount,
      childrenCount,
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      total: 0,
      payments: [],
      status: 'open',
      waiterId: selectedWaiterId,
      timestamp: new Date().toISOString(),
    };
    try {
      if (isSupabaseConfigured && mode === 'mesa' && tableNumber) {
        const { listTables } = await import('../services/tablesSupabaseService');
        const freshTables = await listTables(import.meta.env.VITE_GASTRO_TENANT_ID as string || 'default-empresa');
        const currentTable = freshTables.find(t => t.number === tableNumber);
        if (currentTable && currentTable.activeOrderId) {
          setOperationFeedback({
            tone: 'warning',
            title: 'Mesa atualizada por outro dispositivo',
            description: 'Outra comanda foi aberta nesta mesa. Esta janela será fechada para carregar os dados atuais.',
          });
          return;
        }
      }

      const created = await addOrder(newOrder);
      setActiveOrder(created);
      setIsOpening(false);
    } catch (err) {
      console.error('Erro ao abrir mesa', err);
      // Fallback
      setActiveOrder(newOrder);
      setIsOpening(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateCounts = (newAdults: number, newChildren: number) => {
    if (!activeOrder) return;
    const updated = { ...activeOrder, adultCount: newAdults, childrenCount: newChildren, customerCount: newAdults + newChildren };
    setActiveOrder(updated);
    if (mode === 'mesa') {
      updateOrder(updated);
      triggerFeedback();
    }
  };

  const handleReleaseEmptyTable = () => {
    if (!tableNumber || activeOrderHasConsumption) return;
    clearTable(tableNumber);
    setActiveOrder(null);
    onClose();
  };

  const addItemToOrder = (product: Product) => {
    if (!activeOrder) return;
    const existingItem = activeOrder.items.find(i => i.product.id === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;

    const validation = validateStock(product, stockItems, currentQty, 1);
    if (!validation.available) {
      setOperationFeedback({
        tone: 'warning',
        title: 'Estoque insuficiente',
        description: `${product.name} não possui saldo suficiente para adicionar outra unidade. Revise o estoque ou escolha outro item.`,
      });
      return;
    }

    const existingIdx = activeOrder.items.findIndex(i => i.product.id === product.id);
    let updatedItems = [...activeOrder.items];
    if (existingIdx !== -1) {
      updatedItems[existingIdx] = { ...updatedItems[existingIdx], quantity: updatedItems[existingIdx].quantity + 1 };
    } else {
      updatedItems.push({ id: Date.now().toString() + Math.random(), product, quantity: 1, price: product.price });
    }
    const subtotal = updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const updated = { ...activeOrder, items: updatedItems, subtotal, total: subtotal };
    setActiveOrder(updated);
    setOperationFeedback(null);
    if (mode === 'mesa') {
      updateOrder(updated);
      triggerFeedback();
    }
  };

  const changeItemQty = (itemId: string, delta: number) => {
    if (!activeOrder) return;
    const updatedItems = activeOrder.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0);
    const subtotal = updatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const updated = { ...activeOrder, items: updatedItems, subtotal, total: subtotal };
    setActiveOrder(updated);
    if (mode === 'mesa') {
      updateOrder(updated);
      triggerFeedback();
    }
  };

  const categories = ['Todos', 'Drinks', 'Petiscos', 'Pratos', 'Sobremesas'];
  const diffMin = activeOrder ? Math.floor((new Date().getTime() - new Date(activeOrder.timestamp).getTime()) / 60000) : 0;
  const timeStr = diffMin > 60 ? `${Math.floor(diffMin/60)}h ${diffMin%60}m` : `${diffMin}m`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <OperationFeedback
        feedback={operationFeedback}
        onDismiss={() => {
          const shouldClose = operationFeedback?.title === 'Mesa atualizada por outro dispositivo';
          setOperationFeedback(null);
          if (shouldClose) onClose();
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[1400px] h-full max-h-[900px] flex gap-6 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {(() => {
          // --- RESERVATION & OPENING VIEWS (Keep them centered/compact) ---
          if (isReservada || isOpening || isManaging || (!activeOrder && !isLivre)) {
             return (
               <div className="w-full h-full flex items-center justify-center">
                 {isReservada ? (
                    <div className={`w-full max-w-sm rounded-xl border flex flex-col overflow-hidden shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                      <div className={`p-8 flex justify-between items-center border-b ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}>
                        <h3 className="font-bold uppercase tracking-tight text-lg text-slate-500">Mesa Reservada</h3>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5"><X className="w-5 h-5 opacity-40" /></button>
                      </div>
                      <div className="p-10 space-y-8 text-center">
                        <div className="w-24 h-24 bg-slate-500/10 text-slate-500 rounded-lg flex items-center justify-center mx-auto shadow-sm shadow-slate-500/5"><CalendarCheck className="w-12 h-12" /></div>
                        <div className="space-y-1"><h4 className="text-4xl font-bold uppercase tracking-tighter">Mesa {tableNumber}</h4><p className="text-xs font-bold opacity-40 uppercase tracking-wide">{table?.reservationReason || 'Reserva Especial'}</p></div>
                        <div className="pt-6 space-y-4">
                          <button onClick={() => { clearTable(tableNumber!); setIsOpening(true); }} className="w-full py-6 bg-slate-500 text-white rounded-lg font-bold uppercase tracking-wide text-[11px] shadow-sm flex items-center justify-center gap-3 transition-all"><PlayCircle className="w-6 h-6" /> Iniciar Atendimento</button>
                          <button onClick={() => { clearTable(tableNumber!); onClose(); }} className={`w-full py-4 rounded-lg font-bold uppercase tracking-wide text-[9px] opacity-40 hover:opacity-100 hover:text-red-500 transition-all`}>Remover Reserva</button>
                        </div>
                      </div>
                    </div>
                  ) : isOpening ? (
                    <div className={`w-full max-w-md rounded-xl border flex flex-col overflow-hidden shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                      <div className={`p-8 flex justify-between items-center border-b ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}>
                         <div><h3 className="font-bold text-2xl">Mesa {tableNumber?.toString().padStart(2, '0')}</h3><p className="text-xs font-semibold opacity-40">Configuração de Abertura</p></div>
                         <button onClick={onClose} className="p-3 rounded-lg hover:bg-black/5 transition-colors"><X className="w-6 h-6 opacity-40" /></button>
                      </div>
                      <div className="p-10 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><label className="text-xs font-bold opacity-40 ml-4">Atendente</label><select value={selectedWaiterId} onChange={e => setSelectedWaiterId(e.target.value)} className={`w-full p-4 rounded-lg border outline-none font-semibold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white focus:border-[#475569]' : 'bg-white border-gray-200 focus:border-[#475569]'}`}>{waiters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                          <div className="space-y-2"><label className="text-xs font-bold opacity-40 ml-4">Identificação</label><input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome (opcional)" className={`w-full p-4 rounded-lg border outline-none font-semibold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white focus:border-[#475569]' : 'bg-white border-gray-200 focus:border-[#475569]'}`} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <CountInput label="Adultos" value={adultCount} onChange={setAdultCount} isDark={isDark} min={1} />
                          <CountInput label="Crianças" value={childrenCount} onChange={setChildrenCount} isDark={isDark} min={0} />
                        </div>
                        <button onClick={handleOpenTable} disabled={isCreating} className="w-full mt-6 py-5 bg-[#475569] rounded-lg text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                          {isCreating ? <><Loader2 className="w-5 h-5 animate-spin" /> Criando Mesa...</> : 'Abrir Mesa'}
                        </button>
                      </div>
                    </div>
                  ) : isManaging ? (
                    <div className={`w-full max-w-lg rounded-xl border flex flex-col overflow-hidden shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                      <div className={`p-8 flex justify-between items-center border-b ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}>
                         <div><h3 className="font-bold text-2xl">Gestão Operacional</h3><p className="text-xs font-semibold opacity-40">Mesa {tableNumber}</p></div>
                         <button onClick={() => setIsManaging(false)} className="p-3 rounded-lg hover:bg-black/5 transition-colors"><X className="w-6 h-6 opacity-40" /></button>
                      </div>
                      <div className="p-10 space-y-10 overflow-y-auto max-h-[75vh] custom-scrollbar">
                        <div><h4 className="text-xs font-bold uppercase tracking-wider mb-6 opacity-40 flex items-center gap-3"><Users className="w-5 h-5" /> Pessoas na Mesa</h4><div className="grid grid-cols-2 gap-6"><CountInput label="Adultos" value={adultCount} onChange={(v:number) => { setAdultCount(v); handleUpdateCounts(v, childrenCount); }} isDark={isDark} min={1} /><CountInput label="Crianças" value={childrenCount} onChange={(v:number) => { setChildrenCount(v); handleUpdateCounts(adultCount, v); }} isDark={isDark} min={0} /></div></div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-3 text-[#475569]"><MoveRight className="w-5 h-5" /> Transferir Mesa</h4>
                          <div className="grid grid-cols-6 gap-3">
                            {tables.filter(t => t.status === 'livre' && t.number !== tableNumber).map(t => (<button key={t.number} onClick={() => { transferTable(tableNumber!, t.number); onClose(); }} className={`aspect-square rounded-lg border flex items-center justify-center text-sm font-bold transition-all hover:bg-[#475569] hover:text-white hover:border-[#475569] ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}>{t.number}</button>))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`w-full max-w-sm rounded-xl border p-12 flex flex-col items-center text-center space-y-6 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center"><AlertTriangle className="w-10 h-10" /></div>
                      <div className="space-y-2"><h3 className="text-xl font-bold">Erro de Sincronia</h3><p className="text-sm font-medium opacity-40 leading-relaxed px-4">Esta mesa está sem comanda ativa no sistema.</p></div>
                      <div className="w-full pt-4 space-y-3"><button onClick={() => { clearTable(tableNumber!); setIsOpening(true); }} className="w-full py-5 bg-amber-500 text-white rounded-lg font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"><RefreshCw className="w-4 h-4" /> Resetar Mesa</button><button onClick={onClose} className="w-full py-4 rounded-lg font-bold text-xs opacity-40 hover:opacity-100 transition-opacity">Voltar</button></div>
                    </div>
                  )}
               </div>
             );
          }

          // --- SPLIT DESKTOP VIEW ---
          if (activeOrder) {
            return (
              <div className="flex w-full gap-6 h-full items-stretch">
                {/* Product Selection (Left Side - Larger) */}
                <div className={`flex-1 rounded-xl border flex flex-col overflow-hidden shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                  <div className="p-8 border-b space-y-6">
                    <div className="flex justify-between items-center">
                       <h4 className="text-sm font-bold uppercase tracking-wider opacity-40">Cardápio Digital</h4>
                       <div className="flex gap-2"><button className="p-2.5 rounded-xl bg-current/5"><LayoutGrid className="w-4 h-4" /></button><button className="p-2.5 opacity-20"><List className="w-4 h-4" /></button></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className={`flex items-center px-5 py-3 rounded-lg border flex-1 transition-all focus-within:ring-4 focus-within:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus-within:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus-within:border-slate-300'}`}>
                        <Search className="w-5 h-5 mr-4 opacity-40" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar por nome ou categoria..." className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:opacity-20" />
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {categories.map(cat => (
                          <button key={cat} onClick={() => setCategory(cat)} className={`shrink-0 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all ${category === cat ? 'bg-[#475569] border-[#475569] text-white shadow-sm' : 'border-current/10 opacity-60 hover:opacity-100'}`}>{cat}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <MenuList category={category} searchTerm={searchTerm} onSelect={addItemToOrder} />
                  </div>
                </div>

                {/* Active Order (Right Side - Sidebar style but taller) */}
                <div className={`w-[500px] rounded-xl border flex flex-col overflow-hidden shadow-sm relative z-10 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                  {/* Order Header */}
                  <div className={`p-8 border-b space-y-5 ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0 space-y-4">
                        <h3 className="font-bold uppercase tracking-tighter text-3xl leading-none">Mesa {tableNumber?.toString().padStart(2, '0')}</h3>
                        {mode === 'mesa' && (
                          <div className={`w-fit max-w-full flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${showFeedback ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                            {showFeedback ? (
                              <><CheckCircle className="w-3.5 h-3.5" /> Item adicionado</>
                            ) : (
                              <><RefreshCw className="w-3.5 h-3.5" /> {isSupabaseConfigured ? 'Sincronizado na Nuvem' : 'Salvo Localmente'}</>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => setIsManaging(true)} className={`w-14 h-14 rounded-lg border flex items-center justify-center transition-all ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 shadow-sm'}`}><Settings className="w-5 h-5 opacity-60" /></button>
                        <button onClick={onClose} className={`w-14 h-14 rounded-lg border flex items-center justify-center transition-all ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 shadow-sm'}`}><X className="w-5 h-5 opacity-60" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-bold bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-wide"><Clock className="w-3 h-3" /> {timeStr}</span>
                      <span className="flex items-center gap-1.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wide"><User className="w-3 h-3" /> {activeOrder.adultCount} ADT</span>
                      {activeOrder.childrenCount! > 0 && <span className="flex items-center gap-1.5 text-[9px] font-bold bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-wide"><Baby className="w-3 h-3" /> {activeOrder.childrenCount} CRI</span>}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="flex-1 overflow-y-auto p-7 space-y-5 custom-scrollbar">
                    <AnimatePresence initial={false}>
                      {activeOrder.items.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center opacity-10 py-20 text-center space-y-4">
                          <ShoppingBag className="w-20 h-20" />
                          <p className="text-[12px] font-bold uppercase tracking-wide">Comanda Vazia</p>
                        </motion.div>
                      ) : activeOrder.items.map(item => (
                        <motion.div layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} key={item.id} className={`flex items-center gap-5 p-5 rounded-lg group transition-all ${isDark ? 'bg-[#121214] hover:bg-[#121214]/80' : 'bg-gray-50/50 hover:bg-gray-50 border border-gray-100/50'}`}>
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>{item.product.category === 'Drinks' ? '🍸' : item.product.category === 'Petiscos' ? '🍟' : '🍽️'}</div>
                          <div className="flex-1 min-w-0 pr-2"><p className="text-sm font-bold uppercase truncate group-hover:text-[#475569] transition-colors">{item.product.name}</p><p className="text-[10px] font-bold opacity-40">R$ {item.price.toFixed(2)}</p></div>
                          <div className="flex shrink-0 items-center gap-4">
                            <button onClick={() => changeItemQty(item.id, -1)} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${item.quantity === 1 ? 'text-red-500 border-red-500/20' : 'border-current/10'}`}>{item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}</button>
                            <span className="w-5 text-center font-bold text-base tracking-tighter">{item.quantity}</span>
                            <button onClick={() => addItemToOrder(item.product)} className="w-10 h-10 rounded-xl flex items-center justify-center border border-current/10 hover:border-[#475569] hover:text-[#475569] transition-all"><Plus className="w-4 h-4" /></button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Order Footer */}
                  <div className={`p-7 border-t space-y-6 ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}>
                    {mode === 'mesa' && (
                      <p className="text-xs text-center font-semibold opacity-50">Você pode fechar esta janela após lançar os itens. A comanda continuará aberta na mesa.</p>
                    )}
                    <div className="flex flex-col gap-5">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Total da Mesa</p>
                        <div className="flex items-baseline gap-1.5"><span className="text-xl font-bold text-[#475569] opacity-50">R$</span><span className="text-4xl font-bold text-[#475569] tracking-tighter">{activeOrder.total.toFixed(2)}</span></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button onClick={onClose} className={`min-h-[64px] px-4 py-4 rounded-lg font-bold uppercase tracking-wide text-[11px] border transition-all ${isDark ? 'bg-transparent border-white/10 text-white hover:bg-white/5' : 'bg-transparent border-[#475569]/20 text-[#475569] hover:bg-[#475569]/5'}`}>Concluir Lançamento</button>
                        <button disabled={activeOrder.items.length === 0} onClick={() => setCheckoutOpen(true)} className="min-h-[64px] px-4 py-4 bg-[#475569] text-white rounded-lg font-bold uppercase tracking-wide text-[11px] shadow-sm disabled:opacity-30 disabled:scale-100 disabled:shadow-none transition-all">Pagar Conta</button>
                      </div>
                      {!activeOrderHasConsumption && mode === 'mesa' && (
                        <button
                          type="button"
                          onClick={handleReleaseEmptyTable}
                          className="w-full min-h-[52px] px-4 py-3 rounded-lg border border-emerald-500/30 text-emerald-500 font-bold uppercase tracking-wide text-[11px] hover:bg-emerald-500/10 transition-all"
                        >
                          Liberar mesa sem consumo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })()}

        {checkoutOpen && activeOrder && <CheckoutModal order={activeOrder} onClose={() => setCheckoutOpen(false)} onSuccess={() => { setCheckoutOpen(false); onClose(); }} />}
      </motion.div>
    </div>
  );
};

const CountInput = ({ label, value, onChange, isDark, min }: any) => (
  <div className={`p-6 rounded-lg border transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}><p className="text-[10px] uppercase font-bold mb-5 opacity-40 text-center tracking-wide">{label}</p><div className="flex items-center justify-between px-2"><button onClick={() => onChange(Math.max(min, value - 1))} className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl transition-all ${value === min ? 'opacity-10' : 'bg-current/5 hover:bg-current/10'}`}>-</button><span className="text-2xl font-bold tracking-tighter">{value}</span><button onClick={() => onChange(value + 1)} className="w-12 h-12 rounded-lg bg-current/5 hover:bg-current/10 flex items-center justify-center font-bold text-xl transition-all">+</button></div></div>
);
