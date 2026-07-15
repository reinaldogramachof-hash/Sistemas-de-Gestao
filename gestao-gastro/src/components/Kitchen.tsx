import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { ChefHat, Timer, Check, Play, Clock, ArrowRight, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, OrderItem } from '../types';
import { ui } from '../ui/styles';
import { HelpTooltip } from './HelpTooltip';

export const Kitchen: React.FC = () => {
  const { orders, settings, theme, updateOrderItemKitchenStatus } = useApp();
  const isDark = theme === 'dark';

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const openOrders = orders.filter(o => o.status === 'open');

  const isInteractive = settings.kitchenMode === 'interactive';

  const getElapsedTime = (timestamp: string) => {
    const minutes = Math.floor((currentTime - new Date(timestamp).getTime()) / 60000);
    return minutes;
  };

  const getStatusColor = (status: string) => {
    if (status === 'aguardando') return isDark ? 'text-amber-500' : 'text-amber-600';
    if (status === 'preparo') return isDark ? 'text-blue-500' : 'text-blue-600';
    if (status === 'pronto') return isDark ? 'text-emerald-500' : 'text-emerald-600';
    return '';
  };

  const handleNextStatus = (orderId: string, itemIdx: number, currentStatus: string) => {
    if (!isInteractive) return;
    if (currentStatus === 'aguardando') {
      updateOrderItemKitchenStatus(orderId, itemIdx, 'preparo');
    } else if (currentStatus === 'preparo') {
      updateOrderItemKitchenStatus(orderId, itemIdx, 'pronto');
    }
  };

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in zoom-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className={ui.pageTitle}>Kitchen Display System</h2>
            <HelpTooltip moduleKey="kitchen" />
          </div>
          <p className={ui.pageSubtitle}>
            {isInteractive ? 'Modo Interativo (Gestao de Fila)' : 'Modo Visualizacao (Apenas Leitura)'}
          </p>
        </div>
        <div className={`p-4 flex items-center gap-3 ${ui.panel(isDark)}`}>
           <ChefHat className="w-6 h-6 text-accent" />
           <div className="flex flex-col">
             <span className="text-[10px] font-bold uppercase tracking-wide opacity-40">Pedidos Abertos</span>
             <span className="text-lg font-bold tracking-tighter leading-none">{openOrders.length}</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div className="flex gap-6 h-full pb-4">
          <AnimatePresence>
            {openOrders.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col items-center justify-center opacity-30">
                 <ChefHat className="w-16 h-16 mb-4" />
                 <p className="text-sm font-bold uppercase tracking-wide">Nenhum pedido na fila</p>
              </motion.div>
            ) : (
              openOrders.map(order => {
                const elapsed = getElapsedTime(order.timestamp);
                const isLate = elapsed > 20;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`w-80 shrink-0 flex flex-col overflow-hidden ${ui.panel(isDark)} ${isLate ? 'border-red-500/30' : ''}`}
                  >
                    <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-[#252527] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'} ${isLate ? 'bg-red-500/5' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-accent text-white rounded-control text-xs font-bold uppercase tracking-wide">
                          {order.mode === 'mesa' ? `Mesa ${order.tableNumber}` : 'Balcao'}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${isLate ? 'text-red-500' : 'opacity-40'}`}>
                        <Timer className="w-3.5 h-3.5" />
                        {elapsed} min
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {order.items.map((item, idx) => {
                        const status = item.kitchenStatus || 'aguardando';
                        const isDone = status === 'pronto';

                        return (
                          <div key={`${item.id}-${idx}`} className={`p-3 transition-all ${ui.panelMuted(isDark)} ${isDone ? 'opacity-40 grayscale' : ''}`}>
                             <div className="flex justify-between items-start mb-2">
                               <div>
                                 <p className="text-xs font-bold uppercase tracking-wide leading-tight mb-1">{item.quantity}x {item.product.name}</p>
                                 {item.observation && (
                                   <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide bg-red-500/10 px-2 py-1 rounded inline-block">
                                     Obs: {item.observation}
                                   </p>
                                 )}
                               </div>
                             </div>

                             <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-current/10">
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${getStatusColor(status)}`}>
                                  {status}
                                </span>

                                {isInteractive && !isDone && (
                                  <button
                                    onClick={() => handleNextStatus(order.id, idx, status)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                      status === 'aguardando'
                                        ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white'
                                        : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                    }`}
                                  >
                                    {status === 'aguardando' ? <Play className="w-4 h-4 ml-0.5" /> : <Check className="w-4 h-4" />}
                                  </button>
                                )}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
