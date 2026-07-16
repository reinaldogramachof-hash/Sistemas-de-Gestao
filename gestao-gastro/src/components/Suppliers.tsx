import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { HelpTooltip } from './HelpTooltip';
import { Supplier } from '../types';
import { Search, Plus, Truck, Phone, Mail, Edit3, Trash2, Box, User, LayoutGrid, List, MapPin, CreditCard, FileText, Star, X, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Suppliers: React.FC = () => {
  const { theme, suppliers, addSupplier, updateSupplier, deleteSupplier } = useApp();
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('viewMode_suppliers') as any) || 'list');

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('viewMode_suppliers', mode);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'logistica'>('geral');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    companyName: '',
    category: 'Geral',
    contactName: '',
    phone: '',
    email: '',
    document: '',
    address: '',
    paymentTerms: '',
    observations: ''
  });

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({ companyName: '', category: 'Geral', contactName: '', phone: '', email: '', document: '', address: '', paymentTerms: '', observations: '' });
    }
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.companyName) return;

    const supplier: Supplier = {
      id: editingSupplier?.id || Date.now().toString(),
      companyName: formData.companyName,
      category: formData.category || 'Geral',
      contactName: formData.contactName || '',
      phone: formData.phone || '',
      email: formData.email || '',
      document: formData.document || '',
      address: formData.address || '',
      paymentTerms: formData.paymentTerms || '',
      observations: formData.observations || '',
      rating: formData.rating || 5,
      deliveryPerformance: formData.deliveryPerformance || 100,
      lastDelivery: formData.lastDelivery || new Date().toISOString().split('T')[0]
    };

    if (editingSupplier) updateSupplier(supplier);
    else addSupplier(supplier);

    setIsModalOpen(false);
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full gap-8 animate-in fade-in duration-700 pb-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tighter uppercase leading-none flex items-center">Parceiros & Supply <HelpTooltip moduleKey="suppliers" /></h2>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Inteligência Logística e Suprimentos</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="flex p-1.5 gap-1 rounded-lg bg-black/5 dark:bg-white/5 border border-white/10 w-fit backdrop-blur-md">
            <button onClick={() => toggleViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#475569]' : 'opacity-30 hover:opacity-100'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => toggleViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#475569]' : 'opacity-30 hover:opacity-100'}`}><List className="w-4 h-4" /></button>
          </div>
          <div className={`flex items-center px-5 py-3 rounded-lg border flex-1 lg:w-96 transition-all focus-within:ring-4 focus-within:ring-[#475569]/10 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] focus-within:border-[#475569]/40' : 'bg-white border-gray-200 focus-within:border-slate-300 shadow-sm'}`}>
            <Search className="w-4 h-4 mr-3 opacity-30" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por empresa, categoria ou contato..." className="bg-transparent border-none outline-none w-full text-xs font-bold placeholder:opacity-20" />
          </div>
          <button onClick={() => handleOpenModal()} className="px-8 py-3 bg-[#475569] text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-sm shadow-[#475569]/30 flex items-center justify-center gap-3  active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" /> Novo Fornecedor
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
          {filteredSuppliers.map(supplier => (
            <motion.div
              key={supplier.id}
              layout
              className={`p-10 rounded-xl border transition-all duration-500 group hover:border-[#475569]/40 relative overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20'}`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 hidden" />

              <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl relative ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <Truck className="w-7 h-7 text-[#475569]" />
                    <div className="absolute -top-2 -right-2 flex gap-0.5">
                       {[...Array(supplier.rating || 0)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tighter truncate leading-tight uppercase max-w-[200px]">{supplier.companyName}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{supplier.category}</span>
                       {supplier.deliveryPerformance >= 95 && <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-500"><Check className="w-3 h-3" /> Premium</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                   <button onClick={() => handleOpenModal(supplier)} className={`p-3 rounded-lg transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit3 className="w-4 h-4 opacity-40" /></button>
                   <button onClick={() => deleteSupplier(supplier.id)} className="p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-5">
                  <div className="flex items-center gap-4 group/item">
                     <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}><User className="w-3.5 h-3.5 opacity-30" /></div>
                     <div className="flex flex-col"><span className="text-[8px] font-black uppercase opacity-30">Contato</span><span className="text-[10px] font-bold">{supplier.contactName}</span></div>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}><Phone className="w-3.5 h-3.5 opacity-30" /></div>
                     <div className="flex flex-col"><span className="text-[8px] font-black uppercase opacity-30">Telefone</span><span className="text-[10px] font-bold">{supplier.phone}</span></div>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                     <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}><MapPin className="w-3.5 h-3.5 opacity-30" /></div>
                     <div className="flex flex-col"><span className="text-[8px] font-black uppercase opacity-30">Localizacao</span><span className="text-[10px] font-bold truncate max-w-[150px]">{supplier.address || 'Nao informado'}</span></div>
                  </div>
                </div>

                <div className={`p-8 rounded-xl flex flex-col justify-between border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                   <div>
                      <div className="flex justify-between items-end mb-3">
                         <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">Performance</p>
                         <span className={`text-[11px] font-black ${supplier.deliveryPerformance >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>{supplier.deliveryPerformance}%</span>
                      </div>
                      <div className="h-2 bg-current/10 rounded-full overflow-hidden">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${supplier.deliveryPerformance}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full rounded-full ${supplier.deliveryPerformance >= 90 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-amber-500'}`} />
                      </div>
                   </div>
                   <div className="mt-6 pt-6 border-t border-dashed border-current/10 flex justify-between items-center">
                      <div>
                         <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Pagamento</p>
                         <p className="text-[10px] font-black flex items-center gap-2 mt-1"><CreditCard className="w-3 h-3 opacity-30" /> {supplier.paymentTerms || 'Padrão'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black uppercase tracking-widest opacity-30">Última</p>
                         <p className="text-[10px] font-black">{new Date(supplier.lastDelivery).toLocaleDateString('pt-BR')}</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-current/5 flex justify-between items-center relative z-10">
                 <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 hover:text-[#475569] transition-all"><Box className="w-4 h-4" /> catálogo de Produtos</button>
                 {supplier.observations && <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500/60 bg-amber-500/5 px-3 py-1.5 rounded-full"><AlertCircle className="w-3 h-3" /> Ver Notas</div>}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[9px] uppercase font-black tracking-[0.2em] border-b ${isDark ? 'bg-white/5 border-white/5 text-white/30' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                  <th className="px-10 py-6">Parceiro Logístico</th>
                  <th className="px-10 py-6">Categoria</th>
                  <th className="px-10 py-6">Contatos & Docs</th>
                  <th className="px-10 py-6">Condição Pgto</th>
                  <th className="px-10 py-6 text-right">Métrica</th>
                  <th className="px-10 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/[0.03]">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="group hover:bg-current/[0.01] transition-all">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center relative ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                          <Truck className="w-6 h-6 opacity-20" />
                          <div className="absolute -top-1 -right-1 flex gap-0.5">
                             {[...Array(Math.min(3, supplier.rating || 0))].map((_, i) => <Star key={i} className="w-2 h-2 fill-amber-500 text-amber-500" />)}
                          </div>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[12px] font-black uppercase tracking-tight leading-tight">{supplier.companyName}</span>
                           <span className="text-[9px] font-bold opacity-30 mt-0.5">{supplier.document || 'Sem CNPJ'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{supplier.category}</span>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex flex-col">
                          <span className="text-[11px] font-bold opacity-50">{supplier.phone}</span>
                          <span className="text-[9px] font-bold opacity-20 italic">{supplier.contactName}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 opacity-20" />
                          <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{supplier.paymentTerms || 'Boleto'}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[11px] font-black ${supplier.deliveryPerformance >= 90 ? 'text-emerald-500' : 'text-amber-500'}`}>{supplier.deliveryPerformance}%</span>
                          <div className="w-16 h-1 bg-current/10 rounded-full overflow-hidden">
                            <div className={`h-full ${supplier.deliveryPerformance >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${supplier.deliveryPerformance}%` }} />
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                         <button onClick={() => handleOpenModal(supplier)} className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit3 className="w-4 h-4 opacity-40" /></button>
                         <button onClick={() => deleteSupplier(supplier.id)} className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Panel */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl shadow-sm ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white border border-gray-100'}`}
            >
              {/* Modal Header */}
              <div className="p-10 pb-6 flex justify-between items-start">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-lg bg-[#475569]/10 flex items-center justify-center">
                    <Truck className="w-8 h-8 text-[#475569]" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter uppercase leading-tight italic">{editingSupplier ? 'Ficha do Parceiro' : 'Novo Fornecedor'}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Gestão de Supply Chain</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-40 hover:opacity-100"><X className="w-6 h-6" /></button>
              </div>

              {/* Tabs */}
              <div className="px-10 flex gap-6 border-b border-current/5">
                {[
                  { id: 'geral', label: 'Dados Gerais', icon: User },
                  { id: 'logistica', label: 'Logística & Comercial', icon: Box }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-4 px-2 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab.id ? 'text-[#475569]' : 'opacity-30 hover:opacity-100'}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && <motion.div layoutId="tab-underline-supplier" className="absolute bottom-0 left-0 right-0 h-1 bg-[#475569] rounded-t-full" />}
                  </button>
                ))}
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                  {activeTab === 'geral' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Razão Social / Nome Fantasia</label>
                          <div className="relative group">
                             <input required value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all focus:ring-8 focus:ring-[#475569]/5 ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                             <Box className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-10 group-focus-within:opacity-100 group-focus-within:text-[#475569] transition-all" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">CNPJ / CPF</label>
                          <input value={formData.document} onChange={e => setFormData({ ...formData, document: e.target.value })} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Representante / Contato</label>
                          <input value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Categoria</label>
                          <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm appearance-none transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40 text-white' : 'bg-gray-50 border-gray-200 focus:border-slate-300 text-gray-900'}`}>
                            <option>Bebidas</option>
                            <option>Perecíveis</option>
                            <option>Proteínas</option>
                            <option>Limpeza</option>
                            <option>Manutenção</option>
                            <option>Geral</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">WhatsApp / Telefone</label>
                          <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">E-mail Comercial</label>
                          <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Endereço de Retirada / Depósito</label>
                        <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Condição de Pagamento</label>
                          <input value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} placeholder="Ex: 15 dias, À vista, Boleto 30" className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Classificação Interna (Rating)</label>
                          <div className="flex gap-2 p-5 rounded-lg border dark:bg-[#121214] dark:border-[#2C2C2E]">
                             {[1, 2, 3, 4, 5].map(r => (
                               <button type="button" key={r} onClick={() => setFormData({ ...formData, rating: r })} className={`transition-all ${formData.rating && formData.rating >= r ? 'text-amber-500 scale-105' : 'text-gray-300 opacity-30 hover:opacity-100'}`}>
                                 <Star className={`w-6 h-6 ${formData.rating && formData.rating >= r ? 'fill-current' : ''}`} />
                               </button>
                             ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 ml-2">Observações & Notas Logísticas</label>
                        <textarea value={formData.observations} onChange={e => setFormData({ ...formData, observations: e.target.value })} rows={4} className={`w-full p-5 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-[#121214] border-[#2C2C2E] focus:border-[#475569]/40' : 'bg-gray-50 border-gray-200 focus:border-slate-300'}`} />
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-10 border-t border-current/5 bg-black/5 dark:bg-white/5 flex gap-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>Descartar</button>
                <button onClick={handleSave} className="flex-[2] py-5 bg-[#475569] text-white rounded-lg font-black uppercase tracking-widest text-[10px] shadow-sm shadow-[#475569]/40  active:scale-95 transition-all">Salvar Parceiro</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
