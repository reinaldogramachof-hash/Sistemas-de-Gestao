import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { useAudit } from '../hooks/useAudit';
import { HelpTooltip } from './HelpTooltip';
import { formatCurrency } from '../utils/format';
import {
  ChevronDown,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  History,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Banknote,
  Receipt,
  AlertTriangle,
  Edit2,
  Trash2,
  Share2,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';
import { ui } from '../ui/styles';
import { OperationalState } from './OperationalState';

export const Cashier: React.FC = () => {
  const { cashierSession, cashierHistory, expenses, orders, tables, theme, currentUser, openCashier, closeCashier, addExpense, updateExpense, deleteExpense, settings, supabaseOnline } = useApp();
  const { log } = useAudit();
  const isDark = theme === 'dark';

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseVal, setExpenseVal] = useState('');
  const [expenseType, setExpenseType] = useState<'saida' | 'entrada'>('saida');

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [copied, setCopied] = useState(false);

  const [tipsTotal, setTipsTotal] = useState('');
  const [countedCash, setCountedCash] = useState('');

  const [initialBalanceInput, setInitialBalanceInput] = useState('');
  const [openingError, setOpeningError] = useState('');
  const [openingPreviewAt] = useState(() => new Date());

  const closedOrders = orders.filter(o => o.status === 'closed');
  const activeOrdersCount = orders.filter(o => o.status === 'open').length;
  const occupiedTablesCount = tables.filter(t => t.status !== 'livre').length;

  const salesToday = closedOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const serviceChargeToday = closedOrders.reduce((acc, o) => acc + o.serviceCharge, 0);

  const paymentTotals = closedOrders.reduce((acc, order) => {
    order.payments?.forEach(p => {
      let group = 'Outro';
      if (p.method === 'dinheiro') group = 'Dinheiro';
      else if (p.method === 'pix') group = 'Pix';
      else if (p.method === 'credito' || p.method === 'debito') group = 'Cartão';

      acc[group] = (acc[group] || 0) + p.amount;
    });
    return acc;
  }, {} as Record<string, number>);
  const hasPayments = Object.keys(paymentTotals).length > 0;

  // Saída subtrai do caixa, entrada soma (suprimento)
  const expensesTotal = expenses.reduce((acc, e) => {
    return e.entryType === 'entrada' ? acc - e.amount : acc + e.amount;
  }, 0);

  const initialBalance = cashierSession?.initialBalance || 0;
  const saldoPrevisto = initialBalance + salesToday + serviceChargeToday - expensesTotal;

  const canCloseCashier = activeOrdersCount === 0 && occupiedTablesCount === 0;

  const handleOpenCashier = () => {
    const normalizedValue = initialBalanceInput.trim().replace(',', '.');
    const val = normalizedValue === '' ? 0 : Number(normalizedValue);
    if (!Number.isFinite(val) || val < 0) {
      setOpeningError('Informe um fundo inicial válido, igual ou maior que zero.');
      return;
    }

    openCashier(val, { id: currentUser.id, name: currentUser.name });
    setInitialBalanceInput('');
    setOpeningError('');
    log('Caixa', 'abertura', { initialBalance: val, operatorId: currentUser.id });
  };

  const handleAddExpense = () => {
    if (editingExpense) {
       const v = parseFloat(expenseVal.replace(',', '.'));
       if (!expenseDesc.trim() || isNaN(v) || v <= 0) return;
       const updated: Expense = { ...editingExpense, description: expenseDesc.trim(), amount: v, entryType: expenseType };
       updateExpense(updated);
       log('Caixa', 'edicao_movimentacao', { expense: updated as unknown as Record<string, unknown> });
       setEditingExpense(null);
       setExpenseDesc('');
       setExpenseVal('');
       setExpenseType('saida');
       return;
    }

    const v = parseFloat(expenseVal.replace(',', '.'));
    if (!expenseDesc.trim() || isNaN(v) || v <= 0) return;

    const newExpense: Expense = {
      id: Date.now().toString(),
      description: expenseDesc.trim(),
      amount: v,
      category: 'Outros',
      status: 'pago',
      timestamp: new Date().toISOString(),
      entryType: expenseType
    };

    addExpense(newExpense);
    log('Caixa', 'movimentacao', { expense: newExpense as unknown as Record<string, unknown> });
    setExpenseDesc('');
    setExpenseVal('');
  };

  const handleEditClick = (e: Expense) => {
    setEditingExpense(e);
    setExpenseDesc(e.description);
    setExpenseVal(e.amount.toString().replace('.', ','));
    setExpenseType(e.entryType || 'saida');
  };

  const handleDeleteConfirm = () => {
    if(!deletingExpense) return;
    deleteExpense(deletingExpense.id);
    log('Caixa', 'exclusao_movimentacao', { expense: deletingExpense as unknown as Record<string, unknown> });
    setDeletingExpense(null);
  };

  const handleCloseCashier = () => {
    if(!canCloseCashier) return;
    const tips = parseFloat(tipsTotal.replace(',', '.')) || 0;
    const counted = countedCash.trim() ? parseFloat(countedCash.replace(',', '.')) : undefined;
    closeCashier(tips, counted);
    log('Caixa', 'fechamento', { tips, counted });
    setTipsTotal('');
    setCountedCash('');
  };

  const handleShareReport = async () => {
    if(!cashierSession) return;
    const report = `*Fechamento de Caixa*
Restaurante: ${settings.establishment.name || 'Gestão Gastro'}
Operador: ${cashierSession.openedByName || 'Não identificado'}
Abertura: ${new Date(cashierSession.openedAt).toLocaleString('pt-BR')}
Agora: ${new Date().toLocaleString('pt-BR')}

*Resumo*
Fundo Inicial: ${formatCurrency(initialBalance)}
Vendas: ${formatCurrency(salesToday)}
Taxas/Serviço: ${formatCurrency(serviceChargeToday)}
Despesas/Sangrias: ${formatCurrency(expenses.filter(e => e.entryType !== 'entrada').reduce((a,b)=>a+b.amount,0))}
Suprimentos: ${formatCurrency(expenses.filter(e => e.entryType === 'entrada').reduce((a,b)=>a+b.amount,0))}
Saldo Previsto: ${formatCurrency(saldoPrevisto)}
Contagem (Declarado): ${countedCash ? formatCurrency(parseFloat(countedCash.replace(',','.'))) : 'Não informado'}

*Formas de Pagamento*
${Object.entries(paymentTotals).map(([method, amount]) => `${method}: ${formatCurrency(amount as number)}`).join('\n') || 'Nenhuma venda fechada'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resumo de Caixa',
          text: report
        });
      } catch (err) {
        console.log('Share cancelado ou falhou');
      }
    } else {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Caixa fechado
  if (!cashierSession) {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-12">
        {!supabaseOnline && (
          <OperationalState
            variant="offline"
            title="Caixa em modo local"
            description="A abertura e as movimentações ficam neste dispositivo até a conexão ser restabelecida."
            compact
          />
        )}
        <div className={`flex flex-col items-center justify-center p-16 rounded-xl border shadow-sm relative overflow-hidden
          ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-200'}`}>
          <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
          <motion.div initial={{ scale: 0.8, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className="w-24 h-24 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center mb-8 shadow-sm"><Lock className="w-10 h-10" /></motion.div>
          <div className="text-center space-y-2 mb-10">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-4xl font-bold tracking-tighter uppercase">Caixa Encerrado</h2>
              <HelpTooltip moduleKey="finance" />
            </div>
            <p className={`text-sm font-medium uppercase tracking-wide opacity-40`}>Aguardando abertura do próximo turno</p>
          </div>

          <div className="w-full max-w-2xl space-y-5" aria-label="Abertura guiada do caixa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-xl border p-4 text-left ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">1. Operador responsável</p>
                <p className="mt-2 text-sm font-bold">{currentUser.name}</p>
              </div>
              <div className={`rounded-xl border p-4 text-left ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">2. Data e hora do turno</p>
                <p className="mt-2 text-sm font-bold">{openingPreviewAt.toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className={`rounded-xl border p-5 text-left ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}>
              <label htmlFor="cashier-initial-balance" className="text-[10px] font-bold uppercase tracking-wide opacity-50">
                3. Fundo inicial da gaveta
              </label>
              <div className="relative mt-3">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm opacity-30">R$</span>
                <input
                  id="cashier-initial-balance"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={initialBalanceInput}
                  onChange={event => {
                    setInitialBalanceInput(event.target.value);
                    if (openingError) setOpeningError('');
                  }}
                  aria-invalid={Boolean(openingError)}
                  aria-describedby="cashier-opening-help cashier-opening-error"
                  className={`min-h-12 w-full rounded-lg border py-3 pl-10 pr-4 outline-none font-bold text-sm ${openingError ? 'border-red-400' : isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-white border-gray-200'}`}
                />
              </div>
              <p id="cashier-opening-help" className="mt-2 text-xs leading-5 opacity-60">
                Informe apenas o dinheiro disponível para troco. Esse valor compõe o saldo esperado, mas não é receita de venda.
              </p>
              {openingError && (
                <p id="cashier-opening-error" role="alert" className="mt-2 text-xs font-semibold text-red-500">
                  {openingError}
                </p>
              )}
            </div>

            <button onClick={handleOpenCashier} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#475569] px-8 py-4 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition-all"><Unlock className="w-4 h-4" /> Abrir caixa e iniciar turno</button>
          </div>
        </div>

        {cashierHistory.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 opacity-40" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Histórico de Fechamento</h3>
            </div>
            <div className={`rounded-xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-150'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className={`text-[9px] font-bold uppercase tracking-wide border-b ${isDark ? 'bg-white/5 border-white/5 text-white/30' : 'bg-gray-50 border-gray-150 text-gray-400'}`}>
                    <tr>
                      <th className="px-8 py-5">Turno</th>
                      <th className="px-8 py-5 text-right">Pedidos</th>
                      <th className="px-8 py-5 text-right">Faturamento</th>
                      <th className="px-8 py-5 text-right">Despesas</th>
                      <th className="px-8 py-5 text-right">Diferença Caixa</th>
                      <th className="px-8 py-5 text-right">Saldo Final</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-[#2C2C2E]' : 'divide-gray-100'}`}>
                    {[...cashierHistory].reverse().map((s, idx) => {
                      const hasDiff = s.cashBreakdown !== undefined;
                      const diffColor = !hasDiff ? 'text-gray-500' : s.cashBreakdown! >= 0 ? 'text-emerald-500' : 'text-red-500';
                      const diffSign = s.cashBreakdown! > 0 ? '+' : '';
                      return (
                        <tr key={idx} className={`transition-colors ${isDark ? 'hover:bg-[#252527]' : 'hover:bg-gray-50/50'}`}>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <Calendar className="w-4 h-4 opacity-40" />
                              </div>
                              <div>
                                <p className="font-bold text-xs">
                                  {new Date(s.openedAt).toLocaleDateString('pt-BR')}{' '}
                                  {new Date(s.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-[10px] font-bold opacity-30">
                                  {s.closedAt ? `Fechado às ${new Date(s.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Em aberto'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right font-bold opacity-60">{s.ordersCount}</td>
                          <td className="px-8 py-6 text-right font-bold text-emerald-500">{formatCurrency(s.salesTotal + s.serviceTaxTotal)}</td>
                          <td className="px-8 py-6 text-right font-bold text-red-500">{formatCurrency(s.expensesTotal)}</td>
                          <td className={`px-8 py-6 text-right font-bold text-xs ${diffColor}`}>
                            {hasDiff ? `${diffSign}${formatCurrency(s.cashBreakdown)}` : 'N/C'}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-xs">
                              {formatCurrency(s.finalBalance ?? 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <OperationalState
            variant="empty"
            title="Nenhum fechamento anterior"
            description="O histórico será exibido depois do primeiro fechamento de caixa."
          />
        )}
      </div>
    );
  }

  // Caixa aberto
  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {!supabaseOnline && (
        <OperationalState
          variant="offline"
          title="Caixa em modo local"
          description="Movimentações ficam neste dispositivo até a conexão ser restabelecida. Confira a conexão antes do fechamento."
          compact
        />
      )}
      <div className="mb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-2xl font-bold uppercase tracking-tighter">Caixa</h2>
          <HelpTooltip moduleKey="finance" />
        </div>
        <p className="mt-1 text-xs opacity-60">
          Turno aberto por <strong>{cashierSession.openedByName || 'operador não identificado'}</strong> em{' '}
          {new Date(cashierSession.openedAt).toLocaleString('pt-BR')}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Fundo Inicial', value: initialBalance, icon: Wallet, color: 'text-slate-500', bg: 'bg-slate-500/10' },
          { label: 'Entradas (Vendas)', value: salesToday + serviceChargeToday, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Saídas (Despesas)', value: expensesTotal > 0 ? expensesTotal : 0, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'Saldo Estimado Caixa', value: saldoPrevisto, icon: Banknote, color: 'text-blue-500', bg: 'bg-blue-500/10' }
        ].map((kpi, i) => (
          <div
            key={i}
            className={`p-6 transition-all hover:border-accent/20 ${ui.panel(isDark)}`}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <div>
              <h3 className={`${ui.eyebrow} mb-1`}>{kpi.label}</h3>
              <p className="text-2xl font-bold tracking-tight">{formatCurrency(kpi.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={`lg:col-span-8 p-10 rounded-xl border shadow-sm flex flex-col ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-center mb-10"><h2 className="text-2xl font-bold uppercase tracking-tighter">Movimentação Detalhada</h2><div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-wide"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Ao vivo</div></div>
          <div className="space-y-6 flex-1">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className={`p-6 rounded-lg border ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50/50 border-gray-100'}`}><div className="flex items-center gap-3 mb-4 opacity-40"><CreditCard className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wide">Vendas de Balcão</span></div><p className="text-2xl font-bold tracking-tight text-emerald-500">{formatCurrency(salesToday)}</p></div>
               <div className={`p-6 rounded-lg border ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50/50 border-gray-100'}`}><div className="flex items-center gap-3 mb-4 opacity-40"><Receipt className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-wide">Serviço & Taxas</span></div><p className="text-2xl font-bold tracking-tight text-emerald-500">{formatCurrency(serviceChargeToday)}</p></div>
             </div>
             <div className="pt-8 border-t border-dashed border-current/10">
               <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-40 mb-6">Suprimentos e Sangrias <HelpTooltip content="Use Sangria para registrar retiradas de dinheiro em espécie da gaveta (ex: pagamento de fornecedor). Use Suprimento para registrar adição de troco no meio do expediente." /></h3>
               {expenses.length === 0 ? (
                 <OperationalState
                   variant="empty"
                   title="Nenhuma movimentação avulsa"
                   description="Suprimentos, sangrias e despesas deste turno aparecerão aqui."
                   compact
                 />
               ) : (
                 <div className="space-y-3">
                   {expenses.map(e => {
                     const isEntrada = e.entryType === 'entrada';
                     const ColorIcon = isEntrada ? TrendingUp : TrendingDown;
                     const colorClass = isEntrada ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10';
                     const textClass = isEntrada ? 'text-emerald-500' : 'text-red-500';
                     return (
                       <div key={e.id} className={`flex items-center justify-between p-5 rounded-lg group ${isDark ? 'bg-[#121214]' : 'bg-gray-50'}`}>
                         <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}><ColorIcon className="w-5 h-5" /></div>
                           <div>
                             <p className="font-bold uppercase text-xs">{e.description}</p>
                             <p className="text-[10px] font-bold opacity-30">{new Date(e.timestamp).toLocaleTimeString('pt-BR')} • {isEntrada ? 'Suprimento' : 'Sangria/Despesa'}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className={`font-bold ${textClass}`}>{isEntrada ? '+' : '-'} {formatCurrency(e.amount)}</span>
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEditClick(e)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => setDeletingExpense(e)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className={`p-8 rounded-xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
            <h3 className="text-sm font-bold uppercase tracking-wide mb-6 opacity-40">{editingExpense ? 'Editar Movimentação' : 'Registrar Movimentação'}</h3>
            <div className="space-y-4">
              <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                <button
                  onClick={() => setExpenseType('saida')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${expenseType === 'saida' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Saída / Sangria
                </button>
                <button
                  onClick={() => setExpenseType('entrada')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${expenseType === 'entrada' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  Entrada / Suprimento
                </button>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wide opacity-30 ml-2">Descrição</label><input type="text" placeholder={expenseType === 'saida' ? "Ex: Pagamento Gelo" : "Ex: Troco extra"} value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`} /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-wide opacity-30 ml-2">Valor</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm opacity-20">R$</span><input type="text" placeholder="0,00" value={expenseVal} onChange={e => setExpenseVal(e.target.value)} className={`w-full pl-10 pr-4 py-4 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`} /></div></div>
              <button onClick={handleAddExpense} className={`w-full py-4 text-white rounded-lg font-bold uppercase tracking-wide text-[10px] shadow-sm transition-all ${expenseType === 'saida' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {editingExpense ? 'Salvar movimentação' : 'Registrar movimentação'}
              </button>
              {editingExpense && (
                <button onClick={() => { setEditingExpense(null); setExpenseDesc(''); setExpenseVal(''); setExpenseType('saida'); }} className={`w-full py-3 font-bold text-xs uppercase tracking-wide rounded-lg transition-colors ${isDark ? 'bg-[#2C2C2E] hover:bg-[#3C3C3E]' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar Edição</button>
              )}
            </div>
          </div>

          <div className={`p-8 rounded-xl border shadow-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wide opacity-40">Formas de Pagamento</h3>
            </div>
            {!hasPayments ? (
              <p className="text-[11px] font-medium opacity-40 text-center py-4">Nenhum pagamento registrado neste turno.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(paymentTotals).map(([method, amount]) => (
                  <div key={method} className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase opacity-60">{method}</span>
                    <span className="text-sm font-bold">{formatCurrency(amount as number)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`p-8 rounded-xl border shadow-sm relative overflow-hidden transition-all ${!canCloseCashier ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wide mb-6 ${!canCloseCashier ? 'text-amber-500' : 'text-red-500'}`}>
              Encerramento
              <HelpTooltip id="help-fechamento-caixa" content="Dica: Faça a contagem 'cega'. Some todo o dinheiro físico na gaveta e digite o valor real. O sistema vai comparar o esperado com o digitado e acusar sobras ou faltas." anchorId="guide_caixa" />
            </h3>

            {!canCloseCashier ? (
              <div className="p-5 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6 space-y-3 animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-2 text-amber-500 font-bold uppercase text-[10px]"><AlertTriangle className="w-4 h-4" /> Salão Ocupado</div>
                 <p className="text-[10px] font-bold opacity-60 leading-relaxed">Você possui **{occupiedTablesCount} mesas** ou **{activeOrdersCount} pedidos** em aberto. Feche todas as comandas antes de encerrar o caixa.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Gorjetas em Espécie</label>
                  <input type="text" placeholder="R$ 0,00" value={tipsTotal} onChange={e => setTipsTotal(e.target.value)} className={`w-full p-4 rounded-lg border border-red-500/20 outline-none font-bold text-sm ${isDark ? 'bg-black/20' : 'bg-white'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Contagem Declarada (Opcional)</label>
                  <input type="text" placeholder="R$ 0,00" value={countedCash} onChange={e => setCountedCash(e.target.value)} className={`w-full p-4 rounded-lg border border-red-500/20 outline-none font-bold text-sm ${isDark ? 'bg-black/20' : 'bg-white'}`} />
                  <div className="flex justify-between items-center ml-2 mt-1">
                    <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Compara com o saldo estimado ({formatCurrency(saldoPrevisto)})</p>
                    {countedCash.trim() && !isNaN(parseFloat(countedCash.replace(',','.'))) && (
                      <span className={`text-[9px] font-bold uppercase ${parseFloat(countedCash.replace(',','.')) - saldoPrevisto === 0 ? 'text-emerald-500' : parseFloat(countedCash.replace(',','.')) - saldoPrevisto > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {parseFloat(countedCash.replace(',','.')) - saldoPrevisto === 0 ? 'Caixa conferido' : parseFloat(countedCash.replace(',','.')) - saldoPrevisto > 0 ? `Sobra de ${formatCurrency(parseFloat(countedCash.replace(',','.')) - saldoPrevisto)}` : `Falta de ${formatCurrency(Math.abs(parseFloat(countedCash.replace(',','.')) - saldoPrevisto))}`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={handleShareReport} className={`w-full py-3 rounded-lg font-bold uppercase tracking-wide text-[10px] flex items-center justify-center gap-2 border transition-all mt-6 ${isDark ? 'border-[#2C2C2E] hover:bg-white/5 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                  {copied ? <><Check className="w-4 h-4 text-emerald-500" /> Resumo Copiado</> : <><Share2 className="w-4 h-4" /> Compartilhar Fechamento</>}
                </button>
                <button onClick={handleCloseCashier} className="w-full py-5 bg-red-500 text-white rounded-lg font-bold uppercase tracking-wide text-[11px] shadow-sm transition-all mt-2">Fechar caixa</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deletingExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white border border-gray-100'}`}>
              <div className="p-6">
                <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4"><Trash2 className="w-6 h-6" /></div>
                <h3 className="text-lg font-bold tracking-tight mb-2">Excluir Movimentação</h3>
                <p className="text-sm opacity-60 mb-6">Deseja remover esta movimentação do caixa? O saldo será recalculado imediatamente.</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDeletingExpense(null)} className={`flex-1 py-3 font-bold text-xs uppercase tracking-wide rounded-lg transition-colors ${isDark ? 'bg-[#2C2C2E] hover:bg-[#3C3C3E]' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
                  <button onClick={handleDeleteConfirm} className="flex-1 py-3 font-bold text-xs uppercase tracking-wide rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Excluir</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
