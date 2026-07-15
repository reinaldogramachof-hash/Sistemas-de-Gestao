import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Download, TrendingUp, TrendingDown, Calendar, PieChart, Users, ShoppingBag, ArrowUpRight, DollarSign, Clock, FileText, ChevronRight, BarChart3, Target, Plus, Trash2, Receipt, CreditCard, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';
import { ui } from '../ui/styles';
import { formatCurrency } from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

type Tab = 'dashboard' | 'fluxo' | 'vendas' | 'produtos' | 'atendentes';
type Period = 'hoje' | 'semana' | 'mes' | 'total';

const EXPENSE_CATEGORIES = ['Insumos', 'Pessoal', 'Aluguel', 'Utilidades', 'Marketing', 'Impostos', 'Outros'] as const;

const downloadCSV = (filename: string, rows: string[][]) => {
  const bom = '﻿';
  const content = bom + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const Reports: React.FC = () => {
  const { orders, waiters, theme, expenses, addExpense, deleteExpense, stockItems, cashierHistory } = useApp();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [period, setPeriod] = useState<Period>('mes');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Outros',
    status: 'pago',
    amount: 0,
    description: '',
  });

  // Filter orders by period
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      const orderDate = new Date(o.timestamp);
      if (period === 'hoje') return orderDate.toDateString() === now.toDateString();
      if (period === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return orderDate >= weekAgo;
      }
      if (period === 'mes') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [orders, period]);

  // Filter expenses by period (only despesa sem entryType ou com entryType === 'saida')
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      if (e.entryType && e.entryType !== 'saida') return false;

      const expenseDate = new Date(e.timestamp);
      if (period === 'hoje') return expenseDate.toDateString() === now.toDateString();
      if (period === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return expenseDate >= weekAgo;
      }
      if (period === 'mes') {
        return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [expenses, period]);

  // Filter cashierHistory by period
  const filteredCashierHistory = useMemo(() => {
    const now = new Date();
    return cashierHistory.filter(s => {
      const sessionDate = new Date(s.openedAt);
      if (period === 'hoje') return sessionDate.toDateString() === now.toDateString();
      if (period === 'semana') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return sessionDate >= weekAgo;
      }
      if (period === 'mes') {
        return sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [cashierHistory, period]);

  const salesData = [...filteredOrders].reverse();
  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const totalService = filteredOrders.reduce((acc, o) => acc + o.serviceCharge, 0);
  const totalSalesAmount = totalRevenue + totalService;
  const totalExpensesAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const cmvTotal = filteredOrders.flatMap(o => o.items).reduce((acc, item) => {
    const productRecipe = item.product.recipe || [];
    const itemCost = productRecipe.reduce((recipeAcc, recipeItem) => {
      const stockItem = stockItems.find(si => si.id === recipeItem.stockItemId);
      return recipeAcc + (stockItem ? stockItem.costPrice * recipeItem.quantity : 0);
    }, 0);
    return acc + (item.quantity * itemCost);
  }, 0);

  const netProfit = totalSalesAmount - totalExpensesAmount - cmvTotal;

  // Stats for products
  const productStats = filteredOrders.flatMap(o => o.items).reduce<Record<string, { qty: number; revenue: number; category: string }>>((acc, item) => {
    const name = item.product.name;
    if (!acc[name]) acc[name] = { qty: 0, revenue: 0, category: item.product.category };
    acc[name].qty += item.quantity;
    acc[name].revenue += item.price * item.quantity;
    return acc;
  }, {});

  const productRanking = (Object.entries(productStats) as [string, { qty: number; revenue: number; category: string }][])
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([name, stats]) => ({ name, ...stats }));

  // Stats for categories (Sales)
  const categoryStats = (Object.values(productStats) as { qty: number; revenue: number; category: string }[]).reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.revenue;
    return acc;
  }, {});

  // Stats for expense categories
  const expenseCategoryStats = filteredExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  // Stats for waiters
  const waiterStats = waiters.map(w => {
    const wOrders = filteredOrders.filter(o => o.waiterId === w.id);
    const revenue = wOrders.reduce((acc, o) => acc + o.total, 0);
    const serviceCharge = wOrders.reduce((acc, o) => acc + o.serviceCharge, 0);
    return {
      id: w.id,
      name: w.name,
      ordersCount: wOrders.length,
      revenue,
      commission: serviceCharge,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const chartData = useMemo(() => {
    const now = new Date();

    if (period === 'hoje') {
      const labels: string[] = [];
      const sales: number[] = [];
      const expensesArr: number[] = [];

      for (let h = 8; h <= 23; h++) {
        labels.push(`${h}h`);

        const vSum = filteredOrders.reduce((acc, o) => {
          const od = new Date(o.timestamp);
          return od.getHours() === h ? acc + o.subtotal + o.serviceCharge : acc;
        }, 0);
        sales.push(vSum);

        const dSum = filteredExpenses.reduce((acc, e) => {
          const ed = new Date(e.timestamp);
          return ed.getHours() === h ? acc + e.amount : acc;
        }, 0);
        expensesArr.push(dSum);
      }
      return { labels, sales, expenses: expensesArr };
    }

    if (period === 'semana') {
      const labels: string[] = [];
      const sales: number[] = [];
      const expensesArr: number[] = [];
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayLabel = weekdays[d.getDay()];
        labels.push(`${dayLabel} (${d.getDate()}/${d.getMonth() + 1})`);

        const vSum = filteredOrders.reduce((acc, o) => {
          const od = new Date(o.timestamp);
          return od.toDateString() === d.toDateString() ? acc + o.subtotal + o.serviceCharge : acc;
        }, 0);
        sales.push(vSum);

        const dSum = filteredExpenses.reduce((acc, e) => {
          const ed = new Date(e.timestamp);
          return ed.toDateString() === d.toDateString() ? acc + e.amount : acc;
        }, 0);
        expensesArr.push(dSum);
      }
      return { labels, sales, expenses: expensesArr };
    }

    if (period === 'mes') {
      const labels: string[] = [];
      const sales: number[] = [];
      const expensesArr: number[] = [];

      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const step = 3;
      for (let start = 1; start <= daysInMonth; start += step) {
        const end = Math.min(start + step - 1, daysInMonth);
        const label = start === end ? `${start}` : `${start}-${end}`;
        labels.push(label);

        const vSum = filteredOrders.reduce((acc, o) => {
          const od = new Date(o.timestamp);
          if (od.getMonth() === month && od.getFullYear() === year) {
            const dateNum = od.getDate();
            if (dateNum >= start && dateNum <= end) {
              return acc + o.subtotal + o.serviceCharge;
            }
          }
          return acc;
        }, 0);
        sales.push(vSum);

        const dSum = filteredExpenses.reduce((acc, e) => {
          const ed = new Date(e.timestamp);
          if (ed.getMonth() === month && ed.getFullYear() === year) {
            const dateNum = ed.getDate();
            if (dateNum >= start && dateNum <= end) {
              return acc + e.amount;
            }
          }
          return acc;
        }, 0);
        expensesArr.push(dSum);
      }
      return { labels, sales, expenses: expensesArr };
    }

    const labels: string[] = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const sales: number[] = Array(12).fill(0);
    const expensesArr: number[] = Array(12).fill(0);

    filteredOrders.forEach(o => {
      const od = new Date(o.timestamp);
      if (od.getFullYear() === now.getFullYear()) {
        const m = od.getMonth();
        sales[m] += o.subtotal + o.serviceCharge;
      }
    });

    filteredExpenses.forEach(e => {
      const ed = new Date(e.timestamp);
      if (ed.getFullYear() === now.getFullYear()) {
        const m = ed.getMonth();
        expensesArr[m] += e.amount;
      }
    });

    return { labels, sales, expenses: expensesArr };
  }, [filteredOrders, filteredExpenses, period]);

  const hasChartData = useMemo(() => {
    return chartData.sales.some(s => s > 0) || chartData.expenses.some(e => e > 0);
  }, [chartData]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: Number(newExpense.amount),
      category: newExpense.category as any,
      status: newExpense.status as any,
      timestamp: new Date().toISOString(),
    };

    addExpense(expense);
    setIsExpenseModalOpen(false);
    setNewExpense({ category: 'Outros', status: 'pago', amount: 0, description: '' });
  };

  const handleExport = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    if (activeTab === 'vendas') {
      const header = ['Data/Hora', 'Pedido', 'Modo', 'Mesa', 'Forma de Pagamento', 'Total (R$)'];
      const rows = salesData.map(o => [
        new Date(o.timestamp).toLocaleString('pt-BR'),
        `#${o.id.slice(-6)}`,
        o.mode === 'mesa' ? 'Mesa' : 'Balcão',
        o.tableNumber?.toString() || '',
        o.payments.map(p => p.method).join(' + ') || '-',
        o.total.toFixed(2),
      ]);
      downloadCSV(`vendas_${period}_${dateStr}.csv`, [header, ...rows]);
    }
  };

  return (
    <div className="flex flex-col min-h-full gap-8 animate-in fade-in duration-200 pb-12">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="space-y-1">
          <h2 className={ui.pageTitle}>BI e Financeiro</h2>
          <p className={ui.pageSubtitle}>Gestão consolidada de fluxo e operação</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className={`${ui.tabShell(isDark)}`}>
            {(['hoje', 'semana', 'mes', 'total'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 ${ui.tab(period === p, isDark)}`}
              >
                {{ hoje: 'Hoje', semana: 'Semana', mes: 'Mês', total: 'Total' }[p]}
              </button>
            ))}
          </div>
          <button onClick={() => setIsExpenseModalOpen(true)} className={`px-6 py-3 ${ui.primaryButton} flex items-center gap-3`}>
             <Plus className="w-4 h-4" />
             <span className="text-[10px] font-bold uppercase tracking-wide">Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className={`${ui.tabShell(isDark)} w-fit flex-wrap`}>
        {(['dashboard', 'fluxo', 'vendas', 'produtos', 'atendentes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-6 py-3 ${ui.tab(activeTab === t, isDark)}`}
          >
            {t === 'fluxo' ? 'Gestão de Caixa' : t}
          </button>
        ))}
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {/* Main KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Entradas (Vendas)', value: formatCurrency(totalSalesAmount), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', help: <HelpTooltip title="Entradas" content="Soma das vendas fechadas (subtotal + taxa de serviço) do período selecionado." anchorId="guide_financeiro" /> },
                  { label: 'Saídas (Despesas)', value: formatCurrency(totalExpensesAmount), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10', help: <HelpTooltip title="Saídas" content="Soma das despesas e sangrias operacionais registradas no período selecionado." anchorId="guide_financeiro" /> },
                  { label: 'Lucro Líquido Real', value: formatCurrency(netProfit), icon: TrendingUp, color: netProfit >= 0 ? 'text-blue-500' : 'text-[#475569]', bg: netProfit >= 0 ? 'bg-blue-500/10' : 'bg-[#475569]/10', help: <HelpTooltip title="Lucro Líquido Real" content="Fórmula: Entradas (Vendas) − Saídas (Despesas) − CMV." anchorId="guide_financeiro" /> },
                  { label: 'Margem Líquida', value: `${totalSalesAmount ? ((netProfit / totalSalesAmount) * 100).toFixed(1) : 0}%`, icon: Target, color: 'text-slate-500', bg: 'bg-slate-500/10', help: <HelpTooltip title="Margem Líquida" content="Fórmula: (Lucro Líquido / Entradas) * 100." anchorId="guide_financeiro" /> },
                ].map((kpi, i) => (
                  <div key={i} className={`p-8 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                        <kpi.icon className="w-6 h-6" />
                      </div>
                      {kpi.help}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-30 mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold tracking-tighter">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Evolução Financeira */}
              <div className={`p-10 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-250/5'}`}>
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    <h3 className="text-xl font-bold tracking-tighter uppercase ">Evolução Financeira</h3>
                    <HelpTooltip title="Evolução Financeira" content="Demonstra as entradas (vendas recebidas) e saídas (despesas e sangrias) distribuídas cronologicamente no período selecionado." anchorId="guide_financeiro" />
                  </div>
                  {/* Legenda */}
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                      <span className="opacity-60">Entradas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded" />
                      <span className="opacity-60">Saídas</span>
                    </div>
                  </div>
                </div>

                {!hasChartData ? (
                  <div className="h-64 flex flex-col items-center justify-center border border-dashed border-current/10 rounded-lg opacity-30 text-xs font-bold uppercase tracking-wide">
                    Nenhum movimento registrado no período selecionado
                  </div>
                ) : (
                  <div className="h-64 flex items-end gap-3 pt-6 border-b border-current/10 pb-2 relative">
                    {chartData.labels.map((label, index) => {
                      const saleVal = chartData.sales[index];
                      const expVal = chartData.expenses[index];
                      const maxVal = Math.max(...chartData.sales, ...chartData.expenses, 1);

                      const saleHeight = `${(saleVal / maxVal) * 90}%`;
                      const expHeight = `${(expVal / maxVal) * 90}%`;

                      return (
                        <div key={label} className="flex-1 flex flex-col items-center h-full group relative">
                          {/* Barras Lado a Lado */}
                          <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                            {/* Barra Entrada */}
                            <div className="flex-1 flex flex-col justify-end h-full">
                              {saleVal > 0 && (
                                <div className="relative group/bar flex flex-col items-center">
                                  {/* Tooltip */}
                                  <div className="absolute z-50 bottom-full mb-1 opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                    {formatCurrency(saleVal)}
                                  </div>
                                  <motion.div
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.02 }}
                                    style={{ height: saleHeight, transformOrigin: 'bottom' }}
                                    className="w-full bg-emerald-500/80 hover:bg-emerald-500 rounded-t-sm transition-colors cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Barra Saída */}
                            <div className="flex-1 flex flex-col justify-end h-full">
                              {expVal > 0 && (
                                <div className="relative group/bar flex flex-col items-center">
                                  {/* Tooltip */}
                                  <div className="absolute z-50 bottom-full mb-1 opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                    {formatCurrency(expVal)}
                                  </div>
                                  <motion.div
                                    initial={{ scaleY: 0 }}
                                    animate={{ scaleY: 1 }}
                                    transition={{ duration: 0.5, delay: index * 0.02 }}
                                    style={{ height: expHeight, transformOrigin: 'bottom' }}
                                    className="w-full bg-red-500/80 hover:bg-red-500 rounded-t-sm transition-colors cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Label do Eixo X */}
                          <span className="text-[8px] font-bold opacity-40 uppercase tracking-wide truncate max-w-[4rem] mt-1 text-center select-none">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Advanced Views */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`lg:col-span-2 p-10 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold tracking-tighter uppercase ">Estrutura de Gastos</h3>
                      <HelpTooltip title="Estrutura de Gastos" content="Exibe a distribuição percentual e em valor das suas despesas operacionais por categoria no período." anchorId="guide_financeiro" />
                    </div>
                    <PieChart className="w-5 h-5 opacity-20" />
                  </div>
                  <div className="space-y-6">
                    {Object.entries(expenseCategoryStats).length === 0 ? (
                      <div className="py-12 text-center opacity-30 text-xs font-bold uppercase tracking-wide">Nenhuma despesa lançada no período</div>
                    ) : (
                      Object.entries(expenseCategoryStats).map(([cat, rev]) => (
                        <div key={cat} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide">
                            <span>{cat} ({totalExpensesAmount > 0 ? ((Number(rev) / totalExpensesAmount) * 100).toFixed(1) : 0}%)</span>
                            <span className="opacity-40">{formatCurrency(Number(rev))}</span>
                          </div>
                          <div className="h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(Number(rev) / (totalExpensesAmount || 1)) * 100}%` }} className="h-full bg-red-500/50 rounded-full" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={`p-10 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50/30 border-slate-100'}`}>
                   <div className="flex items-center gap-4 mb-8">
                      <Clock className="w-6 h-6 text-[#475569]" />
                      <h3 className="text-xl font-bold tracking-tighter uppercase ">DRE Resumido</h3>
                      <HelpTooltip title="DRE Resumido" content="Demonstrativo de Resultado do Exercício compilado: Faturamento (Entradas) menos custos de mercadoria vendida (CMV) e despesas operacionais, exibindo o resultado líquido." anchorId="guide_financeiro" />
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 border-b border-current/5">
                         <span className="text-[10px] font-bold uppercase opacity-40">Faturamento</span>
                         <span className="text-sm font-bold">{formatCurrency(totalSalesAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border-b border-current/5">
                         <span className="text-[10px] font-bold uppercase opacity-40">CMV (Custo Produtos)</span>
                         <span className="text-sm font-bold text-red-400">-({formatCurrency(cmvTotal)})</span>
                      </div>
                      <div className="flex justify-between items-center p-3 border-b border-current/5">
                         <span className="text-[10px] font-bold uppercase opacity-40">Despesas (Insumos/Gerais)</span>
                         <span className="text-sm font-bold text-red-400">-({formatCurrency(totalExpensesAmount)})</span>
                      </div>
                      <div className={`flex justify-between items-center p-4 rounded-lg mt-4 ${netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                         <span className="text-[11px] font-bold uppercase">Resultado Final</span>
                         <span className="text-lg font-bold">{formatCurrency(netProfit)}</span>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'fluxo' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <h3 className="text-xl font-bold uppercase tracking-tight">Histórico de Fechamento de Caixa</h3>
              <div className={`rounded-xl border overflow-hidden shadow-sm mb-12 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className={`text-[10px] uppercase font-bold tracking-wide border-b ${isDark ? 'bg-[#252527] border-[#2C2C2E] text-[#636366]' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <th className="px-8 py-5">Turno</th>
                        <th className="px-8 py-5 text-right">Pedidos</th>
                        <th className="px-8 py-5 text-right">Faturamento</th>
                        <th className="px-8 py-5 text-right">Despesas</th>
                        <th className="px-8 py-5 text-right">Diferença Caixa</th>
                        <th className="px-8 py-5 text-right">Saldo Final</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-[#2C2C2E]' : 'divide-gray-100'}`}>
                      {filteredCashierHistory.length === 0 && (
                        <tr><td colSpan={6} className="py-20 text-center opacity-30 text-xs font-bold uppercase tracking-wide">Nenhum turno registrado no período</td></tr>
                      )}
                      {[...filteredCashierHistory].reverse().map((s, idx) => {
                        const hasDiff = s.cashBreakdown !== undefined;
                        const diffColor = !hasDiff ? 'text-gray-500' : s.cashBreakdown! >= 0 ? 'text-emerald-500' : 'text-red-500';
                        const diffSign = s.cashBreakdown! > 0 ? '+' : '';
                        return (
                        <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#252527]' : 'hover:bg-gray-50/50'}`}>
                          <td className="px-8 py-6"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}><Calendar className="w-4 h-4 opacity-40" /></div><div><p className="font-bold text-xs">{new Date(s.openedAt).toLocaleDateString('pt-BR')} {new Date(s.openedAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p><p className="text-[10px] font-bold opacity-30">{s.closedAt ? `Fechado às ${new Date(s.closedAt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}` : 'Em aberto'}</p></div></div></td>
                          <td className="px-8 py-6 text-right font-bold opacity-60">{s.ordersCount}</td>
                          <td className="px-8 py-6 text-right font-bold text-emerald-500">{formatCurrency(s.salesTotal + s.serviceTaxTotal)}</td>
                          <td className="px-8 py-6 text-right font-bold text-red-500">{formatCurrency(s.expensesTotal)}</td>
                          <td className={`px-8 py-6 text-right font-bold text-xs ${diffColor}`}>
                            {hasDiff ? `${diffSign}${formatCurrency(s.cashBreakdown)}` : 'N/C'}
                          </td>
                          <td className="px-8 py-6 text-right"><span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-xs">{formatCurrency(s.finalBalance ?? 0)}</span></td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 className="text-xl font-bold uppercase tracking-tight mt-12 pt-8 border-t border-dashed border-current/10">Despesas / Lançamentos Avulsos</h3>
              <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`text-[9px] font-bold uppercase tracking-wide border-b ${isDark ? 'bg-white/5 border-white/5 text-white/30' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <th className="px-10 py-6">Data</th>
                        <th className="px-10 py-6">Categoria</th>
                        <th className="px-10 py-6">Descrição</th>
                        <th className="px-10 py-6">Status</th>
                        <th className="px-10 py-6 text-right">Valor</th>
                        <th className="px-10 py-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-current/5">
                      {filteredExpenses.length === 0 && (
                        <tr><td colSpan={6} className="py-20 text-center opacity-30 text-xs font-bold uppercase tracking-wide">Nenhum lançamento extra registrado</td></tr>
                      )}
                      {filteredExpenses.reverse().map(e => (
                        <tr key={e.id} className="group hover:bg-current/[0.01] transition-all">
                          <td className="px-10 py-6 text-xs font-bold opacity-40">{new Date(e.timestamp).toLocaleDateString('pt-BR')}</td>
                          <td className="px-10 py-6">
                             <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide bg-white/5 border border-current/10">
                               {e.category}
                             </span>
                          </td>
                          <td className="px-10 py-6 text-xs font-bold uppercase ">{e.description}</td>
                          <td className="px-10 py-6">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${e.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                               {e.status}
                             </span>
                          </td>
                          <td className="px-10 py-6 text-right font-bold text-red-400">{formatCurrency(e.amount)}</td>
                          <td className="px-10 py-6 text-right">
                             <button onClick={() => deleteExpense(e.id)} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'vendas' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`text-[9px] font-bold uppercase tracking-wide border-b ${isDark ? 'bg-white/5 border-white/5 text-white/30' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                      <th className="px-10 py-6">Data & Hora</th>
                      <th className="px-10 py-6">Ticket</th>
                      <th className="px-10 py-6">Operação</th>
                      <th className="px-10 py-6">Pagamento</th>
                      <th className="px-10 py-6 text-right">Valor Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-current/5">
                    {salesData.map(o => (
                      <tr key={o.id} className="group hover:bg-current/[0.01] transition-all">
                        <td className="px-10 py-6 text-xs font-bold opacity-40">{new Date(o.timestamp).toLocaleString('pt-BR')}</td>
                        <td className="px-10 py-6 font-bold text-xs uppercase ">#{o.id.slice(-6)}</td>
                        <td className="px-10 py-6">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                             {o.mode === 'mesa' ? `Mesa ${o.tableNumber}` : 'Balcão'}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-[10px] font-bold opacity-60 uppercase tracking-wide">{o.payments.map(p => p.method).join(' + ')}</td>
                        <td className="px-10 py-6 text-right font-bold text-[#475569]">{formatCurrency(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'produtos' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productRanking.map((p, i) => (
                  <div key={p.name} className={`p-8 rounded-lg border relative overflow-hidden group ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="absolute top-0 right-0 p-4">
                       <span className={`text-4xl font-bold  opacity-5 ${i < 3 ? 'text-[#475569]' : ''}`}>{i + 1}º</span>
                    </div>
                    <div className="space-y-1 mb-6">
                       <p className="text-[8px] font-bold uppercase tracking-wide opacity-30">{p.category}</p>
                       <h4 className="text-lg font-bold tracking-tighter uppercase  truncate pr-8">{p.name}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-current/5">
                          <p className="text-[8px] font-bold uppercase opacity-30 mb-1">Volume</p>
                          <p className="text-xl font-bold">{p.qty}</p>
                       </div>
                       <div className="p-4 rounded-lg bg-[#475569]/5 border border-[#475569]/10">
                          <p className="text-[8px] font-bold uppercase text-[#475569]/60 mb-1">Receita</p>
                          <p className="text-xl font-bold text-[#475569]">{formatCurrency(p.revenue)}</p>
                       </div>
                    </div>
                  </div>
                ))}
             </motion.div>
          )}

          {activeTab === 'atendentes' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {waiterStats.map((w, i) => (
                  <div key={w.id} className={`p-8 rounded-lg border flex flex-col md:flex-row justify-between items-center gap-8 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-white text-xl font-bold  shadow-sm">
                           {w.name[0]}
                        </div>
                        <div>
                           <h4 className="text-xl font-bold tracking-tighter uppercase ">{w.name}</h4>
                           <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">{w.ordersCount} Pedidos Finalizados</p>
                        </div>
                     </div>

                     <div className="flex gap-8 items-center">
                        <div className="text-center">
                           <p className="text-[8px] font-bold uppercase opacity-30 mb-1">Vendas Totais</p>
                           <p className="text-xl font-bold ">{formatCurrency(w.revenue)}</p>
                        </div>
                        <div className="h-10 w-px bg-current/10" />
                        <div className="text-center">
                           <p className="text-[8px] font-bold uppercase text-emerald-500 mb-1">Comissão Acumulada</p>
                           <p className="text-xl font-bold text-emerald-500 ">{formatCurrency(w.commission)}</p>
                        </div>
                        <button className="w-12 h-12 rounded-lg bg-[#475569]/10 text-[#475569] flex items-center justify-center hover:bg-[#475569] hover:text-white transition-all"><ChevronRight className="w-6 h-6" /></button>
                     </div>
                  </div>
                ))}
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExpenseModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-lg p-8 rounded-xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
               <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    layout
                    className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-200
                      ${newExpense.category === 'Aluguel' ? 'bg-blue-500/20 text-blue-500' :
                        newExpense.category === 'Insumos' ? 'bg-orange-500/20 text-orange-500' :
                        newExpense.category === 'Pessoal' ? 'bg-slate-500/20 text-slate-500' :
                        newExpense.category === 'Utilidades' ? 'bg-cyan-500/20 text-cyan-500' :
                        newExpense.category === 'Marketing' ? 'bg-slate-500/20 text-slate-500' :
                        newExpense.category === 'Impostos' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-[#475569]/20 text-[#475569]'}`}
                  >
                     <Receipt className="w-6 h-6" />
                  </motion.div>
                  <div>
                     <h3 className="text-2xl font-bold tracking-tighter uppercase ">Novo Lançamento</h3>
                     <p className="text-[10px] font-bold uppercase opacity-40">Registre uma saída financeira</p>
                  </div>
               </div>

               <form onSubmit={handleAddExpense} className="space-y-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Escolha a Categoria</label>
                     <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {EXPENSE_CATEGORIES.map(cat => (
                           <button
                              key={cat}
                              type="button"
                              onClick={() => setNewExpense(prev => ({ ...prev, category: cat }))}
                              className={`py-3 px-2 rounded-lg border text-[9px] font-bold uppercase tracking-tighter transition-all flex flex-col items-center gap-2
                                 ${newExpense.category === cat
                                    ? cat === 'Aluguel' ? 'bg-blue-500 border-blue-500 text-white shadow-sm' :
                                      cat === 'Insumos' ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/20' :
                                      cat === 'Pessoal' ? 'bg-slate-500 border-slate-500 text-white shadow-sm' :
                                      cat === 'Utilidades' ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm shadow-cyan-500/20' :
                                      cat === 'Marketing' ? 'bg-slate-500 border-slate-500 text-white shadow-sm shadow-slate-500/20' :
                                      cat === 'Impostos' ? 'bg-amber-500 border-amber-500 text-white shadow-sm' :
                                      'bg-[#475569] border-[#475569] text-white shadow-sm'
                                    : isDark ? 'bg-white/5 border-white/5 opacity-40 hover:opacity-100' : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100'}`}
                           >
                              {cat === 'Insumos' && <ShoppingBag className="w-4 h-4" />}
                              {cat === 'Pessoal' && <Users className="w-4 h-4" />}
                              {cat === 'Aluguel' && <Calendar className="w-4 h-4" />}
                              {cat === 'Utilidades' && <DollarSign className="w-4 h-4" />}
                              {cat === 'Marketing' && <Target className="w-4 h-4" />}
                              {cat === 'Impostos' && <FileText className="w-4 h-4" />}
                              {cat === 'Outros' && <AlertCircle className="w-4 h-4" />}
                              {cat}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Status do Pagamento</label>
                        <div className="flex gap-2">
                           {['pago', 'pendente'].map(status => (
                              <button
                                 key={status}
                                 type="button"
                                 onClick={() => setNewExpense(prev => ({ ...prev, status: status as any }))}
                                 className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all
                                    ${newExpense.status === status
                                       ? status === 'pago' ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                       : isDark ? 'bg-white/5 border-white/5 opacity-30' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                              >
                                 {status}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Descrição / Favorecido</label>
                        <input
                           required
                           type="text"
                           value={newExpense.description}
                           onChange={e => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                           placeholder="Ex: Aluguel Mensal, Pagamento Staff..."
                           className={`w-full px-5 py-4 rounded-lg border bg-transparent text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#475569]/20 ${isDark ? 'border-[#2C2C2E]' : 'border-gray-100'}`}
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Valor Total</label>
                        <div className="relative">
                           <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                           <input
                              required
                              type="number"
                              step="0.01"
                              value={newExpense.amount || ''}
                              onChange={e => setNewExpense(prev => ({ ...prev, amount: Number(e.target.value) }))}
                              placeholder="0,00"
                              className={`w-full pl-12 pr-5 py-4 rounded-lg border bg-transparent text-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#475569]/20 ${isDark ? 'border-[#2C2C2E]' : 'border-gray-100'}`}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-4 rounded-lg font-bold uppercase tracking-wide text-[10px] opacity-40 hover:opacity-100 transition-all">Cancelar</button>
                     <button type="submit" className="flex-[2] py-4 rounded-lg bg-[#475569] text-white font-bold uppercase tracking-wide text-[10px] shadow-sm transition-all">Confirmar Lançamento</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
