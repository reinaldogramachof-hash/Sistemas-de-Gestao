import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Search, Plus, UserPlus, Mail, Phone, MapPin, Edit3, Trash2, MoreVertical, Filter, ChevronRight, User, Star, Zap, Clock, MessageCircle, X, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ui } from '../ui/styles';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  lastVisit: string;
  loyaltyPoints: number;
}

export const Customers: React.FC = () => {
  const { theme, customers, deleteCustomer, addCustomer, updateCustomer } = useApp();
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('viewMode_customers') as any) || 'list');

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('viewMode_customers', mode);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const handleOpenModal = (customer?: any) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ name: customer.name, email: customer.email, phone: customer.phone });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', email: '', phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      updateCustomer({ ...editingCustomer, ...formData });
    } else {
      addCustomer({
        id: Date.now().toString(),
        ...formData,
        totalSpent: 0,
        loyaltyPoints: 0,
        lastVisit: new Date().toISOString()
      });
    }
    setIsModalOpen(false);
  };

  const stats = [
    { label: 'Total Clientes', value: customers.length, icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'VIPs (R$ 1.5k+)', value: customers.filter(c => (c.totalSpent || 0) >= 1500).length, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Frequentes', value: customers.filter(c => (c.loyaltyPoints || 0) >= 100).length, icon: Zap, color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { label: 'Inativos', value: customers.filter(c => {
      if (!c.lastVisit) return false;
      const last = new Date(c.lastVisit);
      const diff = (new Date().getTime() - last.getTime()) / (1000 * 3600 * 24);
      return diff > 30;
    }).length, icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  const getTags = (c: any) => {
    if (!c) return [];
    const tags = [];
    if ((c.totalSpent || 0) >= 1500) tags.push({ label: 'VIP', color: 'bg-amber-500/10 text-amber-500' });
    if ((c.loyaltyPoints || 0) >= 100) tags.push({ label: 'Frequente', color: 'bg-slate-500/10 text-slate-500' });

    if (c.lastVisit) {
      const last = new Date(c.lastVisit);
      const diff = (new Date().getTime() - last.getTime()) / (1000 * 3600 * 24);
      if (diff > 30) tags.push({ label: 'Inativo', color: 'bg-red-500/10 text-red-500' });
      else if (diff <= 7) tags.push({ label: 'Ativo', color: 'bg-emerald-500/10 text-emerald-500' });
    }

    return tags;
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'todos') return true;

    const spent = Number(c.totalSpent || 0);
    const points = Number(c.loyaltyPoints || 0);

    if (activeFilter === 'vips') return spent >= 1500;
    if (activeFilter === 'frequentes') return points >= 100;
    if (activeFilter === 'inativos') {
      if (!c.lastVisit) return false;
      const last = new Date(c.lastVisit);
      const diff = (new Date().getTime() - last.getTime()) / (1000 * 3600 * 24);
      return diff > 30;
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-full gap-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
      <div className="space-y-1">
          <h2 className={ui.pageTitle}>Gestao de Clientes</h2>
          <p className={ui.pageSubtitle}>CRM e Fidelizacao de Publico</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="flex p-1 gap-1 rounded-xl bg-black/5 dark:bg-white/5 border border-current/5 mr-2">
            <button onClick={() => toggleViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#475569]' : 'opacity-40 hover:opacity-100'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => toggleViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#475569]' : 'opacity-40 hover:opacity-100'}`}><List className="w-4 h-4" /></button>
          </div>
          <div className={`flex items-center px-4 py-2.5 rounded-lg border flex-1 lg:w-80 transition-all focus-within:ring-4 focus-within:ring-[#475569]/10 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] focus-within:border-[#475569]/40' : 'bg-white border-gray-200 focus-within:border-slate-300 shadow-sm'}`}>
            <Search className="w-4 h-4 mr-3 opacity-40" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar por nome ou telefone..." className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:opacity-30" />
          </div>
          <button onClick={() => handleOpenModal()} className={`px-6 py-2.5 ${ui.primaryButton} flex items-center justify-center gap-2 text-[10px]`}>
            <UserPlus className="w-4 h-4" /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <button
            key={i}
            onClick={() => {
              const filterMap: any = { 'Total Clientes': 'todos', 'VIPs (R$ 1.5k+)': 'vips', 'Frequentes': 'frequentes', 'Inativos': 'inativos' };
              setActiveFilter(filterMap[s.label]);
            }}
            className={`p-6 rounded-lg border text-left transition-all  active:scale-[0.98] ${activeFilter === (['todos', 'vips', 'frequentes', 'inativos'][i]) ? 'ring-2 ring-[#475569]/20 border-[#475569]/30' : ''} ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">{s.label}</p>
                <p className="text-2xl font-black tracking-tighter">{s.value}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className={`${ui.tabShell(isDark)} w-fit overflow-x-auto scrollbar-none`}>
        {['todos', 'vips', 'frequentes', 'inativos'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-6 py-2.5 ${ui.tab(activeFilter === f, isDark)}`}
          >
            {f}
          </button>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCustomers.map(customer => (
          <motion.div
            key={customer.id}
            layout
            className={`p-8 rounded-lg border transition-all duration-300 group hover:border-[#475569]/30 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl relative ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <User className="w-6 h-6 opacity-40" />
                {customer.totalSpent >= 2000 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-white shadow-lg border-2 border-white dark:border-[#1C1C1E]">
                    <Star className="w-3 h-3 fill-white" />
                  </div>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                 <button onClick={() => handleOpenModal(customer)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit3 className="w-4 h-4 opacity-40" /></button>
                 <button onClick={() => deleteCustomer(customer.id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                 <a href={`https://wa.me/${customer.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"><MessageCircle className="w-4 h-4" /></a>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black tracking-tighter truncate leading-tight">{customer.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {getTags(customer).map((tag: any, idx: number) => (
                    <span key={idx} className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${tag.color}`}>{tag.label}</span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3 opacity-40"><Phone className="w-3.5 h-3.5" /><span className="text-[10px] font-bold">{customer.phone}</span></div>
                <div className="flex items-center gap-3 opacity-40"><Mail className="w-3.5 h-3.5" /><span className="text-[10px] font-bold truncate">{customer.email}</span></div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-current/10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">Total Gasto</p>
                <p className="text-xl font-black text-[#475569] tracking-tighter">R$ {customer.totalSpent.toFixed(0)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">Fidelidade</p>
                <p className="text-xl font-black tracking-tighter">{customer.loyaltyPoints} <span className="text-[10px] opacity-30">pts</span></p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest opacity-20">
               <span>Última visita</span>
               <span>{customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('pt-BR') : 'Sem visitas'}</span>
            </div>
          </motion.div>
        ))}
        </div>
      ) : (
        <div className={`rounded-lg border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[9px] uppercase font-black tracking-widest border-b ${isDark ? 'bg-white/5 border-white/5 text-white/30' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                  <th className="px-8 py-5">Cliente</th>
                  <th className="px-8 py-5">Contatos</th>
                  <th className="px-8 py-5">Tags</th>
                  <th className="px-8 py-5 text-right">Fidelidade</th>
                  <th className="px-8 py-5 text-right">Gasto Total</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/[0.03]">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="group hover:bg-current/[0.01] transition-all">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <User className="w-5 h-5 opacity-20" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold opacity-50">{customer.phone}</span>
                          <span className="text-[9px] font-bold opacity-30">{customer.email}</span>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex gap-1">
                         {getTags(customer).slice(0, 2).map((tag: any, idx: number) => (
                           <span key={idx} className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${tag.color}`}>{tag.label}</span>
                         ))}
                       </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <span className="text-[11px] font-black opacity-60 tracking-tighter">{customer.loyaltyPoints} pts</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <span className="text-[11px] font-black text-[#475569] tracking-tighter">R$ {customer.totalSpent.toFixed(0)}</span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                         <button onClick={() => handleOpenModal(customer)} className={`p-2 rounded-lg transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit3 className="w-3.5 h-3.5 opacity-40" /></button>
                         <button onClick={() => deleteCustomer(customer.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                         <a href={`https://wa.me/${customer.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"><MessageCircle className="w-3.5 h-3.5" /></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-lg p-8 rounded-xl shadow-sm ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white border border-gray-100'}`}>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tighter uppercase">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-current/5 opacity-40"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Nome Completo</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Telefone</label>
                    <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">E-mail</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-4 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-[#475569] text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#475569]/20  active:scale-95 transition-all">{editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
