import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, Table, Order, Waiter, Expense, CashierSession, PaymentItem, Customer, Collaborator, StockMovement, StockItem, Supplier, AppSettings, KitchenItemStatus, Promotion, Combo, Campaign, LoyaltyConfig, LoyaltyEntry } from '../types';
import { mockProducts, mockTables, mockWaiters, mockCustomers, mockCollaborators, mockStockItems, mockSuppliers, mockSettings } from './mock';
import { cantinhoDaResenhaProducts } from './cantinhoDaResenhaSeed';
import { CANTINHO_DA_RESENHA_SLUG, getClientRouteFromPath } from '../config/clientRoutes';
import { useTables } from '../hooks/useTables';
import { useOrders } from '../hooks/useOrders';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { setTableOccupied, clearTable as clearTableSupabase } from '../services/tablesSupabaseService';
import { createOrder as createOrderSupabase, closeOrder as closeOrderSupabase } from '../services/ordersSupabaseService';
import { syncProduct } from '../services/menuSupabaseService';

const TENANT_ID = import.meta.env.VITE_GASTRO_TENANT_ID as string;
const LOCAL_TENANT_ID = 'default-empresa';

interface AppState {
  products: Product[];
  stockItems: StockItem[];
  suppliers: Supplier[];
  tables: Table[];
  waiters: Waiter[];
  orders: Order[];
  expenses: Expense[];
  cashierSession: CashierSession | null;
  cashierHistory: CashierSession[];
  customers: Customer[];
  collaborators: Collaborator[];
  stockMovements: StockMovement[];
  settings: AppSettings;
  readGuides: string[];
  theme: 'dark' | 'light';
  draftOrder: Order | null;
  promotions: Promotion[];
  combos: Combo[];
  campaigns: Campaign[];
  currentEmpresa: { id: string; name: string; tenantId: string };
  currentUser: { id: string; name: string; role: string };
  supabaseOnline: boolean;
  loyaltyConfig: LoyaltyConfig;
  loyaltyEntries: LoyaltyEntry[];
  productSyncErrors: Record<string, string>;
}

interface AppContextType extends AppState {
  setTheme: (theme: 'dark' | 'light') => void;
  updateProduct: (product: Product) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  retrySyncProduct: (product: Product) => Promise<void>;
  clearSyncError: (id: string) => void;
  reloadCollaborators: () => Promise<void>;
  updateStockItem: (item: StockItem) => void;
  addStockItem: (item: StockItem) => void;
  deleteStockItem: (id: string) => void;
  updateSupplier: (supplier: Supplier) => void;
  addSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  updateTable: (table: Table) => void;
  updateOrder: (order: Order) => void;
  addOrder: (order: Order) => void;
  closeOrder: (order: Order, payments: PaymentItem[], serviceCharge: number) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  openCashier: (initialBalance?: number) => void;
  closeCashier: (tipsTotal: number, countedCash?: number) => void;
  transferTable: (from: number, to: number) => void;
  mergeTables: (source: number, target: number) => void;
  reserveTable: (numbers: number[], reason: string) => void;
  clearTable: (number: number) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  updateCollaborator: (collaborator: Collaborator) => void;
  deleteCollaborator: (id: string) => void;
  addStockMovement: (movement: StockMovement) => void;
  updateSettings: (settings: AppSettings) => void;
  toggleGuideRead: (guideId: string) => void;
  importData: (json: string) => void;
  exportData: () => string;
  resetToMocks: () => void;
  setDraftOrder: (order: Order | null) => void;
  clearDraftOrder: () => void;
  updateOrderItemKitchenStatus: (orderId: string, itemIndex: number, status: KitchenItemStatus) => void;
  addLoyaltyEntry: (entry: Omit<LoyaltyEntry, 'id' | 'empresaId' | 'createdAt'>) => void;
  initializeTables: (count: number) => Promise<void>;
}

const getTenantKey = (key: string): string => {
  const routeTenantId = getClientRouteFromPath(window.location.pathname)?.tenantId;
  const configuredTenantId = import.meta.env.VITE_GASTRO_TENANT_ID as string;
  const currentTenantId = routeTenantId || configuredTenantId || LOCAL_TENANT_ID;

  if (import.meta.env.PROD && currentTenantId === LOCAL_TENANT_ID) {
    throw new Error('Tenant ID ausente. Operação remota bloqueada.');
  }

  return `gestao_gastro:${currentTenantId}:${key}`;
};

const parseJSON = <T,>(key: string, fallback: T): T => {
  try {
    const tenantKey = getTenantKey(key);
    const item = localStorage.getItem(tenantKey);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientRoute = getClientRouteFromPath(window.location.pathname);
  const effectiveTenantId = clientRoute?.tenantId || TENANT_ID;
  const isSaaS = Boolean(effectiveTenantId && effectiveTenantId !== LOCAL_TENANT_ID);

  const isCantinhoRoute = clientRoute?.slug === CANTINHO_DA_RESENHA_SLUG;
  const defaultProducts = isCantinhoRoute
    ? cantinhoDaResenhaProducts
    : mockProducts;

  // The Cantinho menu remains visible while its authenticated remote catalog loads.
  const initialProductsFallback = isSaaS && !isCantinhoRoute ? [] : defaultProducts;
  const initialStockFallback = isSaaS ? [] : mockStockItems;
  const initialSuppliersFallback = isSaaS ? [] : mockSuppliers;
  const initialTablesFallback = isSaaS ? [] : mockTables;
  const initialWaitersFallback = isSaaS ? [] : mockWaiters;
  const initialCustomersFallback = isSaaS ? [] : mockCustomers;
  const initialCollaboratorsFallback = isSaaS ? [] : mockCollaborators;
  const initialSettingsFallback = mockSettings;

  const [products, setProducts] = useState<Product[]>(() => parseJSON('products', initialProductsFallback));
  const [stockItems, setStockItems] = useState<StockItem[]>(() => parseJSON('stockItems', initialStockFallback));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => parseJSON('suppliers', initialSuppliersFallback));

  // Mesas e pedidos: controlados pelos hooks Supabase quando online, ou pelo estado local
  const [localTables, setLocalTables] = useState<Table[]>(() => {
    const saved = parseJSON<Table[]>('tables', initialTablesFallback);
    if (!isSaaS && saved.length !== initialTablesFallback.length) {
      return initialTablesFallback;
    }
    return saved;
  });

  const [localOrders, setLocalOrders] = useState<Order[]>(() => parseJSON('orders', []));
  const [waiters] = useState<Waiter[]>(() => parseJSON('waiters', initialWaitersFallback));
  const [expenses, setExpenses] = useState<Expense[]>(() => parseJSON('expenses', []));
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(() => parseJSON('cashierSession', null));
  const [cashierHistory, setCashierHistory] = useState<CashierSession[]>(() => parseJSON('cashierHistory', []));
  const [customers, setCustomers] = useState<Customer[]>(() => parseJSON('customers', initialCustomersFallback));
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => parseJSON('collaborators', initialCollaboratorsFallback));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => parseJSON('stockMovements', []));
  const [settings, setSettings] = useState<AppSettings>(() => parseJSON('settings', initialSettingsFallback));
  const [readGuides, setReadGuides] = useState<string[]>(() => parseJSON('readGuides', []));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const th = localStorage.getItem('theme');
    return th === 'dark' || th === 'light' ? th : 'dark';
  });
  const [draftOrder, setDraftOrderState] = useState<Order | null>(() => parseJSON('draftOrder', null));

  const [promotions, setPromotions] = useState<Promotion[]>(() => parseJSON('promotions', []));
  const [combos, setCombos] = useState<Combo[]>(() => parseJSON('combos', []));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => parseJSON('campaigns', []));
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>(() => parseJSON('loyaltyConfig', { empresaId: 'default-empresa', active: false, pointsPerReal: 1, redeemThreshold: 100, redeemValue: 10 }));
  const [loyaltyEntries, setLoyaltyEntries] = useState<LoyaltyEntry[]>(() => parseJSON('loyaltyEntries', []));
  const [productSyncErrors, setProductSyncErrors] = useState<Record<string, string>>(() => parseJSON('productSyncErrors', {}));
  const [productSyncIds, setProductSyncIds] = useState<Record<string, string>>(() => parseJSON('productSyncIds', {}));
  const [supabaseOnline, setSupabaseOnline] = useState(false);

  // ─── Supabase hooks (mesas e pedidos em tempo real) ───────────────────────
  const tablesHook = useTables(effectiveTenantId);
  const ordersHook = useOrders(effectiveTenantId);

  // Sincroniza estado Supabase → estado local (para persistência de fallback)
  useEffect(() => {
    if (isSupabaseConfigured && tablesHook.tables.length > 0) {
      setLocalTables(tablesHook.tables);
    }
  }, [tablesHook.tables]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Garante que pedidos abertos do Supabase estão refletidos no estado local
      setLocalOrders(prev => {
        // Mantém pedidos fechados do localStorage + substitui abertos pelo Supabase
        const closedLocal = prev.filter(o => o.status === 'closed');
        return [...closedLocal, ...ordersHook.openOrders].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersHook.openOrders]);

  // Alimenta o hook Supabase com dados locais quando offline
  useEffect(() => {
    if (!isSupabaseConfigured) {
      tablesHook.setTablesLocal(localTables);
      ordersHook.setOrdersLocal(localOrders);
    }
  // Só roda na montagem quando offline
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseConfigured]);

  // Tabelas e pedidos visíveis: Supabase quando online, local quando offline
  const tables = isSupabaseConfigured ? tablesHook.tables : localTables;
  const orders = isSupabaseConfigured
    ? [...localOrders.filter(o => o.status === 'closed'), ...ordersHook.openOrders]
    : localOrders;

  const currentTenantId = effectiveTenantId || LOCAL_TENANT_ID;
  const currentEmpresa = {
    id: currentTenantId,
    name: settings.establishment.name || clientRoute?.displayName || 'Gestão Gastro',
    tenantId: currentTenantId
  };

  const [currentUser, setCurrentUser] = useState({ id: 'admin', name: 'Administrador', role: 'admin' });

  // Monitora sessão Supabase para atualizar o currentUser
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const updateCurrentUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const userName = localStorage.getItem('gestao_gastro_user_name') || session.user.user_metadata?.display_name || session.user.email || 'Administradora';
          const userRole = localStorage.getItem('gestao_gastro_user_role') || 'admin';
          setCurrentUser({
            id: session.user.id,
            name: userName,
            role: userRole
          });
        }
      };

      updateCurrentUser();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session && session.user) {
          const userName = localStorage.getItem('gestao_gastro_user_name') || session.user.user_metadata?.display_name || session.user.email || 'Administradora';
          const userRole = localStorage.getItem('gestao_gastro_user_role') || 'admin';
          setCurrentUser({
            id: session.user.id,
            name: userName,
            role: userRole
          });
        } else {
          setCurrentUser({ id: 'admin', name: 'Administrador', role: 'admin' });
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isSupabaseConfigured]);

  // Função para recarregar colaboradores da tabela tenant_members no Supabase
  const reloadCollaborators = async () => {
    if (!isSupabaseConfigured || !supabase || !effectiveTenantId) return;
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select('user_id, role, display_name, active')
        .eq('tenant_id', effectiveTenantId);

      if (error) throw error;

      if (data) {
        const mapped: Collaborator[] = data.map((member: any) => ({
          id: member.user_id,
          name: member.display_name || 'Colaborador sem nome',
          role: member.role === 'owner' ? 'Proprietário' : member.role === 'admin' ? 'Administrador' : 'Garçom',
          email: '',
          status: member.active ? 'active' : 'inactive',
          joinedAt: new Date().toISOString().split('T')[0],
          permissions: member.role === 'owner' ? 'admin' : member.role === 'admin' ? 'admin' : 'waiter'
        }));
        setCollaborators(mapped);
        localStorage.setItem(getTenantKey('collaborators'), JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('Erro ao carregar colaboradores do Supabase:', err);
    }
  };

  // Carrega colaboradores da tabela tenant_members no Supabase na montagem/alteração do tenant
  useEffect(() => {
    reloadCollaborators();
  }, [isSupabaseConfigured, effectiveTenantId]);

  // Migração e limpeza de chaves legadas para armazenamento com prefixo de tenant
  useEffect(() => {
    const runMigration = async () => {
      const migratedKey = getTenantKey('migrated');
      const alreadyMigrated = localStorage.getItem(migratedKey);
      if (alreadyMigrated === 'true') return;

      const isCantinho = isCantinhoRoute;

      // Limpa as chaves legadas globais (não prefixadas) para liberar espaço e evitar vazamento
      const legacyKeys = [
        'stockItems', 'suppliers', 'collaborators', 'customers',
        'tables', 'orders', 'expenses', 'cashierSession',
        'cashierHistory', 'promotions', 'combos', 'campaigns'
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));

      // Se for SaaS/Cantinho da Resenha, inicializamos com as listas vazias/neutras nas novas chaves prefixadas
      if (isSaaS) {
        localStorage.setItem(getTenantKey('stockItems'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('suppliers'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('customers'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('collaborators'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('orders'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('expenses'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('stockMovements'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('cashierSession'), JSON.stringify(null));
        localStorage.setItem(getTenantKey('cashierHistory'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('promotions'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('combos'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('campaigns'), JSON.stringify([]));
        localStorage.setItem(getTenantKey('tables'), JSON.stringify([])); // Inicia sem mesas locais

        // Define configurações neutras para o Cantinho ou outro SaaS
        const neutralSettings: AppSettings = {
          establishment: {
            name: isCantinho ? 'Cantinho da Resenha' : '',
            address: '',
            phone: '',
            document: '',
            website: '',
            logo: '',
            footerNotes: '',
            operatingHours: ''
          },
          thermalPrinter: {
            enabled: false,
            autoPrint: false,
            showLogo: false,
            paperWidth: '80mm',
            testPrint: false,
            device: ''
          },
          serviceChargeRate: 0.10,
          paymentMethods: ['pix', 'credito', 'debito', 'dinheiro'],
          metadata: {
            updatedAt: new Date().toISOString(),
            source: 'system-init'
          }
        };
        localStorage.setItem(getTenantKey('settings'), JSON.stringify(neutralSettings));

        // Atualiza os estados React locais de forma imediata
        setStockItems([]);
        setSuppliers([]);
        setCustomers([]);
        setCollaborators([]);
        setLocalOrders([]);
        setExpenses([]);
        setStockMovements([]);
        setCashierSession(null);
        setCashierHistory([]);
        setLocalTables([]);
        setSettings(neutralSettings);
      }

      // Baixa o cardápio real do Supabase se online
      localStorage.setItem(migratedKey, 'true');
      localStorage.setItem('gastro_cantinho_initialized', 'true');
    };

    runMigration();
  }, [isSupabaseConfigured, effectiveTenantId, isSaaS]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSupabaseOnline(false);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSupabaseOnline(Boolean(data.session));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSupabaseOnline(Boolean(session));
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Never request tenant data before Supabase Auth restores a valid session.
  // Keep the visible catalog intact if the remote request is empty or fails.
  useEffect(() => {
    if (!isSupabaseConfigured || !effectiveTenantId || !supabaseOnline) return;

    let mounted = true;
    void import('../services/menuSupabaseService')
      .then(({ listActiveProducts }) => listActiveProducts(effectiveTenantId))
      .then(activeProducts => {
        if (!mounted || activeProducts.length === 0) return;
        setProducts(activeProducts);
        localStorage.setItem(getTenantKey('products'), JSON.stringify(activeProducts));
      })
      .catch(error => console.error('Erro ao sincronizar cardapio remoto:', error));

    return () => {
      mounted = false;
    };
  }, [supabaseOnline, effectiveTenantId]);

  useEffect(() => {
    localStorage.setItem(getTenantKey('products'), JSON.stringify(products));
    localStorage.setItem(getTenantKey('stockItems'), JSON.stringify(stockItems));
    localStorage.setItem(getTenantKey('suppliers'), JSON.stringify(suppliers));
    localStorage.setItem(getTenantKey('tables'), JSON.stringify(localTables));
    localStorage.setItem(getTenantKey('waiters'), JSON.stringify(waiters));
    localStorage.setItem(getTenantKey('orders'), JSON.stringify(localOrders));
    localStorage.setItem(getTenantKey('expenses'), JSON.stringify(expenses));
    localStorage.setItem(getTenantKey('cashierSession'), JSON.stringify(cashierSession));
    localStorage.setItem(getTenantKey('cashierHistory'), JSON.stringify(cashierHistory));
    localStorage.setItem(getTenantKey('customers'), JSON.stringify(customers));
    localStorage.setItem(getTenantKey('collaborators'), JSON.stringify(collaborators));
    localStorage.setItem(getTenantKey('stockMovements'), JSON.stringify(stockMovements));
    localStorage.setItem(getTenantKey('settings'), JSON.stringify(settings));
    localStorage.setItem(getTenantKey('readGuides'), JSON.stringify(readGuides));
    localStorage.setItem('theme', theme);
    localStorage.setItem(getTenantKey('draftOrder'), JSON.stringify(draftOrder));
    localStorage.setItem(getTenantKey('promotions'), JSON.stringify(promotions));
    localStorage.setItem(getTenantKey('combos'), JSON.stringify(combos));
    localStorage.setItem(getTenantKey('campaigns'), JSON.stringify(campaigns));
    localStorage.setItem(getTenantKey('loyaltyConfig'), JSON.stringify(loyaltyConfig));
    localStorage.setItem(getTenantKey('loyaltyEntries'), JSON.stringify(loyaltyEntries));
    localStorage.setItem(getTenantKey('productSyncErrors'), JSON.stringify(productSyncErrors));
    localStorage.setItem(getTenantKey('productSyncIds'), JSON.stringify(productSyncIds));
  }, [products, stockItems, suppliers, localTables, waiters, localOrders, expenses, cashierSession, cashierHistory, customers, collaborators, stockMovements, settings, readGuides, theme, draftOrder, promotions, combos, campaigns, loyaltyConfig, loyaltyEntries, productSyncErrors, productSyncIds]);

  const setDraftOrder = (order: Order | null) => setDraftOrderState(order);
  const clearDraftOrder = () => setDraftOrderState(null);

  const updateOrderItemKitchenStatus = (orderId: string, itemIndex: number, status: KitchenItemStatus) => {
    setLocalOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const items = o.items.map((item, idx) =>
        idx === itemIndex ? { ...item, kitchenStatus: status } : item
      );
      return { ...o, items };
    }));
  };

  const initializeTenantTables = async (count: number) => {
    if (isSupabaseConfigured) {
      await tablesHook.initialize(count);
    } else {
      const newTables: Table[] = Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        status: 'livre'
      }));
      setLocalTables(newTables);
    }
  };

  const resetToMocks = () => {
    if (isSaaS) {
      const confirmReset = window.confirm(
        "Atenção: Esta ação irá limpar todos os dados operacionais locais deste restaurante (estoque, fornecedores, clientes locais, histórico de caixa, despesas e pedidos locais).\n\n" +
        "Esta ação NÃO afeta o cardápio ou dados salvos na nuvem.\n\n" +
        "Deseja prosseguir com a limpeza?"
      );
      if (!confirmReset) return;

      const keysToClear = [
        'stockItems', 'suppliers', 'customers', 'collaborators',
        'orders', 'expenses', 'stockMovements', 'cashierSession',
        'cashierHistory', 'promotions', 'combos', 'campaigns', 'tables'
      ];
      keysToClear.forEach(k => localStorage.removeItem(getTenantKey(k)));

      window.location.reload();
    } else {
      localStorage.clear();
      window.location.reload();
    }
  };

  const exportData = () => {
    const data = {
      products, stockItems, suppliers, tables, waiters, orders, expenses,
      cashierSession, cashierHistory, customers, collaborators, stockMovements, settings, readGuides
    };
    return JSON.stringify(data, null, 2);
  };

  const importData = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.products) setProducts(data.products);
      if (data.stockItems) setStockItems(data.stockItems);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.tables) setLocalTables(data.tables);
      if (data.orders) setLocalOrders(data.orders);
      if (data.expenses) setExpenses(data.expenses);
      if (data.customers) setCustomers(data.customers);
      if (data.collaborators) setCollaborators(data.collaborators);
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.settings) setSettings(data.settings);
      if (data.readGuides) setReadGuides(data.readGuides);
      alert('Dados importados com sucesso!');
    } catch (e) {
      alert('Erro ao importar JSON. Verifique o formato.');
    }
  };

  const updateSettings = (newSettings: AppSettings) => setSettings(newSettings);

  const toggleGuideRead = (guideId: string) => {
    setReadGuides(prev =>
      prev.includes(guideId) ? prev.filter(id => id !== guideId) : [...prev, guideId]
    );
  };

  const syncProductSafely = async (product: Product) => {
    if (!supabaseOnline || !effectiveTenantId) return;

    try {
      const remoteId = await syncProduct(effectiveTenantId, product, productSyncIds[product.id]);
      setProductSyncIds(prev => ({ ...prev, [product.id]: remoteId }));
      setProductSyncErrors(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
    } catch (err) {
      setProductSyncErrors(prev => ({
        ...prev,
        [product.id]: err instanceof Error ? err.message : 'Falha na sincronização online'
      }));
    }
  };

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    void syncProductSafely(updatedProduct);
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
    void syncProductSafely(product);
  };

  const deleteProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const inactiveProduct = { ...product, active: false };
    setProducts(prev => prev.map(p => p.id === id ? inactiveProduct : p));
    void syncProductSafely(inactiveProduct);
  };

  const retrySyncProduct = async (product: Product) => {
    if (!supabaseOnline || !effectiveTenantId) {
      throw new Error('Sincronização indisponível. Entre com uma conta autorizada do restaurante.');
    }
    try {
      const remoteId = await syncProduct(effectiveTenantId, product, productSyncIds[product.id]);
      setProductSyncIds(prev => ({ ...prev, [product.id]: remoteId }));
      setProductSyncErrors(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na sincronização online';
      setProductSyncErrors(prev => ({
        ...prev,
        [product.id]: msg
      }));
      throw err;
    }
  };

  const clearSyncError = (id: string) => {
    setProductSyncErrors(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const updateStockItem = (updatedItem: StockItem) => {
    setStockItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const addStockItem = (item: StockItem) => {
    setStockItems(prev => [...prev, item]);
  };

  const deleteStockItem = (id: string) => {
    setStockItems(prev => prev.filter(i => i.id !== id));
  };

  const updateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  };

  const addSupplier = (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const updateTable = (updatedTable: Table) => {
    setLocalTables(prev => prev.map(t => t.number === updatedTable.number ? updatedTable : t));
  };

  const addOrder = (order: Order) => {
    // Local sempre (garante fallback e fechamento do caixa)
    setLocalOrders(prev => {
      if (prev.some(o => o.id === order.id)) return prev;
      return [...prev, order];
    });
    // Supabase: cria pedido e atualiza mesa se online
    if (isSupabaseConfigured && !effectiveTenantId) {
      console.error('VITE_GASTRO_TENANT_ID e obrigatorio para criar pedidos online.');
      return;
    }
    if (isSupabaseConfigured && order.mode === 'mesa' && order.tableNumber) {
      void createOrderSupabase(effectiveTenantId, {
        mode: order.mode,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        items: order.items,
        subtotal: order.subtotal,
        serviceCharge: order.serviceCharge,
        total: order.total,
        waiterId: order.waiterId,
        timestamp: order.timestamp,
      }).then(created => {
        if (created && order.tableNumber) {
          void setTableOccupied(effectiveTenantId, order.tableNumber, created.id);
        }
      }).catch(console.error);
    } else if (order.mode === 'mesa' && order.tableNumber) {
      // Fallback local: atualiza mesa no estado local
      setLocalTables(prev => prev.map(t =>
        t.number === order.tableNumber ? { ...t, status: 'ocupada', activeOrderId: order.id } : t
      ));
    }
  };

  const updateOrder = (updatedOrder: Order) => {
    setLocalOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const closeOrder = (order: Order, payments: PaymentItem[], serviceCharge: number) => {
    const orderInState = localOrders.find(o => o.id === order.id);
    if (orderInState && orderInState.status === 'closed') return;

    const closedOrder: Order = {
      ...order,
      payments,
      serviceCharge,
      status: 'closed',
      total: order.subtotal + serviceCharge,
    };

    setLocalOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      return exists
        ? prev.map(o => o.id === order.id ? closedOrder : o)
        : [...prev, closedOrder];
    });

    // Fecha pedido no Supabase e libera mesa
    if (isSupabaseConfigured && !effectiveTenantId) {
      console.error('VITE_GASTRO_TENANT_ID e obrigatorio para fechar pedidos online.');
    } else if (isSupabaseConfigured) {
      void closeOrderSupabase(effectiveTenantId, order.id, {
        payments,
        serviceCharge,
        total: order.subtotal + serviceCharge,
      }).catch(console.error);
      if (order.tableNumber) {
        void clearTableSupabase(effectiveTenantId, order.tableNumber).catch(console.error);
      }
    } else if (order.tableNumber) {
      // Fallback local
      setLocalTables(prev => prev.map(t =>
        t.number === order.tableNumber ? { ...t, status: 'livre', activeOrderId: undefined } : t
      ));
    }

    setStockItems(prevStock => {
      const nextStock = [...prevStock];
      const newMovements: StockMovement[] = [];

      order.items.forEach(item => {
        const recipe = item.product.recipe;
        if (recipe && recipe.length > 0) {
          recipe.forEach(recipeItem => {
            const idx = nextStock.findIndex(si => si.id === recipeItem.stockItemId);
            if (idx !== -1) {
              const quantityToAbate = recipeItem.quantity * item.quantity;
              nextStock[idx] = {
                ...nextStock[idx],
                currentStock: Math.max(0, nextStock[idx].currentStock - quantityToAbate)
              };

              newMovements.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                stockItemId: recipeItem.stockItemId,
                type: 'out',
                quantity: quantityToAbate,
                unitCost: nextStock[idx].costPrice,
                reason: `Venda - ${item.product.name} (Ficha Técnica)`,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
      });

      if (newMovements.length > 0) {
        setStockMovements(prevMovements => [...prevMovements, ...newMovements]);
      }

      return nextStock;
    });

    if (order.customerId) {
      setCustomers(prev => prev.map(c =>
        c.id === order.customerId
          ? {
              ...c,
              totalSpent: c.totalSpent + order.subtotal,
              loyaltyPoints: c.loyaltyPoints + Math.floor(order.subtotal / 10),
              lastVisit: new Date().toISOString()
            }
          : c
      ));
    }
  };

  const addExpense = (expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const openCashier = (initialBalance = 0) => {
    const newSession: CashierSession = {
      id: Date.now().toString(),
      openedAt: new Date().toISOString(),
      initialBalance,
      salesTotal: 0,
      serviceTaxTotal: 0,
      expensesTotal: 0,
      tipsTotal: 0,
      ordersCount: 0,
      status: 'open',
    };
    setCashierSession(newSession);
  };

  const closeCashier = (tipsTotal: number, countedCash?: number) => {
    if (!cashierSession) return;
    const closedOrders = localOrders.filter(o => o.status === 'closed');
    const salesTotal = closedOrders.reduce((acc, o) => acc + o.subtotal, 0);
    const serviceTaxTotal = closedOrders.reduce((acc, o) => acc + o.serviceCharge, 0);

    // saida subtrai, entrada soma (suprimento)
    const expensesTotal = expenses.reduce((acc, e) => {
      return e.entryType === 'entrada' ? acc - e.amount : acc + e.amount;
    }, 0);

    const initialBalance = cashierSession.initialBalance || 0;
    const finalBalance = initialBalance + salesTotal + serviceTaxTotal - expensesTotal + tipsTotal;
    const cashBreakdown = countedCash !== undefined ? countedCash - finalBalance : undefined;

    const closedSession: CashierSession = {
      ...cashierSession,
      status: 'closed',
      closedAt: new Date().toISOString(),
      tipsTotal,
      salesTotal,
      serviceTaxTotal,
      expensesTotal,
      ordersCount: closedOrders.length,
      finalBalance,
      countedCash,
      cashBreakdown,
      closedOrderIds: closedOrders.map(o => o.id),
      expenseIds: expenses.map(e => e.id),
      expensesSnapshot: expenses,
    };
    setCashierHistory(prev => [...prev, closedSession]);
    setCashierSession(null);
    setLocalOrders([]);
    setExpenses([]);
  };

  const transferTable = (fromNumber: number, toNumber: number) => {
    const fromTable = tables.find(t => t.number === fromNumber);
    const toTable = tables.find(t => t.number === toNumber);

    if (!fromTable?.activeOrderId || toTable?.status !== 'livre') return;

    const orderId = fromTable.activeOrderId;

    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, tableNumber: toNumber } : o));
    setLocalTables(prev => prev.map(t => {
      if (t.number === fromNumber) return { ...t, status: 'livre', activeOrderId: undefined };
      if (t.number === toNumber) return { ...t, status: 'ocupada', activeOrderId: orderId };
      return t;
    }));
  };

  const mergeTables = (sourceNumber: number, targetNumber: number) => {
    const sourceTable = tables.find(t => t.number === sourceNumber);
    const targetTable = tables.find(t => t.number === targetNumber);

    if (!sourceTable?.activeOrderId || !targetTable?.activeOrderId) return;

    const sourceOrder = orders.find(o => o.id === sourceTable.activeOrderId);
    const targetOrder = orders.find(o => o.id === targetTable.activeOrderId);

    if (!sourceOrder || !targetOrder) return;

    const combinedItems = [...targetOrder.items];
    sourceOrder.items.forEach(sItem => {
      const existingIdx = combinedItems.findIndex(tItem => tItem.product.id === sItem.product.id);
      if (existingIdx !== -1) {
        combinedItems[existingIdx] = {
          ...combinedItems[existingIdx],
          quantity: combinedItems[existingIdx].quantity + sItem.quantity
        };
      } else {
        combinedItems.push({ ...sItem, id: Date.now().toString() + Math.random() });
      }
    });

    const subtotal = combinedItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const updatedTargetOrder = {
      ...targetOrder,
      items: combinedItems,
      subtotal,
      total: subtotal
    };

    setLocalOrders(prev => prev
      .filter(o => o.id !== sourceOrder.id)
      .map(o => o.id === targetOrder.id ? updatedTargetOrder : o)
    );

    setLocalTables(prev => prev.map(t => {
      if (t.number === sourceNumber) return { ...t, status: 'livre', activeOrderId: undefined };
      return t;
    }));
  };

  const reserveTable = (numbers: number[], reason: string) => {
    setLocalTables(prev => prev.map(t =>
      numbers.includes(t.number)
        ? { ...t, status: 'reservada', reservationReason: reason }
        : t
    ));
    if (isSupabaseConfigured) {
      void tablesHook.reserve(numbers, reason).catch(console.error);
    }
  };

  const clearTable = (number: number) => {
    setLocalTables(prev => prev.map(t =>
      t.number === number
        ? { ...t, status: 'livre', activeOrderId: undefined, reservationReason: undefined }
        : t
    ));
    if (isSupabaseConfigured) {
      void tablesHook.clear(number).catch(console.error);
    }
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  };

  const updateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addCollaborator = (collaborator: Collaborator) => {
    setCollaborators(prev => [...prev, collaborator]);
  };

  const updateCollaborator = (updatedCollaborator: Collaborator) => {
    setCollaborators(prev => prev.map(c => c.id === updatedCollaborator.id ? updatedCollaborator : c));
  };

  const deleteCollaborator = (id: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== id));
  };

  const addStockMovement = (movement: StockMovement) => {
    setStockMovements(prev => [...prev, movement]);
  };

  const addLoyaltyEntry = (entry: Omit<LoyaltyEntry, 'id' | 'empresaId' | 'createdAt'>) => {
    const newEntry: LoyaltyEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      empresaId: currentEmpresa.id,
      createdAt: new Date().toISOString()
    };
    setLoyaltyEntries(prev => [...prev, newEntry]);

    // Atualiza pontos do cliente no estado local
    setCustomers(prev => prev.map(c => {
      if (c.id === entry.customerId) {
        return {
          ...c,
          loyaltyPoints: c.loyaltyPoints + entry.points
        };
      }
      return c;
    }));
  };

  return (
    <AppContext.Provider value={{
      products, stockItems, suppliers, tables, waiters, orders, expenses, cashierSession, cashierHistory, customers, collaborators, stockMovements, settings, readGuides, theme, draftOrder,
      promotions, combos, campaigns, currentEmpresa, currentUser, loyaltyConfig, loyaltyEntries, supabaseOnline,
      setTheme, updateProduct, addProduct, deleteProduct,
      updateStockItem, addStockItem, deleteStockItem,
      updateSupplier, addSupplier, deleteSupplier,
      updateTable, addOrder, updateOrder, closeOrder, addExpense, updateExpense, deleteExpense, openCashier, closeCashier,
      transferTable, mergeTables, reserveTable, clearTable,
      addCustomer, updateCustomer, deleteCustomer,
      addCollaborator, updateCollaborator, deleteCollaborator,
      addStockMovement, updateSettings, toggleGuideRead, importData, exportData, resetToMocks,
      setDraftOrder, clearDraftOrder, updateOrderItemKitchenStatus, addLoyaltyEntry,
      productSyncErrors, retrySyncProduct, clearSyncError, reloadCollaborators,
      initializeTables: initializeTenantTables
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
