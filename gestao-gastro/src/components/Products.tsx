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
import { formatStockQuantity } from '../utils/format';
import { OperationFeedback, type OperationFeedbackMessage } from './OperationFeedback';
import { OperationalState } from './OperationalState';

type ProductStatusFilter = 'todos' | 'ativos' | 'inativos' | 'ficha_pendente' | 'sync_pendente';

const productStatusLabels: Record<ProductStatusFilter, string> = {
  todos: 'Todos',
  ativos: 'Ativos',
  inativos: 'Inativos',
  ficha_pendente: 'Ficha pendente',
  sync_pendente: 'Erro de sincronização',
};

export const Products: React.FC = () => {
  const { products, stockItems, updateProduct, addProduct, deleteProduct, theme, productSyncErrors, retrySyncProduct, clearSyncError, supabaseOnline } = useApp();
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('todos');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('viewMode_products') as any) || 'grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [feedback, setFeedback] = useState<OperationFeedbackMessage | null>(null);

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];
  const syncErrorCount = Object.keys(productSyncErrors).length;
  const hasIncompleteRecipe = React.useCallback((product: Product) => !product.recipe?.length
    || product.recipe.some(item => !stockItems.some(stockItem => stockItem.id === item.stockItemId)), [stockItems]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
      const matchesStatus = statusFilter === 'todos'
        || (statusFilter === 'ativos' && p.active !== false)
        || (statusFilter === 'inativos' && p.active === false)
        || (statusFilter === 'ficha_pendente' && hasIncompleteRecipe(p))
        || (statusFilter === 'sync_pendente' && Boolean(productSyncErrors[p.id]));
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, statusFilter, productSyncErrors, hasIncompleteRecipe]);

  const selectedProducts = products.filter(product => selectedProductIds.includes(product.id));
  const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every(product => selectedProductIds.includes(product.id));
  const productStatusCounts: Record<ProductStatusFilter, number> = {
    todos: products.length,
    ativos: products.filter(product => product.active !== false).length,
    inativos: products.filter(product => product.active === false).length,
    ficha_pendente: products.filter(hasIncompleteRecipe).length,
    sync_pendente: syncErrorCount,
  };

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

    if (recipeItems.length > 0) {
      const hasEmpty = recipeItems.some(r => !r.stockItemId);
      const hasInvalidQty = recipeItems.some(r => r.quantity <= 0 || isNaN(r.quantity));
      if (hasEmpty) {
        setFeedback({
          tone: 'warning',
          title: 'Ficha Técnica incompleta',
          description: 'Preencha todos os insumos selecionados ou remova as linhas vazias antes de salvar.',
        });
        return;
      }
      if (hasInvalidQty) {
        setFeedback({
          tone: 'warning',
          title: 'Ficha Técnica inválida',
          description: 'Informe uma quantidade maior que zero para cada insumo vinculado.',
        });
        return;
      }
    }

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
    setFeedback({
      tone: 'success',
      title: editingProduct ? 'Produto atualizado' : 'Produto cadastrado',
      description: `${product.name} foi salvo no Cardápio${supabaseOnline ? ' e será sincronizado com a nuvem.' : ' neste dispositivo.'}`,
    });
  };

  const handleRetrySync = async (product: Product) => {
    try {
      await retrySyncProduct(product);
      clearSyncError(product.id);
      setFeedback({
        tone: 'success',
        title: 'Produto sincronizado',
        description: `${product.name} foi enviado para a nuvem com sucesso.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida ao sincronizar.';
      setFeedback({
        tone: 'error',
        title: 'Sincronização pendente',
        description: `${product.name} continua salvo neste dispositivo. Verifique a conexão e tente novamente. Detalhe: ${message}`,
      });
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(current => current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId]);
  };

  const toggleAllVisibleProducts = () => {
    const visibleIds = filteredProducts.map(product => product.id);
    setSelectedProductIds(current => allVisibleSelected
      ? current.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  };

  const handleBulkAvailability = (active: boolean) => {
    if (selectedProducts.length === 0) return;
    if (!active && !window.confirm(`Desativar ${selectedProducts.length} produto(s) selecionado(s) no Cardápio?`)) return;

    selectedProducts.forEach(product => updateProduct({ ...product, active }));
    setFeedback({
      tone: 'success',
      title: active ? 'Produtos ativados' : 'Produtos desativados',
      description: `${selectedProducts.length} produto(s) foram atualizados${supabaseOnline ? ' e serão sincronizados com a nuvem.' : ' neste dispositivo.'}`,
    });
    setSelectedProductIds([]);
  };

  const handleBulkRetrySync = async () => {
    const pendingProducts = selectedProducts.filter(product => productSyncErrors[product.id]);
    if (pendingProducts.length === 0) {
      setFeedback({ tone: 'warning', title: 'Nenhuma pendência selecionada', description: 'Selecione produtos com erro de sincronização para reenviá-los.' });
      return;
    }

    const results = await Promise.allSettled(pendingProducts.map(product => retrySyncProduct(product)));
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    pendingProducts.forEach((product, index) => {
      if (results[index].status === 'fulfilled') clearSyncError(product.id);
    });
    setFeedback({
      tone: successCount === pendingProducts.length ? 'success' : 'warning',
      title: successCount === pendingProducts.length ? 'Sincronização concluída' : 'Sincronização parcial',
      description: `${successCount} de ${pendingProducts.length} produto(s) foram enviados. As falhas continuam identificadas para uma nova tentativa.`,
    });
  };

  const handleDeleteProduct = (product: Product) => {
    if (!window.confirm(`Excluir ${product.name} do Cardápio? Esta ação não pode ser desfeita.`)) return;
    deleteProduct(product.id);
    setFeedback({
      tone: 'success',
      title: 'Produto excluído',
      description: `${product.name} foi removido do Cardápio.`,
    });
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
      <OperationFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h2 className={ui.pageTitle}>Cardápio</h2>
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
            <Plus className="w-4 h-4" /> Cadastrar produto
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Diagnóstico do Cardápio">
        {(Object.keys(productStatusLabels) as ProductStatusFilter[]).map(filter => (
          <button
            key={filter}
            type="button"
            aria-pressed={statusFilter === filter}
            onClick={() => setStatusFilter(filter)}
            className={`min-h-16 rounded-lg border px-4 py-3 text-left transition-colors ${statusFilter === filter ? 'border-[#475569] bg-[#475569]/10' : isDark ? 'border-[#2C2C2E] bg-[#1C1C1E]' : 'border-gray-100 bg-white'}`}
          >
            <span className="block text-lg font-bold">{productStatusCounts[filter]}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-50">{productStatusLabels[filter]}</span>
          </button>
        ))}
      </div>

      {!supabaseOnline && (
        <OperationalState
          variant="offline"
          title="Cardápio em modo local"
          description="As alterações permanecem neste dispositivo até a conexão e a sessão com a nuvem serem restabelecidas."
          compact
        />
      )}

      {supabaseOnline && syncErrorCount > 0 && (
        <OperationalState
          variant="error"
          title="Sincronização pendente"
          description={`${syncErrorCount} ${syncErrorCount === 1 ? 'produto precisa' : 'produtos precisam'} ser reenviado. Use “Erro Sync” no produto para tentar novamente.`}
          compact
        />
      )}

      {filteredProducts.length > 0 && (
        <div className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${isDark ? 'border-[#2C2C2E] bg-[#1C1C1E]' : 'border-gray-100 bg-white'}`}>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-xs font-bold">
            <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisibleProducts} className="h-5 w-5 accent-[#475569]" />
            Selecionar resultados visíveis ({filteredProducts.length})
          </label>
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-bold uppercase opacity-50">{selectedProducts.length} selecionado(s)</span>
              <button type="button" onClick={() => handleBulkAvailability(true)} className="min-h-10 rounded-lg bg-emerald-500/10 px-4 text-[9px] font-bold uppercase text-emerald-600">Ativar</button>
              <button type="button" onClick={() => handleBulkAvailability(false)} className="min-h-10 rounded-lg bg-red-500/10 px-4 text-[9px] font-bold uppercase text-red-500">Desativar</button>
              {supabaseOnline && <button type="button" onClick={handleBulkRetrySync} className="min-h-10 rounded-lg bg-blue-500/10 px-4 text-[9px] font-bold uppercase text-blue-600">Reenviar pendências</button>}
              <button type="button" onClick={() => setSelectedProductIds([])} className="min-h-10 rounded-lg px-3 text-[9px] font-bold uppercase opacity-50">Limpar seleção</button>
            </div>
          )}
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <OperationalState
          variant="empty"
          title={products.length === 0 ? 'Cardápio ainda vazio' : 'Nenhum produto encontrado'}
          description={products.length === 0
            ? 'Cadastre o primeiro produto para começar a vender no PDV.'
            : 'Revise a busca ou a categoria selecionada para voltar a exibir produtos.'}
          actionLabel={products.length === 0 ? 'Cadastrar produto' : 'Limpar filtros'}
          onAction={() => {
            if (products.length === 0) openModal();
            else {
              setSearchTerm('');
              setSelectedCategory('Todas');
              setStatusFilter('todos');
            }
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(p => {
            const cost = calculateProductionCost(p.recipe);
            const margin = ((p.price - cost) / p.price) * 100;
            const hasRecipe = p.recipe && p.recipe.length > 0;
            const isRecipeIncomplete = hasRecipe && p.recipe!.some(r => !stockItems.some(si => si.id === r.stockItemId));

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
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleProductSelection(p.id)}
                      aria-label={`Selecionar ${p.name}`}
                      className="h-5 w-5 flex-shrink-0 accent-[#475569]"
                    />
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                      {getIcon(p.category, p.name)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      {p.active === false && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[8px] font-bold uppercase tracking-wider w-fit">Inativo</span>
                      )}
                      {supabaseOnline && (
                        productSyncErrors[p.id] ? (
                          <button type="button" className="flex items-center gap-1 text-red-500 hover:underline" title={`Erro ao sincronizar: ${productSyncErrors[p.id]}. Clique para re-sincronizar.`} onClick={async (e) => {
                            e.stopPropagation();
                            await handleRetrySync(p);
                          }}>
                            <CloudOff className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[8px] font-bold uppercase tracking-wider underline">Erro Sync</span>
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
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => openModal(p)} className="p-2.5 rounded-xl hover:bg-[#475569]/10 hover:text-[#475569] transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteProduct(p)} className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all" aria-label={`Excluir ${p.name}`}><Trash2 className="w-4 h-4" /></button>
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
                    {hasRecipe ? (
                      isRecipeIncomplete ? (
                        <div className="text-[8px] font-bold text-red-500 uppercase tracking-wide bg-red-500/5 px-2 py-1 rounded-lg w-fit">Ficha Incompleta</div>
                      ) : (
                        <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wide">
                          <span className="opacity-20">Margem Estimada</span>
                          <span className={margin > 60 ? 'text-emerald-500' : 'text-amber-500'}>{margin.toFixed(0)}%</span>
                        </div>
                      )
                    ) : (
                      <div className="text-[8px] font-bold text-amber-500 uppercase tracking-wide bg-amber-500/5 px-2 py-1 rounded-lg w-fit" title="Sem ficha técnica: não baixa estoque automaticamente">Sem Ficha Técnica</div>
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
                const hasRecipe = p.recipe && p.recipe.length > 0;
                const isRecipeIncomplete = hasRecipe && p.recipe!.some(r => !stockItems.some(si => si.id === r.stockItemId));
                return (
                  <tr key={p.id} className="group hover:bg-current/[0.01] transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                          aria-label={`Selecionar ${p.name}`}
                          className="h-5 w-5 flex-shrink-0 accent-[#475569]"
                        />
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
                                <button type="button" className="flex items-center gap-1 text-red-500 hover:underline" title={`Erro ao sincronizar: ${productSyncErrors[p.id]}. Clique para re-sincronizar.`} onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleRetrySync(p);
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
                       {hasRecipe ? (
                          isRecipeIncomplete ? (
                             <span className="px-2 py-1 rounded bg-red-500/10 text-[9px] font-bold uppercase tracking-wide text-red-500" title="Insumos faltando ou excluídos">Incompleta</span>
                          ) : (
                             <span className="text-[10px] font-bold opacity-40">{p.recipe!.length} itens</span>
                          )
                       ) : (
                          <span className="px-2 py-1 rounded bg-amber-500/10 text-[9px] font-bold uppercase tracking-wide text-amber-500">Sem Ficha</span>
                       )}
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
                          <button onClick={() => handleDeleteProduct(p)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500" aria-label={`Excluir ${p.name}`}><Trash2 className="w-4 h-4" /></button>
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
                  <h3 className="text-2xl font-bold uppercase  tracking-tighter">{editingProduct ? 'Editar produto' : 'Cadastrar produto'}</h3>
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
                            {stockItems.map(si => <option key={si.id} value={si.id}>{si.name} - saldo: {formatStockQuantity(si.currentStock, si.unit)}</option>)}
                          </select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[8px] font-bold uppercase tracking-wide opacity-30 ml-2">Quantidade ({stockItems.find(si => si.id === item.stockItemId)?.unit || '?'})</label>
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
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold uppercase tracking-wide opacity-40">Custo Total de Produção</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-500">Margem Estimada: {editingProduct ? (((editingProduct.price - calculateProductionCost(recipeItems)) / editingProduct.price) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <span className="font-mono font-bold text-sm">R$ {calculateProductionCost(recipeItems).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 h-16 rounded-lg font-bold uppercase tracking-wide text-[10px] ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>Cancelar</button>
                  <button type="submit" className="flex-[2] h-16 rounded-lg bg-[#475569] text-white font-bold uppercase tracking-wide text-[10px] shadow-sm">{editingProduct ? 'Salvar alterações' : 'Cadastrar produto'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
