import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import {
  Plus, Check, X, Search, Package, ArrowUpRight, ArrowDownRight,
  AlertTriangle, History, Trash2, Edit2, Coffee, Utensils, Pizza,
  IceCream, GlassWater, TrendingDown, Minus, Filter, Truck,
  DollarSign, Calendar, Info, ChevronRight, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StockMovement, StockItem } from '../types';
import { ui } from '../ui/styles';
import { HelpTooltip } from './HelpTooltip';
import { formatStockQuantity } from '../utils/format';

type TabType = 'overview' | 'movements' | 'losses';

export const Stock: React.FC = () => {
  const { stockItems, updateStockItem, addStockItem, deleteStockItem, suppliers, stockMovements, addStockMovement, theme } = useApp();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Unified Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Form State for Entry/Register
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    minStock: 0,
    costPrice: 0,
    supplierId: '',
    expiryDate: '',
    addQuantity: 0 // Quantidade a ser somada ao estoque atual
  });

  // Form State for Loss
  const [lossData, setLossData] = useState({
    quantity: 0,
    reason: ''
  });

  const categories = ['Todas', ...Array.from(new Set(stockItems.map(i => i.category)))];

  const filteredItems = useMemo(() => {
    return stockItems.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || i.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [stockItems, searchTerm, selectedCategory]);

  const sortedMovements = useMemo(() => {
    return [...stockMovements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockMovements]);

  const handleOpenModal = (item?: StockItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        unit: item.unit,
        minStock: item.minStock,
        costPrice: item.costPrice,
        supplierId: item.supplierId || '',
        expiryDate: item.expiryDate || '',
        addQuantity: 0
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: '',
        unit: 'kg',
        minStock: 0,
        costPrice: 0,
        supplierId: '',
        expiryDate: '',
        addQuantity: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();

    const item: StockItem = {
      id: editingItem?.id || Date.now().toString(),
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      minStock: Number(formData.minStock),
      costPrice: Number(formData.costPrice),
      supplierId: formData.supplierId,
      expiryDate: formData.expiryDate || undefined,
      currentStock: (editingItem?.currentStock || 0) + Number(formData.addQuantity)
    };

    if (editingItem) {
      updateStockItem(item);
    } else {
      addStockItem(item);
    }

    // Registrar movimento se houve entrada de quantidade
    if (Number(formData.addQuantity) > 0) {
      addStockMovement({
        id: Date.now().toString() + 'mv',
        stockItemId: item.id,
        type: 'in',
        quantity: Number(formData.addQuantity),
        unitCost: item.costPrice,
        reason: editingItem ? 'Ajuste de Estoque / Entrada' : 'Estoque Inicial',
        timestamp: new Date().toISOString()
      });
    }

    setIsModalOpen(false);
  };

  const handleSaveLoss = (e: React.FormEvent) => {
    e.preventDefault();
    const si = stockItems.find(item => item.id === selectedItemId);
    if (si && lossData.quantity > 0) {
      updateStockItem({ ...si, currentStock: Math.max(0, si.currentStock - lossData.quantity) });
      addStockMovement({
        id: Date.now().toString(),
        stockItemId: si.id,
        type: 'loss',
        quantity: lossData.quantity,
        unitCost: si.costPrice,
        reason: lossData.reason || 'Perda/Desperdício',
        timestamp: new Date().toISOString()
      });
      setIsLossModalOpen(false);
      setSelectedItemId('');
      setLossData({ quantity: 0, reason: '' });
    }
  };

  const getStatusInfo = (si: StockItem) => {
    if (si.currentStock <= 0) return { label: 'Esgotado', color: 'text-red-500', bg: 'bg-red-500/10' };
    if (si.currentStock <= si.minStock) return { label: 'Baixo', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'OK', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  };

  const alertCount = stockItems.filter(i => i.currentStock <= i.minStock).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-24">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h2 className={ui.pageTitle}>Gestão de Suprimentos</h2>
            <HelpTooltip moduleKey="stock" />
          </div>
          <p className={ui.pageSubtitle}>Controle profundo de insumos e movimentações</p>
        </div>

        <div className={`flex p-1 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
          {[
            { id: 'overview', label: 'Insumos', icon: Package },
            { id: 'movements', label: 'Histórico', icon: History },
            { id: 'losses', label: 'Quebras', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all ${
                activeTab === tab.id
                  ? 'bg-[#475569] text-white shadow-sm'
                  : `opacity-40 hover:opacity-100 ${isDark ? 'text-white' : 'text-gray-900'}`
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className={`relative flex-1 group`}>
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isDark ? 'text-white/20 group-focus-within:text-[#475569]' : 'text-gray-400 group-focus-within:text-[#475569]'}`} />
              <input
                type="text"
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full h-14 pl-14 pr-6 rounded-lg border transition-all outline-none text-sm font-bold
                  ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] focus:border-[#475569]' : 'bg-white border-gray-200 focus:border-[#475569] shadow-sm'}
                `}
              />
            </div>

            <div className={`relative flex items-center px-5 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-200 shadow-sm'}`}>
              <Filter className="w-4 h-4 mr-3 opacity-30" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wide appearance-none pr-10 cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-3 px-10 h-14 rounded-lg bg-[#475569] text-white font-bold text-[10px] uppercase tracking-wide transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" /> Novo Insumo / Entrada
            </button>
          </div>

          {alertCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-5 p-6 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600"
            >
              <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 shadow-sm" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide">Insumos em Nível Crítico</p>
                <p className="text-xs font-bold opacity-80 mt-0.5">Existem <strong>{alertCount}</strong> itens que precisam de reposição imediata.</p>
              </div>
            </motion.div>
          )}

          {/* Insumos Table */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/5 text-white/30' : 'bg-gray-50 text-gray-400'}`}>
                  <tr>
                    <th className="px-10 py-7">Insumo</th>
                    <th className="px-10 py-7">Fornecedor Preferencial</th>
                    <th className="px-10 py-7">Saldo e Mínimo</th>
                    <th className="px-10 py-7">Custo Un.</th>
                    <th className="px-10 py-7">Status</th>
                    <th className="px-10 py-7 text-right">Gestão</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
                  {filteredItems.map(si => {
                    const status = getStatusInfo(si);
                    const supplier = suppliers.find(s => s.id === si.supplierId);
                    return (
                      <tr key={si.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'} transition-all group`}>
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-tight text-sm">{si.name}</span>
                            <span className="text-[9px] font-bold opacity-20 uppercase tracking-wide">{si.category}</span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          {supplier ? (
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                <Truck className="w-4 h-4 opacity-30" />
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">{supplier.companyName}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold opacity-20 ">Não vinculado</span>
                          )}
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold tracking-tight ${status.color}`}>
                              {formatStockQuantity(si.currentStock, si.unit)}
                            </span>
                            <span className="text-[10px] font-semibold opacity-40 mt-0.5">
                              Mínimo: {formatStockQuantity(si.minStock, si.unit)}
                            </span>
                            <div className="w-24 h-1 bg-current/10 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full ${status.color.replace('text', 'bg')}`}
                                style={{ width: `${Math.min((si.currentStock / (si.minStock * 2 || 1)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <span className="font-bold font-mono text-xs opacity-60">R$ {si.costPrice.toFixed(2)}</span>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${status.color} ${status.bg}`}>
                             {status.label}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <button onClick={() => handleOpenModal(si)} className={`p-3 rounded-lg transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}><Edit2 className="w-4 h-4 opacity-40" /></button>
                            <button onClick={() => { setSelectedItemId(si.id); setIsLossModalOpen(true); }} className="p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"><AlertTriangle className="w-4 h-4" /></button>
                            <button onClick={() => handleOpenModal(si)} className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all"><Plus className="w-4 h-4" /></button>
                          </div>
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

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`text-[9px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/5 text-white/30' : 'bg-gray-50 text-gray-400'}`}>
                  <tr>
                    <th className="px-10 py-7">Timestamp</th>
                    <th className="px-10 py-7">Insumo</th>
                    <th className="px-10 py-7">Operação</th>
                    <th className="px-10 py-7">Qtd. Movimentada</th>
                    <th className="px-10 py-7">Motivo / Origem</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
                  {sortedMovements.map(m => {
                    const item = stockItems.find(si => si.id === m.stockItemId);
                    return (
                      <tr key={m.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50/50'} transition-all group`}>
                        <td className="px-10 py-6 text-[10px] font-bold opacity-30">{new Date(m.timestamp).toLocaleString('pt-BR')}</td>
                        <td className="px-10 py-6 font-bold uppercase tracking-tight text-xs">{item?.name || 'Insumo Removido'}</td>
                        <td className="px-10 py-6">
                          {m.type === 'in' && <span className="inline-flex items-center gap-2 text-emerald-500 font-bold text-[9px] uppercase tracking-wide"><ArrowDownRight className="w-4 h-4" /> Entrada</span>}
                          {m.type === 'out' && <span className="inline-flex items-center gap-2 text-blue-500 font-bold text-[9px] uppercase tracking-wide"><ArrowUpRight className="w-4 h-4" /> Consumo PDV</span>}
                          {m.type === 'loss' && <span className="inline-flex items-center gap-2 text-red-500 font-bold text-[9px] uppercase tracking-wide"><AlertTriangle className="w-4 h-4" /> Quebra</span>}
                        </td>
                        <td className="px-10 py-6 font-bold font-mono text-sm">{formatStockQuantity(m.quantity, item?.unit || '')}</td>
                        <td className="px-10 py-6 text-[10px] font-bold uppercase opacity-40">{m.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Losses Tab */}
      {activeTab === 'losses' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stockMovements.filter(m => m.type === 'loss').map(m => {
             const item = stockItems.find(si => si.id === m.stockItemId);
             return (
               <div key={m.id} className={`p-8 rounded-lg border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-12 h-12 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><AlertTriangle className="w-6 h-6" /></div>
                     <span className="text-[10px] font-bold opacity-30">{new Date(m.timestamp).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-tight mb-1">{item?.name}</h4>
                  <p className="text-[10px] font-bold opacity-40 uppercase tracking-wide  mb-4">{m.reason}</p>
                  <div className="flex justify-between items-end border-t border-current/5 pt-4">
                     <span className="text-[9px] font-bold uppercase opacity-20">Volume Perdido</span>
                     <span className="text-lg font-bold text-red-500">-{formatStockQuantity(m.quantity, item?.unit || '')}</span>
                  </div>
               </div>
             );
          })}
        </motion.div>
      )}

      {/* Unified Insumo Modal (Register & Entry) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl shadow-sm ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white'}`}
            >
              <div className="p-10 border-b flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-lg bg-[#475569]/10 flex items-center justify-center">
                    <Package className="w-8 h-8 text-[#475569]" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tighter uppercase leading-tight ">{editingItem ? 'Gestão de Insumo' : 'Novo Insumo / Entrada'}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Dados cadastrais e entrada de estoque</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-4 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-40"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Left Column: Cadastro */}
                  <div className="space-y-8">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#475569] flex items-center gap-3">
                       <Tag className="w-4 h-4" /> Dados Cadastrais
                    </h4>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Nome do Insumo</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Categoria</label>
                          <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Unidade</label>
                          <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm appearance-none ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white' : 'bg-gray-50 border-gray-100'}`}>
                            <option value="kg">Quilograma (kg)</option>
                            <option value="g">Grama (g)</option>
                            <option value="L">Litro (L)</option>
                            <option value="ml">Mililitro (ml)</option>
                            <option value="un">Unidade (un)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Estoque de Alerta (mínimo) ({formData.unit})</label>
                          <input required type="number" step="0.001" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Validade (Opcional)</label>
                          <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] text-white [color-scheme:dark]' : 'bg-gray-50 border-gray-100'}`} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Entrada e Fornecedor */}
                  <div className="space-y-8">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#475569] flex items-center gap-3">
                       <Truck className="w-4 h-4" /> Entrada & Supply
                    </h4>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Fornecedor Preferencial</label>
                        <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm appearance-none ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}>
                          <option value="">Selecione um parceiro...</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">Custo de Aquisição (R$)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
                            <input required type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className={`w-full h-14 pl-12 pr-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-2">{editingItem ? `Somar ao Estoque (${formData.unit})` : `Estoque Inicial (${formData.unit})`}</label>
                          <input required type="number" step="0.001" value={formData.addQuantity} onChange={e => setFormData({...formData, addQuantity: Number(e.target.value)})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm bg-[#475569]/5 border-[#475569]/20 text-[#475569] placeholder:text-[#475569]/30`} />
                        </div>
                      </div>

                      {editingItem && (
                        <div className={`p-6 rounded-lg border flex justify-between items-center ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                           <div className="flex items-center gap-3">
                              <Info className="w-5 h-5 opacity-20" />
                              <span className="text-[10px] font-bold uppercase tracking-wide opacity-40">Saldo Atualizado</span>
                           </div>
                           <span className="text-xl font-bold ">
                             {formatStockQuantity(editingItem.currentStock + Number(formData.addQuantity), formData.unit)}
                           </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 h-16 rounded-lg font-bold uppercase tracking-wide text-[10px] ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
                  <button type="submit" className="flex-[2] h-16 rounded-lg bg-[#475569] text-white font-bold uppercase tracking-wide text-[10px] shadow-sm transition-all">
                    Finalizar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Loss Modal */}
        {isLossModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLossModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className={`relative w-full max-w-md rounded-xl overflow-hidden shadow-sm ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white'}`}>
              <div className="p-8 border-b flex justify-between items-center bg-red-500/5">
                <h3 className="text-xl font-bold uppercase  tracking-tighter text-red-500">Registrar Quebra / Perda</h3>
                <button onClick={() => setIsLossModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveLoss} className="p-8 space-y-6">
                <div className="space-y-2">
                  {(() => {
                    const lossItem = stockItems.find(si => si.id === selectedItemId);
                    return (
                      <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">
                        Quantidade Perdida ({lossItem?.unit || ''})
                      </label>
                    );
                  })()}
                  <input required type="number" step="0.001" value={lossData.quantity} onChange={e => setLossData({...lossData, quantity: Number(e.target.value)})} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-xl ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Motivo da Baixa</label>
                  <textarea required value={lossData.reason} onChange={e => setLossData({...lossData, reason: e.target.value})} placeholder="Ex: Vencimento, Quebra de garrafa, Desperdício de preparo..." rows={3} className={`w-full p-6 rounded-lg border outline-none font-bold text-sm resize-none ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                </div>
                <button type="submit" className="w-full h-16 rounded-lg bg-red-500 text-white font-bold uppercase tracking-wide text-[10px] shadow-sm mt-4 transition-all">
                  Confirmar Baixa de Estoque
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
