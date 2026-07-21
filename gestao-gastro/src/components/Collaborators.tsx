import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { useAudit } from '../hooks/useAudit';
import { HelpTooltip } from './HelpTooltip';
import { Search, UserPlus, Shield, Briefcase, Calendar, Edit3, Trash2, CheckCircle2, XCircle, User, Clock, Zap, X, LayoutGrid, List, LogIn, LogOut, FileText, Banknote, CreditCard, MapPin, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';



export const Collaborators: React.FC = () => {
  const { theme, collaborators, deleteCollaborator, addCollaborator, updateCollaborator } = useApp();
  const { log } = useAudit();
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('viewMode_collaborators') as any) || 'list');

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('viewMode_collaborators', mode);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'trabalhista'>('geral');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    permissions: 'waiter' as any,
    status: 'active' as any,
    observations: '',
    contractType: 'CLT' as any,
    salary: 0,
    commissionRate: 0,
    document: '',
    address: '',
    bankDetails: ''
  });

  const stats = [
    { label: 'Equipe Total', value: collaborators.length, icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Em Serviço', value: collaborators.filter(c => c.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Em Pausa', value: collaborators.filter(c => c.status === 'break').length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Top Vendas', value: collaborators.reduce((max, c) => Math.max(max, c.totalSales || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Zap, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  ];

  const handleOpenModal = (member?: any) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name || '',
        email: member.email || '',
        role: member.role || '',
        permissions: member.permissions || 'waiter',
        status: member.status || 'active',
        observations: member.observations || '',
        contractType: member.contractType || 'CLT',
        salary: member.salary || 0,
        commissionRate: member.commissionRate || 0,
        document: member.document || '',
        address: member.address || '',
        bankDetails: member.bankDetails || ''
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        email: '',
        role: '',
        permissions: 'waiter',
        status: 'active',
        observations: '',
        contractType: 'CLT',
        salary: 0,
        commissionRate: 0,
        document: '',
        address: '',
        bankDetails: ''
      });
    }
    setActiveTab('geral');
    setIsModalOpen(true);
  };


  const handleToggleStatus = (member: any) => {
    const isActive = member.status === 'active';
    const newStatus = isActive ? 'inactive' : 'active';
    updateCollaborator({
      ...member,
      status: newStatus,
      lastCheckIn: !isActive ? new Date().toISOString() : member.lastCheckIn,
      lastCheckOut: isActive ? new Date().toISOString() : member.lastCheckOut
    });
    log('collaborator_status', `Status do colaborador "${member.name}" alterado para ${newStatus}`, { name: member.name, newStatus });
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateCollaborator({ ...editingMember, ...formData });
      log('collaborator_update', `Dados do colaborador "${formData.name}" atualizados`, { name: formData.name, role: formData.role, permissions: formData.permissions });
    } else {
      addCollaborator({
        id: Date.now().toString(),
        ...formData,
        joinedAt: new Date().toISOString(),
        totalSales: 0
      });
      log('collaborator_add', `Novo colaborador "${formData.name}" (${formData.role || formData.permissions}) cadastrado`, { name: formData.name, role: formData.role, permissions: formData.permissions });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-full gap-8 animate-in fade-in duration-700 pb-12">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-3xl font-extrabold tracking-tighter uppercase leading-none">Gestão de Equipe</h2>
            <HelpTooltip moduleKey="waiters" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">RH e Controle de Operações</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="flex-shrink-0 flex p-1 gap-1 rounded-xl bg-black/5 dark:bg-white/5 border border-current/5 mr-2">
            <button onClick={() => toggleViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#475569]' : 'opacity-40 hover:opacity-100'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => toggleViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#475569]' : 'opacity-40 hover:opacity-100'}`}><List className="w-4 h-4" /></button>
          </div>
          <div className={`flex items-center px-4 py-2.5 rounded-lg border flex-1 lg:w-80 transition-all focus-within:ring-4 focus-within:ring-[#475569]/10 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] focus-within:border-[#475569]/40' : 'bg-white border-gray-200 focus-within:border-slate-300 shadow-sm'}`}>
            <Search className="w-4 h-4 mr-3 opacity-40" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar por nome ou cargo..." className="bg-transparent border-none outline-none w-full text-sm font-semibold placeholder:opacity-30" />
          </div>
          <button onClick={() => handleOpenModal()} className="px-6 py-2.5 bg-[#475569] text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#475569]/20 flex items-center justify-center gap-2  active:scale-[0.98] transition-all">
            <UserPlus className="w-4 h-4" /> Novo Membro
          </button>
        </div>
      </div>

      {/* Staff Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className={`p-6 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">{s.label}</p>
                <p className="text-2xl font-black tracking-tighter">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collaborators.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.role.toLowerCase().includes(searchTerm.toLowerCase())).map((member) => (
            <motion.div
              key={member.id}
              layout
              className={`p-8 rounded-lg border transition-all duration-300 group hover:border-[#475569]/30 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-2xl relative ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <User className="w-6 h-6 opacity-40" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${isDark ? 'border-[#1C1C1E]' : 'border-white'} ${
                    member.status === 'active' ? 'bg-emerald-500' : member.status === 'break' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                   <button
                     onClick={() => handleToggleStatus(member)}
                     className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${
                       member.status === 'active'
                         ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                         : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                     }`}
                     title={member.status === 'active' ? 'Registrar Saída' : 'Registrar Entrada'}
                   >
                     {member.status === 'active' ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                   </button>
                   <button onClick={() => handleOpenModal(member)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit3 className="w-4 h-4 opacity-40" /></button>
                   <button onClick={() => deleteCollaborator(member.id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black tracking-tighter truncate leading-tight">{member.name}</h3>
                    <div className="flex items-center gap-2 mt-1 opacity-40">
                      <Briefcase className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{member.role}</span>
                    </div>
                  </div>
                  {member.observations && (
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500" title={member.observations}>
                      <FileText className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                   <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                     member.permissions === 'admin' ? 'bg-slate-500/10 text-slate-500' :
                     member.permissions === 'staff' ? 'bg-blue-500/10 text-blue-500' :
                     'bg-amber-500/10 text-amber-500'
                   }`}>{member.permissions}</span>
                   <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                     member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
                   }`}>{member.status === 'active' ? 'Em Serviço' : member.status === 'break' ? 'Em Pausa' : 'Offline'}</span>
                   {member.contractType && (
                     <span className="px-2 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-[8px] font-black uppercase tracking-widest opacity-60">
                       {member.contractType}
                     </span>
                   )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-current/10 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">Vendas Totais</p>
                  <p className="text-lg font-black text-[#475569] tracking-tighter">{(member.totalSales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-1">Entrada</p>
                  <p className="text-xs font-black tracking-tighter opacity-60">{new Date(member.joinedAt).toLocaleDateString('pt-BR')}</p>
                </div>
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
                  <th className="px-8 py-5">Colaborador</th>
                  <th className="px-8 py-5">Função</th>
                  <th className="px-8 py-5">Permissões</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Vendas</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/[0.03]">
                {collaborators.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.role.toLowerCase().includes(searchTerm.toLowerCase())).map((member) => (
                  <tr key={member.id} className="group hover:bg-current/[0.01] transition-all">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <User className="w-5 h-5 opacity-20" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black uppercase tracking-tight leading-tight">{member.name}</span>
                          <span className="text-[9px] font-bold opacity-30">{member.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{member.role}</span>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        member.permissions === 'admin' ? 'bg-slate-500/10 text-slate-500' :
                        member.permissions === 'staff' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>{member.permissions}</span>
                    </td>
                    <td className="px-8 py-4 text-center">
                       <div className="flex items-center justify-center gap-1.5">
                         <div className={`w-2 h-2 rounded-full ${
                           member.status === 'active' ? 'bg-emerald-500 animate-pulse' : member.status === 'break' ? 'bg-amber-500' : 'bg-red-500'
                         }`} />
                         <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                           {member.status === 'active' ? 'Ativo' : member.status === 'break' ? 'Pausa' : 'Offline'}
                         </span>
                       </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <span className="text-[11px] font-black text-[#475569] tracking-tighter">
                         {(member.totalSales || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                       </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                         <button
                           onClick={() => handleToggleStatus(member)}
                           className={`p-2 rounded-lg transition-all ${
                             member.status === 'active'
                               ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                               : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                           }`}
                           title={member.status === 'active' ? 'Saída' : 'Entrada'}
                         >
                           {member.status === 'active' ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                         </button>
                         <button onClick={() => handleOpenModal(member)} className={`p-2 rounded-lg transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit3 className="w-3.5 h-3.5 opacity-40" /></button>
                         <button onClick={() => deleteCollaborator(member.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-2xl p-8 rounded-xl shadow-sm ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white border border-gray-100'}`}>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">{editingMember ? 'Editar Colaborador' : 'Contratar Novo'}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-1">Gestão de Equipe e Contratos</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-current/5 opacity-40"><X className="w-5 h-5" /></button>
              </div>

              {/* Modal Tabs */}
              <div className="flex gap-4 mb-8 border-b border-current/5">
                <button
                  type="button"
                  onClick={() => setActiveTab('geral')}
                  className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'geral' ? 'text-[#475569]' : 'opacity-40 hover:opacity-100'}`}
                >
                  Informacoes Gerais
                  {activeTab === 'geral' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#475569]" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('trabalhista')}
                  className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'trabalhista' ? 'text-[#475569]' : 'opacity-40 hover:opacity-100'}`}
                >
                  Configurações Trabalhistas
                  {activeTab === 'trabalhista' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#475569]" />}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'geral' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Nome Completo</label>
                      <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Cargo / Função</label>
                        <input required value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">E-mail</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">CPF / CNPJ</label>
                        <input value={formData.document} onChange={e => setFormData({ ...formData, document: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Permissões de Acesso</label>
                        <select value={formData.permissions} onChange={e => setFormData({ ...formData, permissions: e.target.value as any })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40 text-white' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`}>
                          <option value="waiter">Garçom</option>
                          <option value="staff">Equipe / Cozinha</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Endereço Residencial</label>
                      <input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Tipo de Contrato</label>
                        <select value={formData.contractType} onChange={e => setFormData({ ...formData, contractType: e.target.value as any })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40 text-white' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`}>
                          <option value="CLT">CLT</option>
                          <option value="PJ">PJ / MEI</option>
                          <option value="Diarista">Diarista</option>
                          <option value="Freelancer">Freelancer</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Status Operacional <HelpTooltip content="Desativar um colaborador (Offline) impede o acesso dele ao sistema, mas preserva todo o histórico de vendas e atividades associado a ele." /></label>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40 text-white' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`}>
                          <option value="active">Ativo</option>
                          <option value="break">Em Pausa</option>
                          <option value="inactive">Inativo / Offline</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Salário Base (R$)</label>
                        <input type="number" step="0.01" value={formData.salary} onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Comissão (%)</label>
                        <input type="number" step="0.1" value={formData.commissionRate} onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })} className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Dados Bancários / PIX</label>
                      <textarea value={formData.bankDetails} onChange={e => setFormData({ ...formData, bankDetails: e.target.value })} placeholder="Banco, Agência, Conta ou Chave PIX" className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 h-20 resize-none ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">Observações Adicionais</label>
                      <textarea value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} placeholder="Notas internas..." className={`w-full p-4 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-4 focus:ring-[#475569]/10 h-20 resize-none ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-4 sticky bottom-0 bg-inherit pb-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-4 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-[#475569] text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#475569]/20  active:scale-95 transition-all">{editingMember ? 'Salvar Alterações' : 'Contratar Membro'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
