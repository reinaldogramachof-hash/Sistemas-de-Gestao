import React from 'react';
import { useApp } from '../store/AppContext';
import {
  TrendingUp,
  ShoppingBag,
  Table as TableIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ChevronRight,
  PackageSearch,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ui } from '../ui/styles';
import { getComandaAccessUrl } from '../utils/comandaAccess';
import { HelpTooltip } from './HelpTooltip';
import { formatCurrency } from '../utils/format';
import { OperationalState } from './OperationalState';
import type { View } from '../hooks/useNavigation';
import { useModules } from '../hooks/useModules';

interface DashboardProps {
  onNavigate: (view: View) => void;
}

type DecisionTone = 'critical' | 'attention' | 'info';

interface DecisionItem {
  id: string;
  title: string;
  description: string;
  action: string;
  target: View;
  tone: DecisionTone;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { orders, tables, products, stockItems, cashierSession, productSyncErrors, theme, currentEmpresa, supabaseOnline } = useApp();
  const { checkAccess } = useModules();
  const isDark = theme === 'dark';

  const isToday = (timestampStr: string) => {
    const orderDate = new Date(timestampStr);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  };

  const closedOrders = orders.filter(o => o.status === 'closed');
  const openOrders = orders.filter(o => o.status !== 'closed');
  const closedOrdersToday = closedOrders.filter(o => isToday(o.timestamp));
  const salesToday = closedOrdersToday.reduce((acc, o) => acc + o.total, 0);
  const totalOrdersToday = closedOrdersToday.length;
  const avgTicket = totalOrdersToday > 0 ? salesToday / totalOrdersToday : 0;
  const occupiedTables = tables.filter(t => t.status !== 'livre').length;

  const categorySales = closedOrdersToday.flatMap(o => o.items).reduce<Record<string, number>>((acc, item) => {
    acc[item.product.category] = (acc[item.product.category] || 0) + (item.price * item.quantity);
    return acc;
  }, {});

  const recentOrders = [...orders].reverse().slice(0, 6);

  // Top Selling Products logic
  const productSales = closedOrdersToday.flatMap(o => o.items).reduce((acc, item) => {
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

  const expiredItemsCount = expiringItems.filter(item => new Date(`${item.expiryDate}T23:59:59`).getTime() < Date.now()).length;
  const productsWithIncompleteRecipe = products.filter(product => {
    if (product.active === false) return false;
    if (!product.recipe || product.recipe.length === 0) return true;
    return product.recipe.some(recipeItem => !stockItems.some(stockItem => stockItem.id === recipeItem.stockItemId));
  });
  const syncPendingCount = Object.keys(productSyncErrors).length;
  const isCashierOpen = cashierSession?.status === 'open';

  const decisions: DecisionItem[] = [];
  if (!isCashierOpen) {
    decisions.push({
      id: 'cashier-closed',
      title: 'Caixa fechado',
      description: 'Abra o caixa antes de iniciar as vendas para manter o fechamento e as formas de pagamento rastreáveis.',
      action: 'Abrir caixa',
      target: 'caixa',
      tone: 'critical',
    });
  }
  if (expiredItemsCount > 0 && checkAccess('estoque')) {
    decisions.push({
      id: 'expired-stock',
      title: `${expiredItemsCount} ${expiredItemsCount === 1 ? 'insumo vencido' : 'insumos vencidos'}`,
      description: 'Revise os lotes e registre a perda antes de utilizar esses insumos em novas vendas.',
      action: 'Revisar estoque',
      target: 'estoque',
      tone: 'critical',
    });
  }
  if (lowStockItems.length > 0 && checkAccess('estoque')) {
    decisions.push({
      id: 'low-stock',
      title: `${lowStockItems.length} ${lowStockItems.length === 1 ? 'insumo no nível crítico' : 'insumos no nível crítico'}`,
      description: 'Confira os saldos mínimos e programe a reposição para evitar indisponibilidade no Cardápio.',
      action: 'Conferir saldos',
      target: 'estoque',
      tone: 'attention',
    });
  }
  if (openOrders.length > 0) {
    decisions.push({
      id: 'open-orders',
      title: `${openOrders.length} ${openOrders.length === 1 ? 'pedido em aberto' : 'pedidos em aberto'}`,
      description: 'Acompanhe as mesas e comandas pendentes antes do fechamento do caixa.',
      action: 'Ver mesas',
      target: 'mesas',
      tone: 'attention',
    });
  }
  if ((productsWithIncompleteRecipe.length > 0 || syncPendingCount > 0) && checkAccess('produtos')) {
    const menuIssues = productsWithIncompleteRecipe.length + syncPendingCount;
    decisions.push({
      id: 'menu-pending',
      title: `${menuIssues} ${menuIssues === 1 ? 'pendência no Cardápio' : 'pendências no Cardápio'}`,
      description: `${productsWithIncompleteRecipe.length} ficha(s) técnica(s) incompleta(s) e ${syncPendingCount} falha(s) de sincronização aguardam revisão.`,
      action: 'Revisar Cardápio',
      target: 'produtos',
      tone: 'info',
    });
  }

  const getCategoryCode = (cat: string) => {
    switch (cat) {
      case 'Drinks': return 'DR';
      case 'Petiscos': return 'PT';
      case 'Pratos': return 'PR';
      case 'Sobremesas': return 'SB';
      default: return 'IT';
    }
  };

  const comparisonLabelClosed = 'Baseado nos pedidos fechados hoje';
  const comparisonLabelRealtime = 'Atualizado em tempo real';
  const kpis = [
    { label: 'Vendas Hoje', value: formatCurrency(salesToday), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', trend: comparisonLabelClosed, definition: 'Soma do total final dos pedidos fechados hoje.', source: 'Pedidos fechados', target: 'relatorios' as View },
    { label: 'Ticket Médio', value: formatCurrency(avgTicket), icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: comparisonLabelClosed, definition: 'Vendas de hoje divididas pela quantidade de pedidos fechados.', source: 'Pedidos fechados', target: 'relatorios' as View },
    { label: 'Pedidos', value: totalOrdersToday.toString(), icon: Clock, color: 'text-accent', bg: 'bg-accent/10', trend: `${totalOrdersToday} fechados hoje · ${openOrders.length} ${openOrders.length === 1 ? 'aberto' : 'abertos'}`, definition: 'Pedidos concluídos hoje; abertos aparecem separadamente.', source: 'Pedidos e comandas', target: 'mesas' as View },
    { label: 'Mesas Ocupadas', value: occupiedTables.toString(), icon: TableIcon, color: 'text-amber-500', bg: 'bg-amber-500/10', trend: comparisonLabelRealtime, definition: 'Mesas ocupadas, aguardando ou reservadas neste momento.', source: 'Mapa de mesas', target: 'mesas' as View },
  ];

  const operationalOverview = [
    {
      label: 'Caixa',
      value: isCashierOpen ? 'Aberto' : 'Fechado',
      detail: isCashierOpen && cashierSession ? `Desde ${new Date(cashierSession.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Abertura necessária',
      icon: Wallet,
      target: 'caixa' as View,
      tone: isCashierOpen ? 'text-emerald-500' : 'text-red-500',
    },
    {
      label: 'Mesas',
      value: `${occupiedTables}/${tables.length}`,
      detail: `${openOrders.length} pedido(s) em aberto`,
      icon: TableIcon,
      target: 'mesas' as View,
      tone: openOrders.length > 0 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'Vendas',
      value: formatCurrency(salesToday),
      detail: `${totalOrdersToday} pedido(s) fechado(s) hoje`,
      icon: TrendingUp,
      target: 'relatorios' as View,
      tone: 'text-emerald-500',
    },
    {
      label: 'Estoque',
      value: `${lowStockItems.length + expiredItemsCount} alerta(s)`,
      detail: `${lowStockItems.length} crítico(s) · ${expiredItemsCount} vencido(s)`,
      icon: PackageSearch,
      target: 'estoque' as View,
      tone: lowStockItems.length + expiredItemsCount > 0 ? 'text-red-500' : 'text-emerald-500',
    },
  ].filter(item => checkAccess(item.target));

  const handleExportCSV = () => {
    if (recentOrders.length === 0) return;
    const headers = ['ID', 'Data/Hora', 'Modo', 'Status', 'Valor'];

    const escapeCSV = (val: string) => {
      const clean = val.replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = recentOrders.map(o => [
      escapeCSV(o.id),
      escapeCSV(new Date(o.timestamp).toLocaleString('pt-BR')),
      escapeCSV(o.mode),
      escapeCSV(o.status === 'closed' ? 'Concluído' : 'Aberto'),
      escapeCSV(o.total.toFixed(2))
    ]);

    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pedidos_dashboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {!supabaseOnline && (
        <OperationalState
          variant="offline"
          title="Dashboard em modo local"
          description="Os indicadores refletem apenas os dados disponíveis neste dispositivo até a conexão ser restabelecida."
          compact
        />
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h1 className={ui.pageTitle}>Dashboard</h1>
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

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6" aria-labelledby="dashboard-priorities-title">
        <div className={`xl:col-span-3 p-6 ${ui.panel(isDark)}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 id="dashboard-priorities-title" className="font-bold text-sm uppercase tracking-wide">Prioridades de agora</h2>
              <p className="mt-1 text-xs font-semibold opacity-50">Pendências ordenadas para orientar a próxima ação.</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${decisions.length > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {decisions.length > 0 ? `${decisions.length} ${decisions.length === 1 ? 'pendência' : 'pendências'}` : 'Operação em dia'}
            </span>
          </div>

          {decisions.length === 0 ? (
            <div className="flex items-center gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5 text-emerald-600" role="status">
              <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold">Nenhuma pendência operacional prioritária</p>
                <p className="mt-1 text-xs font-semibold opacity-75">Os módulos disponíveis para este perfil não apresentam alertas neste dispositivo.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map(decision => {
                const toneClasses = decision.tone === 'critical'
                  ? 'border-red-500/20 bg-red-500/5 text-red-600'
                  : decision.tone === 'attention'
                    ? 'border-amber-500/20 bg-amber-500/5 text-amber-600'
                    : 'border-blue-500/20 bg-blue-500/5 text-blue-600';
                return (
                  <div key={decision.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border p-4 ${toneClasses}`}>
                    <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold uppercase tracking-wide">{decision.title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{decision.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(decision.target)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-current/20 px-4 py-2 text-[9px] font-bold uppercase tracking-wide transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-current/30"
                    >
                      {decision.action}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`xl:col-span-2 p-6 ${ui.panel(isDark)}`}>
          <div className="mb-5">
            <h2 className="font-bold text-sm uppercase tracking-wide">Pulso da operação</h2>
            <p className="mt-1 text-xs font-semibold opacity-50">Acesso direto às quatro rotinas centrais.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {operationalOverview.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.target)}
                aria-label={`Abrir ${item.label}: ${item.value}`}
                className={`group min-h-28 rounded-lg border p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-accent/30 ${isDark ? 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <item.icon className={`h-5 w-5 ${item.tone}`} aria-hidden="true" />
                  <ChevronRight className="h-4 w-4 opacity-20 transition-transform group-hover:translate-x-0.5 group-hover:opacity-60" aria-hidden="true" />
                </div>
                <p className="mt-3 text-[9px] font-bold uppercase tracking-wide opacity-40">{item.label}</p>
                <p className={`mt-0.5 text-lg font-bold ${item.tone}`}>{item.value}</p>
                <p className="mt-1 text-[9px] font-semibold opacity-45">{item.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {kpis.map((kpi, i) => (
           <motion.button
             key={kpi.label}
             type="button"
             onClick={() => onNavigate(kpi.target)}
             aria-label={`Detalhar ${kpi.label}: ${kpi.value}`}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             className={`p-6 text-left transition-all hover:border-accent/20 focus:outline-none focus:ring-2 focus:ring-accent/30 ${ui.panel(isDark)}`}
           >
             <div className="flex justify-between items-start gap-3 mb-4">
               <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                 <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
               </div>
               <span className={`max-w-[15rem] text-right text-[9px] font-bold px-2 py-1 rounded-lg ${
                 kpi.trend.includes('fechados') || kpi.trend.includes('tempo real') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
               }`}>
                 {kpi.trend}
               </span>
             </div>
             <div>
               <h3 className={`${ui.eyebrow} mb-1`}>{kpi.label}</h3>
               <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
               <p className="mt-3 text-[10px] font-semibold leading-4 opacity-55">{kpi.definition}</p>
               <p className="mt-2 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide opacity-35">
                 Origem: {kpi.source}
                 <ChevronRight className="h-3 w-3" aria-hidden="true" />
               </p>
             </div>
           </motion.button>
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
                 <OperationalState
                   variant="empty"
                   title="Sem vendas por categoria hoje"
                   description="Feche o primeiro pedido para acompanhar as categorias mais vendidas."
                   compact
                 />
               )}
            </div>
         </div>

         {/* Recent Orders */}
         <div className={`p-8 lg:col-span-2 ${ui.panel(isDark)}`}>
             <div className="flex items-center justify-between mb-8">
               <h3 className="font-bold text-sm uppercase tracking-wide">Últimos Pedidos</h3>
               <div className="flex gap-2">
                 <button onClick={handleExportCSV} disabled={recentOrders.length === 0} className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-colors disabled:opacity-30 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}>Exportar CSV</button>
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
                           <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">{o.status === 'closed' ? 'Concluído' : 'Aberto'}</span>
                         </span>
                       </td>
                       <td className="px-4 py-4 last:rounded-r-2xl border-y border-transparent text-right font-bold text-sm">
                         {formatCurrency(o.total)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
                {recentOrders.length === 0 && (
                  <OperationalState
                    variant="empty"
                    title="Nenhum pedido registrado"
                    description="Os pedidos recentes aparecerão aqui após o primeiro atendimento."
                    compact
                  />
                )}
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
               <OperationalState
                 variant="empty"
                 title="Ranking ainda sem dados"
                 description="Os produtos mais pedidos aparecerão após as primeiras vendas do dia."
                 compact
               />
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
                <p className="text-xs font-bold uppercase tracking-wide">Nenhum item abaixo do mínimo.</p>
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
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">{isExpired ? 'Vencido' : diffDays === 0 ? 'Vence hoje' : `Vence em ${diffDays} dias`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isExpired ? 'text-rose-500' : 'text-amber-500'}`}>{expiry.toLocaleDateString('pt-BR')}</p>
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">{isExpired ? 'Vencido' : (diffDays === 0 ? 'Hoje' : `em ${diffDays} dias`)}</p>
                  </div>
                </div>
              );
            })}
            {expiringItems.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-30">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-wide">Nenhum item próximo do vencimento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
