import React from 'react';
import { useApp } from '../store/AppContext';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  Table as TableIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ui } from '../ui/styles';
import { getComandaAccessUrl } from '../utils/comandaAccess';
import { HelpTooltip } from './HelpTooltip';
import { formatCurrency } from '../utils/format';

export const Dashboard: React.FC = () => {
  const { orders, tables, products, stockItems, theme, currentEmpresa } = useApp();
  const isDark = theme === 'dark';

  const closedOrders = orders.filter(o => o.status === 'closed');
  const salesToday = closedOrders.reduce((acc, o) => acc + o.total, 0);
  const totalOrders = closedOrders.length;
  const avgTicket = totalOrders > 0 ? salesToday / totalOrders : 0;
  const occupiedTables = tables.filter(t => t.status !== 'livre').length;

  const categorySales = closedOrders.flatMap(o => o.items).reduce<Record<string, number>>((acc, item) => {
    acc[item.product.category] = (acc[item.product.category] || 0) + (item.price * item.quantity);
    return acc;
  }, {});

  const recentOrders = [...orders].reverse().slice(0, 6);

  // Top Selling Products logic
  const productSales = closedOrders.flatMap(o => o.items).reduce((acc, item) => {
    if (!acc[item.product.id]) {
      acc[item.product.id] = { name: item.product.name, qty: 0, category: item.product.category };
    }
    acc[item.product.id].qty += item.quantity;
    return acc;
  }, {} as Record<string, { name: string, qty: number, category: string }>);

  const topProducts = (Object.values(productSales) as { name: string, qty: number, category: string }[])
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Stock Alerts logic
  const lowStockItems = stockItems.filter(i => i.currentStock <= i.minStock);

  const expiringItems = stockItems.filter(i => {
    if (!i.expiryDate) return false;
    const expiry = new Date(i.expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

  const getCategoryCode = (cat: string) => {
    switch (cat) {
      case 'Drinks': return 'DR';
      case 'Petiscos': return 'PT';
      case 'Pratos': return 'PR';
      case 'Sobremesas': return 'SB';
      default: return 'IT';
    }
  };

  const comparisonLabel = totalOrders > 1 ? 'Em comparação ao período anterior' : 'Sem comparação';
  const kpis = [
    { label: 'Vendas Hoje', value: formatCurrency(salesToday), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: comparisonLabel },
    { label: 'Ticket Médio', value: formatCurrency(avgTicket), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: comparisonLabel },
    { label: 'Pedidos', value: totalOrders.toString(), icon: Clock, color: 'text-accent', bg: 'bg-accent/10', trend: comparisonLabel },
    { label: 'Mesas Ocupadas', value: occupiedTables.toString(), icon: TableIcon, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: `${occupiedTables}/${tables.length}` },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className={ui.pageTitle}>Visão Geral</h1>
            <HelpTooltip moduleKey="dashboard" />
          </div>
          <p className={ui.pageSubtitle}>{currentEmpresa.name}</p>
        </div>
        <div className="flex items-center gap-3">
           <span className={`px-4 py-2 ${ui.panelMuted(isDark)} ${ui.eyebrow}`}>
             {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
           </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {kpis.map((kpi, i) => (
           <motion.div
             key={i}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className={`p-6 transition-all hover:border-accent/20 ${ui.panel(isDark)}`}
           >
             <div className="flex justify-between items-start gap-3 mb-4">
               <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                 <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
               </div>
               <span className={`max-w-[10rem] text-right text-[9px] font-bold px-2 py-1 rounded-lg ${
                 kpi.trend.includes('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
               }`}>
                 {kpi.trend}
               </span>
             </div>
             <div>
               <h3 className={`${ui.eyebrow} mb-1`}>{kpi.label}</h3>
               <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
             </div>
           </motion.div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Sales by Category */}
         <div className={`p-8 ${ui.panel(isDark)}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-sm uppercase tracking-wide">Vendas / Categoria</h3>
              <div className="w-8 h-8 rounded-panel bg-accent/10 text-accent flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <div className="space-y-6">
              {(Object.entries(categorySales) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([cat, val], i) => {
                 const pct = salesToday > 0 ? (val / salesToday) * 100 : 0;
                 return (
                   <div key={i} className="group">
                     <div className="flex justify-between text-xs mb-2">
                       <span className={`font-bold uppercase tracking-tight transition-colors ${isDark ? 'text-muted group-hover:text-white' : 'text-muted-light group-hover:text-black'}`}>{cat}</span>
                       <span className="font-bold">{formatCurrency(val)}</span>
                     </div>
                     <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-[#252527]' : 'bg-gray-50'}`}>
                       <motion.div
                         initial={{ width: 0 }}
                         animate={{ width: `${pct}%` }}
                         transition={{ duration: 1, ease: "easeOut" }}
                         className="h-full bg-slate-500"
                       ></motion.div>
                     </div>
                   </div>
                 )
              })}
              {Object.keys(categorySales).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 opacity-50">
                  <ShoppingBag className="w-12 h-12 mb-3" />
                  <p className="text-sm">Sem dados de vendas hoje</p>
                </div>
              )}
            </div>
         </div>

         {/* Recent Orders */}
         <div className={`p-8 lg:col-span-2 ${ui.panel(isDark)}`}>
             <div className="flex items-center justify-between mb-8">
               <h3 className="font-bold text-sm uppercase tracking-wide">Últimos Pedidos</h3>
               <div className="flex gap-2">
                 <button className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}>Exportar</button>
               </div>
             </div>
             <div className="overflow-x-auto -mx-2">
               <table className="w-full text-xs text-left border-separate border-spacing-y-2">
                 <thead>
                   <tr className={`text-[9px] uppercase tracking-wide ${isDark ? 'text-[#636366]' : 'text-gray-400'}`}>
                     <th className="px-4 py-2">ID</th>
                     <th className="px-4 py-2">Hora</th>
                     <th className="px-4 py-2">Modo</th>
                     <th className="px-4 py-2">Status</th>
                     <th className="px-4 py-2 text-right">Valor</th>
                   </tr>
                 </thead>
                 <tbody>
                   {recentOrders.map(o => (
                     <tr key={o.id} className={`group transition-all hover:translate-x-1 ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                       <td className="px-4 py-4 first:rounded-l-2xl border-y border-transparent">
                         <span className="font-bold opacity-30 text-[10px]">#{o.id.slice(-6)}</span>
                       </td>
                       <td className="px-4 py-4 border-y border-transparent font-bold uppercase tracking-tighter">
                         {new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </td>
                       <td className="px-4 py-4 border-y border-transparent">
                         <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide ${
                           o.mode === 'mesa' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'
                         }`}>
                           {o.mode}
                         </span>
                       </td>
                       <td className="px-4 py-4 border-y border-transparent">
                         <span className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                           <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Concluído</span>
                         </span>
                       </td>
                       <td className="px-4 py-4 last:rounded-r-2xl border-y border-transparent text-right font-bold text-sm">
                         {formatCurrency(o.total)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Most Sold Products */}
        <div className={`p-8 ${ui.panel(isDark)}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-sm uppercase tracking-wide">Mais Pedidos</h3>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-bold">TOP</div>
          </div>
          <div className="space-y-4">
            {topProducts.map((p, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                    {getCategoryCode(p.category)}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-tight">{p.name}</p>
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">{p.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-accent">{p.qty}</p>
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Vendas</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="py-12 text-center opacity-20  text-sm">Nenhum dado de vendas ainda.</div>
            )}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className={`p-8 ${ui.panel(isDark)}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-sm uppercase tracking-wide">Alertas de Estoque</h3>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="space-y-4">
            {lowStockItems.slice(0, 5).map((item, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'} border-l-4 border-red-500`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                    {getCategoryCode(item.category)}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-tight">{item.name}</p>
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Estoque Crítico</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-500">{item.currentStock} {item.unit}</p>
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Min: {item.minStock}</p>
                </div>
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-30">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-wide">Tudo em dia!</p>
              </div>
            )}
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className={`p-8 ${ui.panel(isDark)}`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-sm uppercase tracking-wide">Validades Próximas</h3>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="space-y-4">
            {expiringItems.slice(0, 5).map((item, i) => {
              const expiry = new Date(item.expiryDate!);
              const now = new Date();
              const diffTime = expiry.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isExpired = diffDays < 0;

              return (
                <div key={i} className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'} border-l-4 ${isExpired ? 'border-rose-500' : 'border-amber-500'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                      {getCategoryCode(item.category)}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tight">{item.name}</p>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">{isExpired ? 'Vencido' : 'Próximo do Venc.'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isExpired ? 'text-rose-500' : 'text-amber-500'}`}>{expiry.toLocaleDateString('pt-BR')}</p>
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">{isExpired ? 'Descartar' : (diffDays === 0 ? 'Hoje' : `em ${diffDays} dias`)}</p>
                  </div>
                </div>
              );
            })}
            {expiringItems.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-30">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-wide">Tudo na validade!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
