import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';
import { ui } from '../ui/styles';

export const Cashier: React.FC = () => {
  const { cashierSession, cashierHistory, expenses, orders, tables, theme, openCashier, closeCashier, addExpense } = useApp();
  const isDark = theme === 'dark';

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseVal, setExpenseVal] = useState('');
  const [expenseType, setExpenseType] = useState<'saida' | 'entrada'>('saida');

  const [tipsTotal, setTipsTotal] = useState('');
  const [countedCash, setCountedCash] = useState('');

  const [initialBalanceInput, setInitialBalanceInput] = useState('');

  const closedOrders = orders.filter(o => o.status === 'closed');
  const activeOrdersCount = orders.filter(o => o.status === 'open').length;
  const occupiedTablesCount = tables.filter(t => t.status !== 'livre').length;

  const salesToday = closedOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const serviceChargeToday = closedOrders.reduce((acc, o) => acc + o.serviceCharge, 0);

  // Saída subtrai do caixa, entrada soma (suprimento)
  const expensesTotal = expenses.reduce((acc, e) => {
    return e.entryType === 'entrada' ? acc - e.amount : acc + e.amount;
  }, 0);

  const initialBalance = cashierSession?.initialBalance || 0;
  const saldoPrevisto = initialBalance + salesToday + serviceChargeToday - expensesTotal;

  const canCloseCashier = activeOrdersCount === 0 && occupiedTablesCount === 0;

  const handleOpenCashier = () => {
    const val = parseFloat(initialBalanceInput.replace(',', '.')) || 0;
    openCashier(val);
    setInitialBalanceInput('');
  };

  const handleAddExpense = () => {
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
    setExpenseDesc('');
    setExpenseVal('');
  };

  const handleCloseCashier = () => {
    if(!canCloseCashier) return;
    const tips = parseFloat(tipsTotal.replace(',', '.')) || 0;
    const counted = countedCash.trim() ? parseFloat(countedCash.replace(',', '.')) : undefined;
    closeCashier(tips, counted);
    setTipsTotal('');
    setCountedCash('');
  };

  // Caixa fechado
  if (!cashierSession) {
    return (
      <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-200">
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

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm mx-auto">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-sm opacity-30">R$</span>
              <input
                type="text"
                placeholder="Fundo Inicial (0,00)"
                value={initialBalanceInput}
                onChange={e => setInitialBalanceInput(e.target.value)}
                className={`w-full pl-10 pr-4 py-4 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-[#121214] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}
              />
            </div>
            <button onClick={handleOpenCashier} className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#475569] text-white rounded-lg font-bold uppercase tracking-wide text-[11px] shadow-sm transition-all whitespace-nowrap"><Unlock className="w-4 h-4" /> Abrir Turno</button>
          </div>
        </div>

        {cashierHistory.length > 0 && (
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
        )}
      </div>
    );
  }

  // Caixa aberto
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center gap-1.5 mb-2">
        <h2 className="text-2xl font-bold uppercase tracking-tighter">Caixa e Finanças</h2>
        <HelpTooltip moduleKey="finance" />
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
               <h3 className="text-[10px] font-bold uppercase tracking-wide opacity-40 mb-6">Suprimentos e Sangrias</h3>
               {expenses.length === 0 ? (<div className="py-10 text-center opacity-20  text-sm">Nenhuma movimentação avulsa registrada hoje.</div>) : (
                 <div className="space-y-3">
                   {expenses.map(e => {
                     const isEntrada = e.entryType === 'entrada';
                     const ColorIcon = isEntrada ? TrendingUp : TrendingDown;
                     const colorClass = isEntrada ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10';
                     const textClass = isEntrada ? 'text-emerald-500' : 'text-red-500';
                     return (
                       <div key={e.id} className={`flex items-center justify-between p-5 rounded-lg ${isDark ? 'bg-[#121214]' : 'bg-gray-50'}`}>
                         <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}><ColorIcon className="w-5 h-5" /></div>
                           <div>
                             <p className="font-bold uppercase text-xs">{e.description}</p>
                             <p className="text-[10px] font-bold opacity-30">{new Date(e.timestamp).toLocaleTimeString('pt-BR')} • {isEntrada ? 'Suprimento' : 'Sangria/Despesa'}</p>
                           </div>
                         </div>
                         <span className={`font-bold ${textClass}`}>{isEntrada ? '+' : '-'} {formatCurrency(e.amount)}</span>
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
            <h3 className="text-sm font-bold uppercase tracking-wide mb-6 opacity-40">Registrar Movimentação</h3>
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
              <button onClick={handleAddExpense} className={`w-full py-4 text-white rounded-lg font-bold uppercase tracking-wide text-[10px] shadow-sm transition-all ${expenseType === 'saida' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>Confirmar Movimentação</button>
            </div>
          </div>

          <div className={`p-8 rounded-xl border shadow-sm relative overflow-hidden transition-all ${!canCloseCashier ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wide mb-6 ${!canCloseCashier ? 'text-amber-500' : 'text-red-500'}`}>
              Encerramento
              <HelpTooltip id="help-fechamento-caixa" content="O fechamento de caixa encerra a sessão diária consolidando vendas, sangrias e declarando o saldo real." anchorId="fechamento-caixa" />
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
                  <p className="text-[9px] font-bold opacity-30 ml-2 mt-1 uppercase tracking-wide">Compara com o saldo estimado ({formatCurrency(saldoPrevisto)})</p>
                </div>
                <button onClick={handleCloseCashier} className="w-full py-5 bg-red-500 text-white rounded-lg font-bold uppercase tracking-wide text-[11px] shadow-sm transition-all mt-4">Fechar Caixa Agora</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
