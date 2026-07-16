import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileText,
  PieChart,
  Plus,
  Receipt,
  ShoppingBag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../store/AppContext';
import { Expense } from '../types';
import { ui } from '../ui/styles';
import { formatCurrency } from '../utils/format';
import { HelpTooltip } from './HelpTooltip';

type Tab = 'dashboard' | 'fluxo' | 'vendas' | 'produtos' | 'atendentes';
type Period = 'hoje' | 'semana' | 'mes' | 'total';

const EXPENSE_CATEGORIES: Expense['category'][] = [
  'Insumos',
  'Pessoal',
  'Aluguel',
  'Utilidades',
  'Marketing',
  'Impostos',
  'Outros',
];

const periodLabels: Record<Period, string> = {
  hoje: 'Hoje',
  semana: 'Semana',
  mes: 'Mês',
  total: 'Total',
};

const tabLabels: Record<Tab, string> = {
  dashboard: 'Dashboard',
  fluxo: 'Gestão de Caixa',
  vendas: 'Vendas',
  produtos: 'Produtos',
  atendentes: 'Atendentes',
};

const isWithinPeriod = (timestamp: string, period: Period) => {
  const now = new Date();
  const date = new Date(timestamp);

  if (period === 'hoje') return date.toDateString() === now.toDateString();
  if (period === 'semana') {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return date >= weekAgo;
  }
  if (period === 'mes') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return true;
};

const escapeCsvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

const downloadCSV = (filename: string, rows: string[][]) => {
  const bom = '\uFEFF';
  const content = bom + rows.map(row => row.map(escapeCsvCell).join(';')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const getCategoryIcon = (category: Expense['category']) => {
  if (category === 'Insumos') return ShoppingBag;
  if (category === 'Pessoal') return Users;
  if (category === 'Aluguel') return Calendar;
  if (category === 'Utilidades') return DollarSign;
  if (category === 'Marketing') return Target;
  if (category === 'Impostos') return FileText;
  return AlertCircle;
};

const getCategoryTone = (category: Expense['category']) => {
  if (category === 'Aluguel') return 'bg-blue-500 border-blue-500 text-white';
  if (category === 'Insumos') return 'bg-orange-500 border-orange-500 text-white';
  if (category === 'Pessoal') return 'bg-slate-500 border-slate-500 text-white';
  if (category === 'Utilidades') return 'bg-cyan-500 border-cyan-500 text-white';
  if (category === 'Marketing') return 'bg-slate-500 border-slate-500 text-white';
  if (category === 'Impostos') return 'bg-amber-500 border-amber-500 text-white';
  return 'bg-[#475569] border-[#475569] text-white';
};

export const Reports: React.FC = () => {
  const { orders, waiters, theme, expenses, addExpense, deleteExpense, stockItems, cashierHistory } = useApp();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [period, setPeriod] = useState<Period>('mes');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    category: 'Outros',
    status: 'pago',
    amount: 0,
    description: '',
  });

  const closedOrders = useMemo(() => orders.filter(order => order.status === 'closed'), [orders]);

  const filteredOrders = useMemo(() => {
    return closedOrders.filter(order => isWithinPeriod(order.timestamp, period));
  }, [closedOrders, period]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      if (expense.entryType && expense.entryType !== 'saida') return false;
      return isWithinPeriod(expense.timestamp, period);
    });
  }, [expenses, period]);

  const filteredCashierHistory = useMemo(() => {
    return cashierHistory.filter(session => isWithinPeriod(session.openedAt, period));
  }, [cashierHistory, period]);

  const salesData = useMemo(() => [...filteredOrders].reverse(), [filteredOrders]);
  const salesItems = useMemo(() => filteredOrders.flatMap(order => order.items), [filteredOrders]);

  const totalRevenue = filteredOrders.reduce((acc, order) => acc + order.subtotal, 0);
  const totalService = filteredOrders.reduce((acc, order) => acc + order.serviceCharge, 0);
  const totalSalesAmount = totalRevenue + totalService;
  const totalExpensesAmount = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);

  const productsWithoutRecipe = useMemo(() => {
    const names = new Set<string>();
    salesItems.forEach(item => {
      if (!item.product.recipe || item.product.recipe.length === 0) names.add(item.product.name);
    });
    return names;
  }, [salesItems]);

  const cmvTotal = salesItems.reduce((acc, item) => {
    const itemCost = (item.product.recipe || []).reduce((recipeAcc, recipeItem) => {
      const stockItem = stockItems.find(stock => stock.id === recipeItem.stockItemId);
      return recipeAcc + (stockItem ? stockItem.costPrice * recipeItem.quantity : 0);
    }, 0);
    return acc + item.quantity * itemCost;
  }, 0);

  const netProfit = totalSalesAmount - totalExpensesAmount - cmvTotal;
  const hasIncompleteCmv = productsWithoutRecipe.size > 0 && filteredOrders.length > 0;

  const productRanking = useMemo(() => {
    const stats = salesItems.reduce<Record<string, { qty: number; revenue: number; category: string }>>((acc, item) => {
      const name = item.product.name;
      if (!acc[name]) acc[name] = { qty: 0, revenue: 0, category: item.product.category };
      acc[name].qty += item.quantity;
      acc[name].revenue += item.price * item.quantity;
      return acc;
    }, {});

    return (Object.entries(stats) as [string, { qty: number; revenue: number; category: string }][])
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([name, stats]) => ({ name, ...stats }));
  }, [salesItems]);

  const expenseCategoryStats = useMemo(() => {
    return filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
  }, [filteredExpenses]);

  const waiterStats = useMemo(() => {
    return waiters.map(waiter => {
      const waiterOrders = filteredOrders.filter(order => order.waiterId === waiter.id);
      return {
        id: waiter.id,
        name: waiter.name,
        ordersCount: waiterOrders.length,
        revenue: waiterOrders.reduce((acc, order) => acc + order.total, 0),
        commission: waiterOrders.reduce((acc, order) => acc + order.serviceCharge, 0),
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, waiters]);

  const chartData = useMemo(() => {
    const now = new Date();

    if (period === 'hoje') {
      const labels: string[] = [];
      const sales: number[] = [];
      const expensesArr: number[] = [];

      for (let hour = 8; hour <= 23; hour += 1) {
        labels.push(`${hour}h`);
        sales.push(filteredOrders.reduce((acc, order) => {
          const date = new Date(order.timestamp);
          return date.getHours() === hour ? acc + order.subtotal + order.serviceCharge : acc;
        }, 0));
        expensesArr.push(filteredExpenses.reduce((acc, expense) => {
          const date = new Date(expense.timestamp);
          return date.getHours() === hour ? acc + expense.amount : acc;
        }, 0));
      }

      return { labels, sales, expenses: expensesArr };
    }

    if (period === 'semana') {
      const labels: string[] = [];
      const sales: number[] = [];
      const expensesArr: number[] = [];
      const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      for (let i = 6; i >= 0; i -= 1) {
        const day = new Date();
        day.setDate(now.getDate() - i);
        labels.push(`${weekdays[day.getDay()]} (${day.getDate()}/${day.getMonth() + 1})`);
        sales.push(filteredOrders.reduce((acc, order) => {
          const date = new Date(order.timestamp);
          return date.toDateString() === day.toDateString() ? acc + order.subtotal + order.serviceCharge : acc;
        }, 0));
        expensesArr.push(filteredExpenses.reduce((acc, expense) => {
          const date = new Date(expense.timestamp);
          return date.toDateString() === day.toDateString() ? acc + expense.amount : acc;
        }, 0));
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

      for (let start = 1; start <= daysInMonth; start += 3) {
        const end = Math.min(start + 2, daysInMonth);
        labels.push(start === end ? `${start}` : `${start}-${end}`);
        sales.push(filteredOrders.reduce((acc, order) => {
          const date = new Date(order.timestamp);
          const isSameMonth = date.getMonth() === month && date.getFullYear() === year;
          return isSameMonth && date.getDate() >= start && date.getDate() <= end
            ? acc + order.subtotal + order.serviceCharge
            : acc;
        }, 0));
        expensesArr.push(filteredExpenses.reduce((acc, expense) => {
          const date = new Date(expense.timestamp);
          const isSameMonth = date.getMonth() === month && date.getFullYear() === year;
          return isSameMonth && date.getDate() >= start && date.getDate() <= end ? acc + expense.amount : acc;
        }, 0));
      }

      return { labels, sales, expenses: expensesArr };
    }

    const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const sales = Array(12).fill(0);
    const expensesArr = Array(12).fill(0);

    filteredOrders.forEach(order => {
      const date = new Date(order.timestamp);
      if (date.getFullYear() === now.getFullYear()) sales[date.getMonth()] += order.subtotal + order.serviceCharge;
    });

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.timestamp);
      if (date.getFullYear() === now.getFullYear()) expensesArr[date.getMonth()] += expense.amount;
    });

    return { labels, sales, expenses: expensesArr };
  }, [filteredExpenses, filteredOrders, period]);

  const hasChartData = chartData.sales.some(value => value > 0) || chartData.expenses.some(value => value > 0);

  const handleAddExpense = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newExpense.description || !newExpense.amount || newExpense.amount <= 0) return;

    const expense: Expense = {
      id: Date.now().toString(),
      description: newExpense.description,
      amount: Number(newExpense.amount),
      category: newExpense.category || 'Outros',
      status: newExpense.status || 'pago',
      timestamp: new Date().toISOString(),
      entryType: 'saida',
    };

    addExpense(expense);
    setIsExpenseModalOpen(false);
    setNewExpense({ category: 'Outros', status: 'pago', amount: 0, description: '' });
  };

  const handleExport = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const header = ['Data/Hora', 'Pedido', 'Modo', 'Mesa', 'Forma de Pagamento', 'Total (R$)'];
    const rows = salesData.map(order => [
      new Date(order.timestamp).toLocaleString('pt-BR'),
      `#${order.id.slice(-6)}`,
      order.mode === 'mesa' ? 'Mesa' : 'Balcão',
      order.tableNumber?.toString() || '',
      order.payments.map(payment => payment.method).join(' + ') || '-',
      order.total.toFixed(2).replace('.', ','),
    ]);
    downloadCSV(`vendas_${period}_${dateStr}.csv`, [header, ...rows]);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    setExpenseToDelete(null);
  };

  const renderEmptyState = (message: string) => (
    <div className={`py-20 px-6 text-center rounded-xl border border-dashed ${isDark ? 'border-white/10 text-white/30' : 'border-gray-200 text-gray-400'}`}>
      <p className="text-xs font-bold uppercase tracking-wide">{message}</p>
    </div>
  );

  const renderChart = () => (
    <div className="h-64 flex items-end gap-3 pt-6 border-b border-current/10 pb-2 relative">
      {chartData.labels.map((label, index) => {
        const saleVal = chartData.sales[index];
        const expVal = chartData.expenses[index];
        const maxVal = Math.max(...chartData.sales, ...chartData.expenses, 1);

        return (
          <div key={label} className="flex-1 flex flex-col items-center h-full group relative">
            <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
              <div className="flex-1 flex flex-col justify-end h-full">
                {saleVal > 0 && (
                  <div className="relative group/bar flex flex-col items-center">
                    <div className="absolute z-50 bottom-full mb-1 opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {formatCurrency(saleVal)}
                    </div>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.02 }}
                      style={{ height: `${(saleVal / maxVal) * 90}%`, transformOrigin: 'bottom' }}
                      className="w-full bg-emerald-500/80 hover:bg-emerald-500 rounded-t-sm transition-colors"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-end h-full">
                {expVal > 0 && (
                  <div className="relative group/bar flex flex-col items-center">
                    <div className="absolute z-50 bottom-full mb-1 opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      {formatCurrency(expVal)}
                    </div>
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.02 }}
                      style={{ height: `${(expVal / maxVal) * 90}%`, transformOrigin: 'bottom' }}
                      className="w-full bg-red-500/80 hover:bg-red-500 rounded-t-sm transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
            <span className="text-[8px] font-bold opacity-40 uppercase tracking-wide truncate max-w-[4rem] mt-1 text-center select-none">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );

  const kpis = [
    {
      label: 'Entradas (Vendas)',
      value: formatCurrency(totalSalesAmount),
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      help: 'Soma apenas pedidos finalizados no período selecionado.',
    },
    {
      label: 'Saídas (Despesas)',
      value: formatCurrency(totalExpensesAmount),
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      help: 'Soma despesas financeiras registradas como saída no período.',
    },
    {
      label: 'Lucro Líquido',
      value: formatCurrency(netProfit),
      icon: TrendingUp,
      color: netProfit >= 0 ? 'text-blue-500' : 'text-red-500',
      bg: netProfit >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10',
      help: 'Fórmula: entradas de vendas menos despesas e CMV estimado.',
    },
    {
      label: 'Margem Líquida',
      value: `${totalSalesAmount ? ((netProfit / totalSalesAmount) * 100).toFixed(1) : 0}%`,
      icon: Target,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10',
      help: 'Percentual de lucro líquido sobre as vendas finalizadas.',
    },
  ];

  return (
    <div className="flex flex-col min-h-full gap-8 animate-in fade-in duration-200 pb-12">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="space-y-1">
          <h2 className={ui.pageTitle}>BI e Financeiro</h2>
          <p className={ui.pageSubtitle}>Gestão consolidada de caixa, vendas e despesas</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className={ui.tabShell(isDark)}>
            {(['hoje', 'semana', 'mes', 'total'] as Period[]).map(item => (
              <button key={item} onClick={() => setPeriod(item)} className={`px-4 py-2 ${ui.tab(period === item, isDark)}`}>
                {periodLabels[item]}
              </button>
            ))}
          </div>
          {activeTab === 'vendas' && (
            <button onClick={handleExport} disabled={salesData.length === 0} className={`px-5 py-3 ${ui.ghostButton(isDark)} flex items-center gap-3 disabled:opacity-30`}>
              <Download className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wide">Exportar CSV</span>
            </button>
          )}
          <button onClick={() => setIsExpenseModalOpen(true)} className={`px-6 py-3 ${ui.primaryButton} flex items-center gap-3`}>
            <Plus className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Lançar Despesa</span>
          </button>
        </div>
      </div>

      <div className={`${ui.tabShell(isDark)} w-fit flex-wrap`}>
        {(['dashboard', 'fluxo', 'vendas', 'produtos', 'atendentes'] as Tab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 ${ui.tab(activeTab === tab, isDark)}`}>
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              {hasIncompleteCmv && (
                <div className={`p-5 rounded-lg border flex gap-4 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">CMV estimado incompleto</p>
                    <p className="text-xs opacity-80 mt-1">
                      {productsWithoutRecipe.size} produto(s) vendido(s) no período ainda não têm ficha técnica. O lucro pode aparecer maior que o real até o cadastro das receitas.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map(kpi => (
                  <div key={kpi.label} className={`p-8 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                        <kpi.icon className="w-6 h-6" />
                      </div>
                      <HelpTooltip title={kpi.label} content={kpi.help} anchorId="guide_financeiro" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-30 mb-1">{kpi.label}</p>
                    <p className="text-2xl font-bold tracking-tighter">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className={`p-10 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-250/5'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    <h3 className="text-xl font-bold tracking-tighter uppercase">Evolução Financeira</h3>
                    <HelpTooltip title="Evolução Financeira" content="Compara vendas finalizadas e despesas registradas no período selecionado." anchorId="guide_financeiro" />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded" /><span className="opacity-60">Entradas</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded" /><span className="opacity-60">Saídas</span></div>
                  </div>
                </div>
                {hasChartData ? renderChart() : renderEmptyState('Nenhum movimento registrado no período selecionado')}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`lg:col-span-2 p-10 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold tracking-tighter uppercase">Estrutura de Gastos</h3>
                      <HelpTooltip title="Estrutura de Gastos" content="Mostra a distribuição das despesas por categoria no período selecionado." anchorId="guide_financeiro" />
                    </div>
                    <PieChart className="w-5 h-5 opacity-20" />
                  </div>
                  <div className="space-y-6">
                    {Object.entries(expenseCategoryStats).length === 0 ? (
                      <div className="py-12 text-center opacity-30 text-xs font-bold uppercase tracking-wide">Nenhuma despesa lançada no período</div>
                    ) : (
                      (Object.entries(expenseCategoryStats) as [string, number][]).map(([category, amount]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide">
                            <span>{category} ({totalExpensesAmount > 0 ? ((amount / totalExpensesAmount) * 100).toFixed(1) : 0}%)</span>
                            <span className="opacity-40">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-3 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(amount / (totalExpensesAmount || 1)) * 100}%` }} className="h-full bg-red-500/50 rounded-full" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={`p-10 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50/30 border-slate-100'}`}>
                  <div className="flex items-center gap-4 mb-8">
                    <Clock className="w-6 h-6 text-[#475569]" />
                    <h3 className="text-xl font-bold tracking-tighter uppercase">DRE Resumido</h3>
                    <HelpTooltip title="DRE Resumido" content="Resumo financeiro com faturamento, CMV estimado, despesas e resultado final." anchorId="guide_financeiro" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border-b border-current/5"><span className="text-[10px] font-bold uppercase opacity-40">Faturamento</span><span className="text-sm font-bold">{formatCurrency(totalSalesAmount)}</span></div>
                    <div className="flex justify-between items-center p-3 border-b border-current/5"><span className="text-[10px] font-bold uppercase opacity-40">CMV estimado</span><span className="text-sm font-bold text-red-400">-({formatCurrency(cmvTotal)})</span></div>
                    <div className="flex justify-between items-center p-3 border-b border-current/5"><span className="text-[10px] font-bold uppercase opacity-40">Despesas</span><span className="text-sm font-bold text-red-400">-({formatCurrency(totalExpensesAmount)})</span></div>
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
                      {[...filteredCashierHistory].reverse().map(session => {
                        const hasDiff = session.cashBreakdown !== undefined;
                        const diffColor = !hasDiff ? 'text-gray-500' : session.cashBreakdown! >= 0 ? 'text-emerald-500' : 'text-red-500';
                        const diffSign = session.cashBreakdown! > 0 ? '+' : '';
                        return (
                          <tr key={session.id} className={`transition-colors ${isDark ? 'hover:bg-[#252527]' : 'hover:bg-gray-50/50'}`}>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}><Calendar className="w-4 h-4 opacity-40" /></div>
                                <div>
                                  <p className="font-bold text-xs">{new Date(session.openedAt).toLocaleDateString('pt-BR')} {new Date(session.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                  <p className="text-[10px] font-bold opacity-30">{session.closedAt ? `Fechado às ${new Date(session.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Em aberto'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right font-bold opacity-60">{session.ordersCount}</td>
                            <td className="px-8 py-6 text-right font-bold text-emerald-500">{formatCurrency(session.salesTotal + session.serviceTaxTotal)}</td>
                            <td className="px-8 py-6 text-right font-bold text-red-500">{formatCurrency(session.expensesTotal)}</td>
                            <td className={`px-8 py-6 text-right font-bold text-xs ${diffColor}`}>{hasDiff ? `${diffSign}${formatCurrency(session.cashBreakdown)}` : 'N/C'}</td>
                            <td className="px-8 py-6 text-right"><span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-xs">{formatCurrency(session.finalBalance ?? 0)}</span></td>
                          </tr>
                        );
                      })}
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
                      {[...filteredExpenses].reverse().map(expense => (
                        <tr key={expense.id} className="group hover:bg-current/[0.01] transition-all">
                          <td className="px-10 py-6 text-xs font-bold opacity-40">{new Date(expense.timestamp).toLocaleDateString('pt-BR')}</td>
                          <td className="px-10 py-6"><span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide bg-white/5 border border-current/10">{expense.category}</span></td>
                          <td className="px-10 py-6 text-xs font-bold uppercase">{expense.description}</td>
                          <td className="px-10 py-6"><span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${expense.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{expense.status}</span></td>
                          <td className="px-10 py-6 text-right font-bold text-red-400">{formatCurrency(expense.amount)}</td>
                          <td className="px-10 py-6 text-right">
                            <button onClick={() => setExpenseToDelete(expense)} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all" title="Excluir lançamento">
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
              {salesData.length === 0 ? renderEmptyState('Nenhuma venda finalizada no período') : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`text-[9px] font-bold uppercase tracking-wide border-b ${isDark ? 'bg-white/5 border-white/5 text-white/30' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <th className="px-10 py-6">Data e Hora</th>
                        <th className="px-10 py-6">Ticket</th>
                        <th className="px-10 py-6">Operação</th>
                        <th className="px-10 py-6">Pagamento</th>
                        <th className="px-10 py-6 text-right">Valor Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-current/5">
                      {salesData.map(order => (
                        <tr key={order.id} className="group hover:bg-current/[0.01] transition-all">
                          <td className="px-10 py-6 text-xs font-bold opacity-40">{new Date(order.timestamp).toLocaleString('pt-BR')}</td>
                          <td className="px-10 py-6 font-bold text-xs uppercase">#{order.id.slice(-6)}</td>
                          <td className="px-10 py-6"><span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>{order.mode === 'mesa' ? `Mesa ${order.tableNumber}` : 'Balcão'}</span></td>
                          <td className="px-10 py-6 text-[10px] font-bold opacity-60 uppercase tracking-wide">{order.payments.map(payment => payment.method).join(' + ') || '-'}</td>
                          <td className="px-10 py-6 text-right font-bold text-[#475569]">{formatCurrency(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'produtos' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {productRanking.length === 0 ? renderEmptyState('Nenhum produto vendido no período') : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {productRanking.map((product, index) => (
                    <div key={product.name} className={`p-8 rounded-lg border relative overflow-hidden group ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="absolute top-0 right-0 p-4"><span className={`text-4xl font-bold opacity-5 ${index < 3 ? 'text-[#475569]' : ''}`}>{index + 1}º</span></div>
                      <div className="space-y-1 mb-6">
                        <p className="text-[8px] font-bold uppercase tracking-wide opacity-30">{product.category}</p>
                        <h4 className="text-lg font-bold tracking-tighter uppercase truncate pr-8">{product.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-black/5 dark:bg-white/5 border border-current/5"><p className="text-[8px] font-bold uppercase opacity-30 mb-1">Volume</p><p className="text-xl font-bold">{product.qty}</p></div>
                        <div className="p-4 rounded-lg bg-[#475569]/5 border border-[#475569]/10"><p className="text-[8px] font-bold uppercase text-[#475569]/60 mb-1">Receita</p><p className="text-xl font-bold text-[#475569]">{formatCurrency(product.revenue)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'atendentes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {filteredOrders.length === 0 ? renderEmptyState('Nenhum atendimento finalizado no período') : waiterStats.map(waiter => (
                <div key={waiter.id} className={`p-8 rounded-lg border flex flex-col md:flex-row justify-between items-center gap-8 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center text-white text-xl font-bold shadow-sm">{waiter.name[0]}</div>
                    <div>
                      <h4 className="text-xl font-bold tracking-tighter uppercase">{waiter.name}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">{waiter.ordersCount} pedidos finalizados</p>
                    </div>
                  </div>
                  <div className="flex gap-8 items-center">
                    <div className="text-center"><p className="text-[8px] font-bold uppercase opacity-30 mb-1">Vendas Totais</p><p className="text-xl font-bold">{formatCurrency(waiter.revenue)}</p></div>
                    <div className="h-10 w-px bg-current/10" />
                    <div className="text-center"><p className="text-[8px] font-bold uppercase text-emerald-500 mb-1">Comissão Acumulada</p><p className="text-xl font-bold text-emerald-500">{formatCurrency(waiter.commission)}</p></div>
                    <button className="w-12 h-12 rounded-lg bg-[#475569]/10 text-[#475569] flex items-center justify-center hover:bg-[#475569] hover:text-white transition-all" title="Ver detalhes"><ChevronRight className="w-6 h-6" /></button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExpenseModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-lg p-8 rounded-xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-lg bg-[#475569]/20 text-[#475569] flex items-center justify-center"><Receipt className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tighter uppercase">Novo Lançamento</h3>
                  <p className="text-[10px] font-bold uppercase opacity-40">Registre uma saída financeira</p>
                </div>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Escolha a Categoria</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {EXPENSE_CATEGORIES.map(category => {
                      const Icon = getCategoryIcon(category);
                      const selected = newExpense.category === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setNewExpense(prev => ({ ...prev, category }))}
                          className={`py-3 px-2 rounded-lg border text-[9px] font-bold uppercase tracking-tighter transition-all flex flex-col items-center gap-2 ${selected ? getCategoryTone(category) : isDark ? 'bg-white/5 border-white/5 opacity-40 hover:opacity-100' : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Status do Pagamento</label>
                    <div className="flex gap-2">
                      {(['pago', 'pendente'] as Expense['status'][]).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNewExpense(prev => ({ ...prev, status }))}
                          className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${newExpense.status === status ? status === 'pago' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-amber-500 border-amber-500 text-white' : isDark ? 'bg-white/5 border-white/5 opacity-30' : 'bg-gray-50 border-gray-100 opacity-60'}`}
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
                      value={newExpense.description || ''}
                      onChange={event => setNewExpense(prev => ({ ...prev, description: event.target.value }))}
                      placeholder="Ex: Aluguel mensal, compra de insumos..."
                      className={`w-full px-5 py-4 rounded-lg border bg-transparent text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#475569]/20 ${isDark ? 'border-[#2C2C2E]' : 'border-gray-100'}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase opacity-40 ml-2">Valor Total</label>
                    <div className="relative">
                      <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input
                        required
                        min="0.01"
                        type="number"
                        step="0.01"
                        value={newExpense.amount || ''}
                        onChange={event => setNewExpense(prev => ({ ...prev, amount: Number(event.target.value) }))}
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

      <AnimatePresence>
        {expenseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpenseToDelete(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} className={`relative w-full max-w-md p-8 rounded-xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
              <div className="w-12 h-12 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center mb-6"><Trash2 className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold tracking-tighter uppercase mb-2">Excluir Lançamento?</h3>
              <p className="text-sm opacity-60 mb-6">Esta ação remove a despesa do relatório financeiro deste dispositivo.</p>
              <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className="text-xs font-bold uppercase">{expenseToDelete.description}</p>
                <p className="text-sm font-bold text-red-500 mt-1">{formatCurrency(expenseToDelete.amount)}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setExpenseToDelete(null)} className="flex-1 py-4 rounded-lg font-bold uppercase tracking-wide text-[10px] opacity-50 hover:opacity-100 transition-all">Cancelar</button>
                <button onClick={confirmDeleteExpense} className="flex-[2] py-4 rounded-lg bg-red-500 text-white font-bold uppercase tracking-wide text-[10px] shadow-sm transition-all">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
