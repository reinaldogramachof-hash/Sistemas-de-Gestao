import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { OrderModal } from './OrderModal';
import {
  Users,
  Clock,
  Search,
  CheckCircle2,
  CalendarCheck,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ui } from '../ui/styles';
import { HelpTooltip } from './HelpTooltip';
import { OperationalState } from './OperationalState';
import { listOpenComandasForTable } from '../utils/multipleComandas';

const TableTimer: React.FC<{ timestamp: string; isDark: boolean; status: string }> = ({ timestamp, isDark, status }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const diffMin = Math.floor((now - new Date(timestamp).getTime()) / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const color = status === 'ocupada' ? 'text-slate-700 dark:text-slate-200' : 'text-amber-600';

  return (
    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
      <Clock className={`w-3 h-3 ${color} opacity-60`} />
      <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${color}`}>
        {timeStr}
      </span>
    </div>
  );
};

export const Tables: React.FC = () => {
  const { tables, theme, orders, reserveTable, clearTable, supabaseOnline } = useApp();
  const isDark = theme === 'dark';
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'livre' | 'ocupada' | 'aguardando' | 'reservada'>('todos');
  const [sectorFilter, setSectorFilter] = useState<string>('todos');

  const sectors = Array.from(new Set(tables.map(t => t.sector).filter(Boolean))) as string[];

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedForReservation, setSelectedForReservation] = useState<number[]>([]);
  const [reservationReason, setReservationReason] = useState('');

  const closedOrders = orders.filter(o => o.status === 'closed');
  const salesToday = closedOrders.reduce((acc, o) => acc + o.total, 0);

  const computedTables = tables.map(t => {
    let visualStatus = t.status;
    if (visualStatus === 'ocupada') {
      const tableOrders = listOpenComandasForTable(orders, t.number);
      if (tableOrders.some(order => order.items.some(
        item => item.kitchenStatus === 'aguardando' || item.kitchenStatus === 'preparo',
      ))) {
        visualStatus = 'aguardando';
      }
    }
    return { ...t, visualStatus };
  });

  const occupiedCount = computedTables.filter(t => t.visualStatus === 'ocupada').length;
  const waitingCount = computedTables.filter(t => t.visualStatus === 'aguardando').length;
  const reservedCount = computedTables.filter(t => t.visualStatus === 'reservada').length;
  const occupancyPercentage = tables.length > 0
    ? Math.round(((occupiedCount + waitingCount) / tables.length) * 100)
    : 0;

  const filteredTables = computedTables.filter(t => {
    const matchesSearch = t.number.toString().includes(searchTerm);
    const matchesFilter = filter === 'todos' || t.visualStatus === filter;
    const matchesSector = sectorFilter === 'todos' || t.sector === sectorFilter;
    return matchesSearch && matchesFilter && matchesSector;
  });

  const handleTableClick = (num: number) => {
    if (isSelecting) {
      const table = tables.find(t => t.number === num);
      if (table?.status !== 'livre') return;
      setSelectedForReservation(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
    } else {
      setSelectedTable(num);
    }
  };

  const handleConfirmReservation = () => {
    reserveTable(selectedForReservation, reservationReason || 'Reserva de Mesa');
    setIsSelecting(false);
    setSelectedForReservation([]);
    setReservationReason('');
  };

  return (
    <div className="flex flex-col h-full gap-8 animate-in fade-in duration-200">
      {!supabaseOnline && (
        <OperationalState
          variant="offline"
          title="Mesas em modo local"
          description="Alterações ficam neste dispositivo até a conexão ser restabelecida. Evite operar a mesma mesa em outro terminal."
          compact
        />
      )}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h2 className={ui.pageTitle}>Mesas</h2>
              <HelpTooltip moduleKey="tables" />
            </div>
            <p className={ui.pageSubtitle}>Mapa e gestão do salão</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 lg:max-w-3xl">
            <StatCard label="Ocupação" value={`${occupiedCount}/${tables.length}`} subValue={`${occupancyPercentage}%`} icon={Users} color="emerald" isDark={isDark} />
            <StatCard label="Aguardando" value={waitingCount.toString()} subValue="Pedidos" icon={Clock} color="amber" isDark={isDark} />
            <StatCard label="Reservas" value={reservedCount.toString()} subValue="Bloqueadas" icon={CalendarCheck} color="purple" isDark={isDark} />
            <StatCard label="Vendas" value={`R$ ${salesToday.toFixed(0)}`} subValue="Hoje" icon={CheckCircle2} color="rose" isDark={isDark} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-6 border-t border-current/5">
          <div className="flex flex-col gap-3 w-full lg:w-fit">
            <div className={`${ui.tabShell(isDark)} w-full overflow-x-auto scrollbar-none`}>
              {['todos', 'livre', 'ocupada', 'aguardando', 'reservada'].map((f) => (
                <button key={f} onClick={() => setFilter(f as any)} className={`flex-1 lg:flex-none px-5 py-2.5 capitalize ${ui.tab(filter === f, isDark)}`}>{f}</button>
              ))}
            </div>

            {sectors.length > 0 && (
              <div className={`${ui.tabShell(isDark)} w-full overflow-x-auto scrollbar-none`}>
                {['todos', ...sectors].map((s) => (
                  <button key={s} onClick={() => setSectorFilter(s)} className={`flex-1 lg:flex-none px-5 py-2.5 capitalize ${ui.tab(sectorFilter === s, isDark)}`}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <div className={`flex items-center px-4 py-2.5 flex-1 lg:w-64 ${ui.input(isDark)}`}>
              <Search className="w-4 h-4 mr-3 opacity-40" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar mesa..." className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:opacity-30" />
            </div>
            <button onClick={() => { setIsSelecting(!isSelecting); setSelectedForReservation([]); }} className={`px-5 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-2 border transition-all ${isSelecting ? 'bg-red-600 text-white border-red-600' : isDark ? 'bg-[#252527] text-slate-100 border-[#3A3A3C]' : 'bg-white text-slate-700 border-slate-300 shadow-sm'}`}>
              {isSelecting ? <X className="w-4 h-4 stroke-[3px]" /> : <CalendarCheck className="w-4 h-4 stroke-[3px]" />}
              {isSelecting ? 'Cancelar' : 'Reservar'}
            </button>
          </div>
        </div>
      </div>

      {filteredTables.length === 0 ? (
        <OperationalState
          variant="empty"
          title={tables.length === 0 ? 'Nenhuma mesa configurada' : 'Nenhuma mesa encontrada'}
          description={tables.length === 0
            ? 'Configure as mesas do salão antes de iniciar o atendimento.'
            : 'Ajuste a busca, o setor ou o filtro de situação para continuar.'}
        />
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTables.map(table => {
            const isLivre = table.visualStatus === 'livre';
            const isOcupada = table.visualStatus === 'ocupada';
            const isAguardando = table.visualStatus === 'aguardando';
            const isReservada = table.visualStatus === 'reservada';
            const isSelected = selectedForReservation.includes(table.number);

            const tableOrders = listOpenComandasForTable(orders, table.number);
            const orderTimestamp = tableOrders[0]?.timestamp ?? '';
            const orderSubtotal = tableOrders.reduce((sum, order) => sum + order.subtotal, 0);

            return (
              <motion.div
                layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                key={table.number}
                className="relative"
              >
                <button
                  onClick={() => handleTableClick(table.number)}
                  disabled={isSelecting && !isLivre && !isSelected}
                  aria-label={`Mesa ${table.number}, ${tableOrders.length} contas abertas`}
                  className={`relative w-full aspect-[1/0.86] flex flex-col items-center justify-center rounded-lg transition-colors duration-200 overflow-hidden
                    ${isDark ? 'bg-[#1C1C1E]' : 'bg-white shadow-sm border border-gray-100'}
                    ${isLivre ? `border-dashed hover:border-slate-400` : ''}
                    ${isOcupada ? 'border-2 border-slate-700 dark:border-slate-300 z-10 shadow-sm' : ''}
                    ${isAguardando ? 'border-2 border-amber-500' : ''}
                    ${isReservada ? 'border-2 border-slate-400' : ''}
                    ${isSelected ? 'ring-2 ring-slate-400 border-2 border-slate-600 z-20 shadow-sm' : ''}
                    ${isSelecting && !isLivre && !isSelected ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className={`text-4xl font-bold mb-2 tracking-tight
                    ${isDark ? 'text-white' : 'text-[#1A1A2E]'}`}>
                    {table.number.toString().padStart(2, '0')}
                  </span>

                  {(isOcupada || isAguardando) && orderTimestamp && (
                    <div className="flex flex-col items-center gap-1">
                      <TableTimer timestamp={orderTimestamp} isDark={isDark} status={table.visualStatus} />
                      <span className="text-[9px] font-bold uppercase tracking-wide opacity-60">
                        {tableOrders.length} {tableOrders.length === 1 ? 'conta' : 'contas'}
                      </span>
                      <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderSubtotal)}
                      </span>
                    </div>
                  )}

                  {isReservada && (
                    <div className="flex flex-col items-center text-slate-500 max-w-[80%] text-center">
                      <CalendarCheck className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-tight truncate w-full">{table.reservationReason}</span>
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute inset-0 bg-slate-500/10 flex items-center justify-center">
                      <Check className="w-10 h-10 text-slate-600 stroke-[4px]" />
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}

      <AnimatePresence>
        {isSelecting && selectedForReservation.length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-xl px-4">
            <div className={`p-5 flex items-center gap-6 ${ui.panel(isDark)}`}>
              <div className="flex-1 pl-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-accent mb-1">{selectedForReservation.length} Mesas Selecionadas</p>
                <input autoFocus value={reservationReason} onChange={e => setReservationReason(e.target.value)} placeholder="Motivo da reserva..." className="bg-transparent border-none outline-none w-full font-bold text-sm placeholder:opacity-20" />
              </div>
              <button onClick={handleConfirmReservation} className="px-6 py-3 bg-slate-700 text-white rounded-lg font-bold uppercase tracking-wide text-[11px] shadow-sm transition-all">Confirmar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTable !== null && (
        <OrderModal tableNumber={selectedTable} mode="mesa" onClose={() => setSelectedTable(null)} />
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  subValue: string;
  icon: React.ElementType;
  color: 'emerald' | 'amber' | 'blue' | 'rose' | 'purple';
  isDark: boolean;
}

const StatCard = ({ label, value, subValue, icon: Icon, color, isDark }: StatCardProps) => {
  const colors = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    rose: 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-200 dark:bg-white/5 dark:border-white/10',
    purple: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  }[color as 'emerald' | 'amber' | 'blue' | 'rose' | 'purple'];

  return (
    <div className={`p-5 transition-all ${ui.panel(isDark)}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl border ${colors}`}><Icon className="w-4 h-4" /></div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-wide opacity-40 mb-1">{label}</p>
          <p className="text-2xl font-bold tracking-tighter">{value}</p>
        </div>
      </div>
      <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">{subValue}</p>
    </div>
  );
};
