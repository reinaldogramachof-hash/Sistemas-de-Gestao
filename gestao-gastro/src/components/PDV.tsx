import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Product, Order } from '../types';
import { formatCurrency } from '../utils/format';
import { MenuList } from './MenuList';
import { getProductIcon } from '../utils/productIcons';
import { ArrowRight, Check, ChevronDown, Minus, Package, Plus, Search, ShoppingBag, Tag, Trash2, User, X } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { AnimatePresence, motion } from 'motion/react';
import { useAudit } from '../hooks/useAudit';
import { allocateComboItems, calcComboOriginalPrice, getProductDiscount } from '../services/salesService';
import { validateStock } from '../services/stockGuard';
import { HelpTooltip } from './HelpTooltip';
import { OperationFeedback, type OperationFeedbackMessage } from './OperationFeedback';
import { OperationalState } from './OperationalState';

export const PDV: React.FC = () => {
  const { collaborators, currentEmpresa, waiters, theme, promotions, campaigns, combos, products, customers, draftOrder, setDraftOrder, clearDraftOrder, stockItems, supabaseOnline } = useApp();
  const isDark = theme === 'dark';
  const activeOperators = collaborators.filter(c => c.status === 'active');
  const systemOperator = {
    id: 'responsavel-padrao',
    name: 'Responsável Padrão',
    role: 'cashier',
    status: 'active'
  };
  const hasOperators = activeOperators.length > 0;
  const initialOperatorId = hasOperators ? activeOperators[0].id : (waiters[0]?.id ?? systemOperator.id);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(
    () => draftOrder?.waiterId ?? initialOperatorId
  );
  const [waiterMenuOpen, setWaiterMenuOpen] = useState(false);
  const [comboMenuOpen, setComboMenuOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [feedback, setFeedback] = useState<OperationFeedbackMessage | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K -> Search
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      const target = event.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      
      // Permitir ESC em qualquer lugar para fechar modais
      if (event.key === 'Escape') {
        setManualModalOpen(false);
        setComboMenuOpen(false);
        setWaiterMenuOpen(false);
        setCheckoutOpen(false);
        setFeedback(null);
        return;
      }

      // Evita atalhos se o usuário estiver digitando (exceto F-keys)
      if (isInput && !event.key.startsWith('F')) return;

      switch (event.key) {
        case 'F2':
          event.preventDefault();
          setManualModalOpen(true);
          break;
        case 'F3':
          event.preventDefault();
          document.getElementById('pdv-customer-select')?.focus();
          break;
        case 'F4':
          event.preventDefault();
          setWaiterMenuOpen(prev => !prev);
          break;
        case 'F7':
          event.preventDefault();
          document.getElementById('btn-checkout')?.click();
          break;
        case 'F9':
          event.preventDefault();
          document.getElementById('btn-cancel-order')?.click();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const createOrder = (waiterId = selectedOperatorId): Order => ({
    id: Date.now().toString(),
    empresaId: currentEmpresa.id,
    mode: 'balcao',
    items: [],
    subtotal: 0,
    serviceCharge: 0,
    total: 0,
    payments: [],
    status: 'open',
    waiterId: waiterId || initialOperatorId,
    timestamp: new Date().toISOString(),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todos');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { log } = useAudit();

  useEffect(() => {
    if (!draftOrder) {
      setDraftOrder(createOrder(selectedOperatorId));
    }
  }, [draftOrder, selectedOperatorId, setDraftOrder]);

  const categories = ['Todos', ...Array.from(new Set(products.filter(p => p.active !== false).map(p => p.category)))];
  const activeOrder = draftOrder ?? createOrder(selectedOperatorId);
  const selectedCustomerId = activeOrder.customerId ?? '';
  const totalItems = activeOrder.items.reduce((acc, item) => acc + item.quantity, 0);
  const panelClass = isDark ? 'bg-surface border-border' : 'bg-surface-light border-border-light';
  const fieldClass = isDark ? 'bg-elevated border-border' : 'bg-elevated-light border-border-light';
  const selectedOperatorName =
    activeOperators.find(c => c.id === selectedOperatorId)?.name ??
    (selectedOperatorId === systemOperator.id ? systemOperator.name : (waiters.find(w => w.id === selectedOperatorId)?.name ?? 'Nenhum atendente cadastrado'));

  const updateActiveOrder = (updater: (order: Order) => Order) => {
    setDraftOrder(previous => updater(previous ?? createOrder(selectedOperatorId)));
  };

  const addItemToOrder = (product: Product) => {
    const existingItem = activeOrder.items.find(item => item.product.id === product.id && !item.comboId);
    const currentQty = existingItem ? existingItem.quantity : 0;

    const validation = validateStock(product, stockItems, currentQty, 1);
    if (!validation.available) {
      const incompleteRecipe = validation.insufficientItemName === 'Insumo não cadastrado';
      setFeedback({
        tone: 'error',
        title: 'Venda bloqueada',
        description: incompleteRecipe
          ? `Ficha Técnica incompleta: ${product.name} precisa ser revisado no Cardápio antes de vender.`
          : `${validation.insufficientItemName || product.name} não possui saldo suficiente. Ajuste a quantidade ou confira o Estoque.`,
      });
      return;
    }

    setFeedback(null);

    const discountInfo = getProductDiscount(product, promotions, campaigns);
    const itemPrice = Math.max(0, product.price - (discountInfo?.discount || 0));
    const existingIdx = activeOrder.items.findIndex(item =>
      item.product.id === product.id &&
      !item.comboId &&
      item.promotionName === discountInfo?.promotionName
    );
    let updatedItems = [...activeOrder.items];

    if (existingIdx !== -1) {
      updatedItems[existingIdx] = {
        ...updatedItems[existingIdx],
        quantity: updatedItems[existingIdx].quantity + 1,
      };
    } else {
      updatedItems.push({
        id: Date.now().toString() + Math.random(),
        product,
        quantity: 1,
        price: itemPrice,
        originalPrice: discountInfo ? product.price : undefined,
        discount: discountInfo?.discount,
        promotionName: discountInfo?.promotionName,
        addedAt: new Date().toISOString(),
      });
    }

    const subtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    updateActiveOrder(order => ({ ...order, items: updatedItems, subtotal, total: subtotal }));
  };

  const changeItemQty = (itemId: string, delta: number) => {
    const updatedItems = activeOrder.items
      .map(item => item.id === itemId ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0);
    const subtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    updateActiveOrder(order => ({ ...order, items: updatedItems, subtotal, total: subtotal }));
  };

  const addComboToOrder = (comboId: string) => {
    const combo = combos.find(item => item.id === comboId);
    if (!combo) return;
    const comboItems = allocateComboItems(combo, products).map(item => ({
      id: Date.now().toString() + Math.random(),
      product: item.product,
      quantity: item.quantity,
      price: item.unitPrice,
      originalPrice: item.originalPrice,
      discount: item.discount,
      promotionName: item.promotionName,
      comboId: item.comboId,
      addedAt: new Date().toISOString(),
    }));

    if (comboItems.length === 0) {
      setFeedback({
        tone: 'warning',
        title: 'Combo indisponível',
        description: 'Este combo não possui itens válidos. Revise a composição no Cardápio antes de lançar a venda.',
      });
      return;
    }
    const updatedItems = [...activeOrder.items, ...comboItems];
    const subtotal = updatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    updateActiveOrder(order => ({ ...order, items: updatedItems, subtotal, total: subtotal }));
    setComboMenuOpen(false);
  };

  const handleSelectOperator = (id: string) => {
    setSelectedOperatorId(id);
    setWaiterMenuOpen(false);
    updateActiveOrder(order => ({ ...order, waiterId: id }));
  };

  const handleSelectCustomer = (id: string) => {
    const customer = customers.find(item => item.id === id);
    updateActiveOrder(order => ({ ...order, customerId: id || undefined, customerName: customer?.name }));
  };

  const addManualItem = () => {
    const price = parseFloat(manualPrice.replace(',', '.'));
    if (!manualName.trim() || isNaN(price) || price <= 0) {
      setFeedback({
        tone: 'warning',
        title: 'Revise o item avulso',
        description: 'Informe uma descrição e um valor maior que zero para adicionar o item ao carrinho.',
      });
      return;
    }

    const manualProduct: Product = {
      id: 'manual-' + Date.now(),
      empresaId: currentEmpresa.id,
      name: manualName,
      description: 'Item avulso',
      price,
      category: 'Avulso',
    };

    addItemToOrder(manualProduct);
    log('product_add', `Venda avulsa: ${manualName} - ${formatCurrency(price)}`);
    setManualModalOpen(false);
    setManualName('');
    setManualPrice('');
  };

  const handleSuccess = () => {
    setCheckoutOpen(false);
    clearDraftOrder();
    setFeedback({
      tone: 'success',
      title: 'Venda finalizada',
      description: 'O pagamento foi registrado e o PDV está pronto para iniciar uma nova venda.',
    });
  };

  const handleCancelOrder = () => {
    if (activeOrder.items.length > 0 && !window.confirm('Deseja cancelar o pedido? Todos os itens serão removidos.')) {
      return;
    }
    if (activeOrder.items.length > 0) {
      log('order_cancel', 'Pedido/Carrinho foi cancelado no balcão', {
        subtotal: activeOrder.subtotal,
        itemsCount: activeOrder.items.length
      });
    }
    clearDraftOrder();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-112px)] gap-5">
      <OperationFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <section className="flex-1 flex flex-col min-w-0">
        {!supabaseOnline && (
          <div className="mb-4">
            <OperationalState
              variant="offline"
              title="PDV em modo local"
              description="As vendas permanecem neste dispositivo. Confirme a conexão antes de continuar a operação em outro terminal."
              compact
            />
          </div>
        )}
        <div className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-semibold leading-none">Venda Rápida</h2>
              <HelpTooltip moduleKey="pdv" />
            </div>
            <p className="text-sm text-muted">Atendimento direto no Balcão</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setComboMenuOpen(true)}
              className={`shrink-0 flex items-center gap-2 px-4 h-10 rounded-control border font-medium text-sm text-accent transition-all hover:bg-accent/10 ${fieldClass}`}
            >
              <Package className="w-4 h-4" />
              Combos
            </button>
            <button
              onClick={() => setManualModalOpen(true)}
              className={`shrink-0 flex items-center gap-2 px-4 h-10 rounded-control border border-dashed font-medium text-sm text-accent transition-all hover:bg-accent/10 ${fieldClass}`}
            >
              <Plus className="w-4 h-4" />
              Avulso
            </button>
            <div className={`flex items-center px-3 h-10 rounded-control border w-full md:w-80 transition-all focus-within:ring-2 focus-within:ring-accent/20 ${fieldClass}`}>
              <Search className="w-4 h-4 mr-3 text-muted" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Pesquisar produto..."
                aria-label="Pesquisar produto"
                aria-keyshortcuts="Control+K Meta+K"
                className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-muted"
              />
            </div>
          </div>
        </div>

        <div className="relative mb-5 max-w-full">
          <div className={`flex p-1 gap-1 rounded-panel border overflow-x-auto scrollbar-none pr-10 ${fieldClass}`} aria-label="Categorias de produtos">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-control text-sm font-medium transition-all ${
                  category === cat
                    ? 'bg-accent text-white'
                    : isDark ? 'text-muted hover:bg-surface hover:text-text' : 'text-muted-light hover:bg-surface-light hover:text-text-light'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[9px] font-bold uppercase tracking-wide ${isDark ? 'bg-surface/90 text-muted' : 'bg-surface-light/90 text-muted-light'}`}>
            Deslize
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <MenuList category={category} searchTerm={searchTerm} onSelect={addItemToOrder} />
        </div>
      </section>

      <aside className={`w-full lg:w-[420px] flex flex-col rounded-panel border overflow-hidden shrink-0 ${panelClass}`}>
        <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'bg-elevated border-border' : 'bg-elevated-light border-border-light'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-panel bg-accent flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Carrinho</h3>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{totalItems} itens</span>
                <span>•</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedOperatorName}</span>
              </div>
            </div>
          </div>
          <button
              id="btn-cancel-order"
              onClick={handleCancelOrder}
            className="p-2 rounded-control transition-all hover:bg-danger/10 hover:text-danger text-muted"
            aria-label="Limpar carrinho"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className={`px-5 py-3 border-b ${isDark ? 'bg-elevated border-border' : 'bg-elevated-light border-border-light'}`}>
          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <button
                onClick={() => setWaiterMenuOpen(open => !open)}
                className={`w-full h-10 px-3 rounded-control border flex items-center justify-between text-sm font-medium transition-all ${fieldClass}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-muted shrink-0" />
                  <span className="truncate">{selectedOperatorName}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-muted transition-transform ${waiterMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {waiterMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setWaiterMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={`absolute left-0 right-0 top-full mt-2 rounded-panel border shadow-2xl overflow-hidden z-20 ${panelClass}`}
                    >
                      {activeOperators.length === 0 ? (
                        <div className="p-4 text-xs text-muted text-center font-bold uppercase leading-normal border-b border-dashed border-current/10">
                          Nenhum atendente/garçom ativo. <br/>
                          Usando: <strong>Responsável Padrão</strong>.<br/>
                          Cadastre a equipe em <br/>
                          <span className="text-accent underline">Configurações &gt; Acessos</span>.
                        </div>
                      ) : null}
                      {(hasOperators ? activeOperators : [systemOperator]).map(operator => (
                        <button
                          key={operator.id}
                          onClick={() => handleSelectOperator(operator.id)}
                          className={`w-full flex items-center justify-between px-3 py-3 text-sm font-medium transition-colors ${
                            selectedOperatorId === operator.id
                              ? 'bg-accent text-white'
                              : isDark ? 'hover:bg-elevated' : 'hover:bg-elevated-light'
                          }`}
                        >
                          {operator.name}
                          {selectedOperatorId === operator.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <select
              id="pdv-customer-select"
              value={selectedCustomerId}
              onChange={event => handleSelectCustomer(event.target.value)}
              className={`w-full h-10 px-3 rounded-control border text-sm font-medium outline-none ${fieldClass}`}
            >
              <option value="">Cliente nao identificado</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          <AnimatePresence initial={false}>
            {activeOrder.items.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center py-20 text-center space-y-3 text-muted">
                <ShoppingBag className="w-10 h-10" />
                <div>
                  <p className="text-sm font-medium">O carrinho está vazio</p>
                  <p className="text-xs mt-1">Selecione produtos ao lado para iniciar a venda.</p>
                </div>
              </motion.div>
            ) : activeOrder.items.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-panel transition-colors ${isDark ? 'bg-elevated hover:bg-white/10' : 'bg-elevated-light hover:bg-gray-100'}`}
              >
                <div className={`w-9 h-9 rounded-panel flex items-center justify-center ${isDark ? 'bg-surface' : 'bg-surface-light'}`}>
                  {(() => {
                    const Icon = getProductIcon(item.product.category, item.product.name);
                    return <Icon className="w-4 h-4 text-muted" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-xs text-muted line-through">{formatCurrency(item.originalPrice)}</span>
                    )}
                    <span className="text-xs text-muted">{formatCurrency(item.price)}</span>
                  </div>
                  {item.promotionName && item.discount && item.discount > 0 && (
                    <p className="mt-1 w-fit px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-semibold">
                      Promocao: -{formatCurrency(item.discount)} ({item.promotionName})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => changeItemQty(item.id, -1)}
                    className={`w-11 h-11 rounded-control flex items-center justify-center border transition-all active:scale-95 ${
                      item.quantity === 1 ? 'border-danger/20 text-danger hover:bg-danger/10' : isDark ? 'border-border hover:bg-surface' : 'border-border-light hover:bg-surface-light'
                    }`}
                    aria-label={item.quantity === 1 ? `Remover ${item.product.name} do carrinho` : `Diminuir quantidade de ${item.product.name}`}
                  >
                    {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <span
                    className="w-5 text-center text-sm font-semibold"
                    aria-live="polite"
                    aria-label={`Quantidade de ${item.product.name}`}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => addItemToOrder(item.product)}
                    className={`w-11 h-11 rounded-control flex items-center justify-center border transition-all active:scale-95 ${isDark ? 'border-border hover:bg-accent/10 hover:text-accent' : 'border-border-light hover:bg-surface-light hover:text-accent'}`}
                    aria-label={`Aumentar quantidade de ${item.product.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className={`p-5 border-t space-y-4 ${isDark ? 'bg-elevated border-border' : 'bg-elevated-light border-border-light'}`}>
          <div className="flex justify-between items-end gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted">Total do pedido</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-accent">R$</span>
                <span className="text-3xl font-semibold text-accent">{activeOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button
              id="btn-checkout"
              disabled={activeOrder.items.length === 0}
              onClick={() => {
                if (!selectedOperatorId) {
                  setFeedback({
                    tone: 'warning',
                    title: 'Selecione um atendente',
                    description: 'Escolha um atendente no topo do carrinho ou cadastre um acesso ativo em Configurações > Acessos.',
                  });
                  return;
                }
                setCheckoutOpen(true);
              }}
              className="flex items-center gap-2 px-5 h-11 bg-accent text-white rounded-control font-medium text-sm hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
            >
              Finalizar venda
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 text-xs text-muted border-t pt-3 border-current/10">
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>Ctrl+K</kbd>
              <span>Buscar</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>F2</kbd>
              <span>Avulso</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>F3</kbd>
              <span>Cliente</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>F4</kbd>
              <span>Atendente</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>F7</kbd>
              <span>Pagar</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>F9</kbd>
              <span>Limpar</span>
            </span>
            <span className="flex items-center gap-2">
              <kbd className={`px-2 py-0.5 rounded-md border font-semibold font-mono text-[10px] shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>ESC</kbd>
              <span>Sair</span>
            </span>
          </div>
        </div>
      </aside>

      {checkoutOpen && (
        <CheckoutModal order={activeOrder} onClose={() => setCheckoutOpen(false)} onSuccess={handleSuccess} />
      )}

      {comboMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-2xl rounded-panel border shadow-2xl overflow-hidden ${panelClass}`}
          >
            <div className={`px-5 py-4 flex items-center justify-between border-b ${isDark ? 'border-border' : 'border-border-light'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-panel bg-accent text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Combos disponiveis</h3>
                  <p className="text-xs text-muted">Lance todos os itens do combo pelo preco promocional.</p>
                </div>
              </div>
              <button onClick={() => setComboMenuOpen(false)} className="p-2 rounded-control hover:bg-current/10 text-muted" aria-label="Fechar combos">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
              {combos.filter(combo => combo.active).map(combo => {
                const original = calcComboOriginalPrice(combo, products);
                return (
                  <button
                    key={combo.id}
                    onClick={() => addComboToOrder(combo.id)}
                    className={`text-left rounded-panel border overflow-hidden transition-all hover:border-accent ${fieldClass}`}
                  >
                    {combo.imageBase64 ? (
                      <img src={combo.imageBase64} alt={combo.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="h-28 flex items-center justify-center bg-current/5"><Package className="w-8 h-8 text-muted" /></div>
                    )}
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="text-sm font-semibold">{combo.name}</p>
                        <p className="text-xs text-muted">{combo.description || 'Combo promocional'}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-muted line-through">{formatCurrency(original)}</p>
                          <p className="text-base font-semibold text-accent">{formatCurrency(combo.comboPrice)}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success/15 text-success">
                          Add combo
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {combos.filter(combo => combo.active).length === 0 && (
                <div className="col-span-full py-10 text-center text-sm text-muted">Nenhum combo ativo no momento.</div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md rounded-panel border shadow-2xl overflow-hidden ${panelClass}`}
          >
            <div className={`px-5 py-4 flex items-center justify-between border-b ${isDark ? 'border-border' : 'border-border-light'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-panel bg-accent text-white flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Venda Avulsa</h3>
                  <p className="text-xs text-muted">Adicionar item manual ao carrinho</p>
                </div>
              </div>
              <button
                onClick={() => setManualModalOpen(false)}
                className="p-2 rounded-control transition-all hover:bg-danger/10 hover:text-danger text-muted"
                aria-label="Fechar venda avulsa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <label className="space-y-1 block">
                <span className="text-xs text-muted">Descrição</span>
                <input
                  autoFocus
                  value={manualName}
                  onChange={event => setManualName(event.target.value)}
                  placeholder="Ex: item avulso"
                  className={`w-full h-10 px-3 rounded-control border bg-transparent outline-none text-sm font-medium placeholder:text-muted ${fieldClass}`}
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-xs text-muted">Valor</span>
                <div className={`relative h-10 rounded-control border ${fieldClass}`}>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
                  <input
                    value={manualPrice}
                    onChange={event => setManualPrice(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && addManualItem()}
                    placeholder="0,00"
                    className="w-full h-full bg-transparent outline-none text-sm font-medium pl-10 pr-3 placeholder:text-muted"
                  />
                </div>
              </label>
            </div>
            <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'bg-elevated border-border' : 'bg-elevated-light border-border-light'}`}>
              <button
                onClick={() => setManualModalOpen(false)}
                className={`h-10 px-4 rounded-control text-xs font-medium border transition-colors ${fieldClass}`}
              >
                Cancelar
              </button>
              <button
                onClick={addManualItem}
                className="h-10 px-4 rounded-control bg-accent text-white text-xs font-medium hover:bg-accent-hover"
              >
                Adicionar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
