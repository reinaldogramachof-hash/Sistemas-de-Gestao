import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { HelpTooltip } from './HelpTooltip';
import {
  Search, Plus, Edit2, Trash2, X, Filter, LayoutGrid, List,
  ChevronRight, ArrowRight, BookOpen, Package, PlusCircle, MinusCircle,
  Coffee, Utensils, Pizza, IceCream, GlassWater,
  Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, RecipeItem } from '../types';
import { ui } from '../ui/styles';
import { getProductIcon } from '../utils/productIcons';

export const Products: React.FC = () => {
  const { products, stockItems, updateProduct, addProduct, deleteProduct, theme, productSyncErrors, retrySyncProduct, clearSyncError, supabaseOnline } = useApp();
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('viewMode_products') as any) || 'grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('viewMode_products', mode);
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setRecipeItems(product.recipe || []);
    } else {
      setEditingProduct(null);
      setRecipeItems([]);
    }
    setIsModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const product: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      recipe: recipeItems,
      active: formData.get('active') === 'true'
    };

    if (editingProduct) updateProduct(product);
    else addProduct(product);

    setIsModalOpen(false);
  };

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { stockItemId: '', quantity: 0 }]);
  };

  const updateRecipeItem = (index: number, field: keyof RecipeItem, value: any) => {
    const next = [...recipeItems];
    next[index] = { ...next[index], [field]: field === 'quantity' ? parseFloat(value) : value };
    setRecipeItems(next);
  };

  const removeRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const calculateProductionCost = (recipe?: RecipeItem[]) => {
    if (!recipe) return 0;
    return recipe.reduce((acc, item) => {
      const stockItem = stockItems.find(si => si.id === item.stockItemId);
      return acc + (stockItem ? stockItem.costPrice * item.quantity : 0);
    }, 0);
  };

  const getIcon = (cat: string, name: string) => {
    const Icon = getProductIcon(cat, name);
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h2 className={ui.pageTitle}>Cardápio e Vendas</h2>
            <HelpTooltip moduleKey="menu" />
          </div>
          <p className={ui.pageSubtitle}>Gestão de catálogo e fichas técnicas</p>
        </div>

        <div className="flex gap-4">
          <div className={`flex p-1 rounded-xl ${ui.panelMuted(isDark)}`}>
            <button onClick={() => toggleViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? (isDark ? 'bg-white/10 text-accent' : 'bg-white shadow-sm text-accent') : 'opacity-40 hover:opacity-100'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => toggleViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? (isDark ? 'bg-white/10 text-accent' : 'bg-white shadow-sm text-accent') : 'opacity-40 hover:opacity-100'}`}><List className="w-4 h-4" /></button>
          </div>
          <button
            onClick={() => openModal()}
            className={`px-8 h-12 ${ui.primaryButton} flex items-center gap-2 text-[10px]`}
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
          <input
            type="text"
            placeholder="Buscar no cardápio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-12 pl-12 pr-6 ${ui.input(isDark)}`}
          />
        </div>
        <div className={`${ui.tabShell(isDark)} overflow-x-auto scrollbar-none`}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 whitespace-nowrap ${ui.tab(selectedCategory === cat, isDark)}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(p => {
            const cost = calculateProductionCost(p.recipe);
            const margin = ((p.price - cost) / p.price) * 100;

            return (
              <motion.div
                layout
                key={p.id}
                className={`group relative flex flex-col p-6 rounded-lg border transition-all duration-200
                  ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] hover:border-[#475569]/40' : 'bg-white border-gray-100 hover:border-[#475569]/40 shadow-sm'}
                  ${p.active === false ? 'opacity-60' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      {getIcon(p.category, p.name)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      {p.active === false && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[8px] font-bold uppercase tracking-wider w-fit">Inativo</span>
                      )}
                      {supabaseOnline && (
                        productSyncErrors[p.id] ? (
                          <div className="flex items-center gap-1 text-red-500 cursor-pointer" title={`Erro ao sincronizar: ${productSyncErrors[p.id]}. Clique para re-sincronizar.`} onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await retrySyncProduct(p);
                              alert('Produto sincronizado com sucesso!');
                            } catch (err: any) {
                              alert(`Erro de sincronização: ${err.message}`);
                            }
                          }}>
                            <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[8px] font-bold uppercase tracking-wider underline">Erro Sync</span>
                          </div>
                        ) : (
                          <div className="flex w-fit max-w-full items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0" /> <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block">Sincronizado</span>
                            <HelpTooltip content="O selo verde indica que o produto foi salvo com segurança no servidor na nuvem (Supabase)." />
                          </div>
                        )
                      )}
                      {!supabaseOnline && (
                        <div className="flex items-center gap-1 text-gray-500" title="Modo local (sem Supabase).">
                          <Cloud className="w-3.5 h-3.5 opacity-40" />
                          <span className="text-[8px] font-bold uppercase tracking-wider opacity-40">Local-only</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => openModal(p)} className="p-2.5 rounded-xl hover:bg-[#475569]/10 hover:text-[#475569] transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-tight truncate">{p.name}</h4>
                    <p className="text-[10px] font-bold opacity-30 line-clamp-2 mt-1">{p.description}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] font-bold uppercase tracking-wide opacity-20">Preço de Venda</span>
                      <span className="text-xl font-bold tracking-tighter">R$ {p.price.toFixed(2)}</span>
                    </div>
                    {p.recipe && p.recipe.length > 0 ? (
                      <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wide">
                        <span className="opacity-20">Margem Estimada</span>
                        <span className={margin > 60 ? 'text-emerald-500' : 'text-amber-500'}>{margin.toFixed(0)}%</span>
                      </div>
                    ) : (
                      <div className="text-[8px] font-bold text-red-500 uppercase tracking-wide bg-red-500/5 px-2 py-1 rounded-lg w-fit">Sem Ficha Técnica</div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-dashed border-current/5">
                   <button onClick={() => openModal(p)} className="w-full flex items-center justify-between text-[9px] font-bold uppercase tracking-wide opacity-30 group-hover:opacity-100 transition-all">
                     <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Ficha Técnica</span>
                     <ArrowRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={`rounded-lg border overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <table className="w-full text-left">
            <thead className={`text-[10px] font-bold uppercase tracking-wide ${isDark ? 'bg-white/5 text-white/40' : 'bg-gray-50 text-gray-400'}`}>
              <tr>
                <th className="px-8 py-6">Produto</th>
                <th className="px-8 py-6">Categoria</th>
                <th className="px-8 py-6">Ficha Técnica</th>
                <th className="px-8 py-6">Custo Prod.</th>
                <th className="px-8 py-6">Preço Venda</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-current/[0.03]">
              {filteredProducts.map(p => {
                const cost = calculateProductionCost(p.recipe);
                return (
                  <tr key={p.id} className="group hover:bg-current/[0.01] transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>{getIcon(p.category, p.name)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold uppercase tracking-tight">{p.name}</span>
                            {p.active === false && (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[7px] font-bold uppercase tracking-wider">Inativo</span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {supabaseOnline && (
                              productSyncErrors[p.id] ? (
                                <button className="flex items-center gap-1 text-red-500 hover:underline" title={`Erro ao sincronizar: ${productSyncErrors[p.id]}. Clique para re-sincronizar.`} onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await retrySyncProduct(p);
                                    alert('Produto sincronizado com sucesso!');
                                  } catch (err: any) {
                                    alert(`Erro de sincronização: ${err.message}`);
                                  }
                                }}>
                                  <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                                  <span className="text-[8px] font-bold uppercase tracking-wider">Erro Sync</span>
                                </button>
                              ) : (
                                <div className="flex w-fit max-w-full items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600">
                                  <CheckCircle2 className="h-3 w-3 flex-shrink-0" /> <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block">Sincronizado</span>
                                  <HelpTooltip content="O selo verde indica que o produto foi salvo com segurança no servidor na nuvem (Supabase)." />
                                </div>
                              )
                            )}
                            {!supabaseOnline && (
                              <div className="flex items-center gap-1 text-gray-500" title="Modo local (sem Supabase).">
                                <Cloud className="w-3.5 h-3.5 opacity-40" />
                                <span className="text-[8px] font-bold uppercase tracking-wider opacity-40">Local-only</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-[10px] font-bold uppercase opacity-40">{p.category}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-[10px] font-bold opacity-40">{p.recipe?.length || 0} itens</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="font-mono text-[11px] font-bold opacity-60">R$ {cost.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="font-bold text-[#475569]">R$ {p.price.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => openModal(p)} className="p-2 rounded-lg hover:bg-[#475569]/10 hover:text-[#475569]"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-2xl rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[90vh] ${isDark ? 'bg-[#1C1C1E] border border-[#2C2C2E]' : 'bg-white'}`}
            >
              <div className="p-8 md:p-10 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold uppercase  tracking-tighter">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40 mt-1">configuração de venda e produção</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-4 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-40"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleProductSubmit} className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 custom-scrollbar">
                {/* Basic Info */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#475569]">Informações Básicas</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Nome do Produto</label>
                      <input required name="name" defaultValue={editingProduct?.name} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Categoria</label>
                        <input required name="category" defaultValue={editingProduct?.category} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Preço de Venda (R$)</label>
                        <input required type="number" step="0.01" name="price" defaultValue={editingProduct?.price} className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Descrição (opcional)</label>
                      <textarea name="description" defaultValue={editingProduct?.description} rows={2} className={`w-full p-6 rounded-lg border outline-none font-bold text-sm resize-none ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`} />
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-current/10 mt-4">
                      <input
                        type="checkbox"
                        id="active"
                        name="active"
                        value="true"
                        defaultChecked={editingProduct ? editingProduct.active !== false : true}
                        className="w-5 h-5 rounded border-gray-300 text-[#475569] focus:ring-[#475569] accent-[#475569]"
                      />
                      <div>
                        <label htmlFor="active" className="text-xs font-bold uppercase tracking-tight cursor-pointer">Produto Ativo no Cardápio</label>
                        <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Se desativado, o produto não aparecerá para venda no PDV.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Sheet */}
                <div className="space-y-6 pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#475569]">
                      Ficha Técnica (Ingredientes)
                      <HelpTooltip id="help-ficha-tecnica" content="A ficha técnica abate automaticamente os ingredientes nas vendas. Atenção: lance o consumo na mesma unidade do estoque (ex: se cadastrou em kg, digite 0.150 para 150g)." anchorId="guide_estoque" />
                    </h4>
                    <button type="button" onClick={addRecipeItem} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wide opacity-40 hover:opacity-100 transition-all">
                      <PlusCircle className="w-4 h-4" /> Adicionar Insumo
                    </button>
                  </div>

                  <div className="space-y-3">
                    {recipeItems.length === 0 && (
                      <div className={`p-10 rounded-xl border border-dashed text-center space-y-2 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                        <Package className="w-8 h-8 mx-auto opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-30">Nenhum insumo vinculado a este produto.</p>
                        <button type="button" onClick={addRecipeItem} className="text-[9px] font-bold uppercase text-[#475569]">Vincular agora</button>
                      </div>
                    )}
                    {recipeItems.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-2">
                        <div className="flex-[2] space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-wide opacity-30 ml-2">Insumo do Estoque</label>
                          <select
                            required
                            value={item.stockItemId}
                            onChange={e => updateRecipeItem(idx, 'stockItemId', e.target.value)}
                            className={`w-full h-12 px-4 rounded-xl border outline-none font-bold text-xs appearance-none ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white' : 'bg-gray-50 border-gray-100'}`}
                          >
                            <option value="">Selecione...</option>
                            {stockItems.map(si => <option key={si.id} value={si.id}>{si.name} ({si.unit})</option>)}
                          </select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-wide opacity-30 ml-2">Quantidade</label>
                          <input
                            required
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={e => updateRecipeItem(idx, 'quantity', e.target.value)}
                            className={`w-full h-12 px-4 rounded-xl border outline-none font-bold text-xs ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}
                          />
                        </div>
                        <button type="button" onClick={() => removeRecipeItem(idx)} className="h-12 w-12 rounded-xl flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all mb-0.5"><MinusCircle className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>

                  {recipeItems.length > 0 && (
                    <div className={`p-6 rounded-lg flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <span className="text-[9px] font-bold uppercase tracking-wide opacity-40">Custo Total de Produção</span>
                      <span className="font-mono font-bold text-sm">R$ {calculateProductionCost(recipeItems).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 h-16 rounded-lg font-bold uppercase tracking-wide text-[10px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>Cancelar</button>
                  <button type="submit" className="flex-[2] h-16 rounded-lg bg-[#475569] text-white font-bold uppercase tracking-wide text-[10px] shadow-sm">Salvar Produto</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
