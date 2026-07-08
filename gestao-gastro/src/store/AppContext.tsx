import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, Table, Order, Waiter, Expense, CashierSession, PaymentItem, Customer, Collaborator, StockMovement, StockItem, Supplier, AppSettings, KitchenItemStatus } from '../types';
import { mockProducts, mockTables, mockWaiters, mockCustomers, mockCollaborators, mockStockItems, mockSuppliers, mockSettings } from './mock';

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
}

interface AppContextType extends AppState {
  setTheme: (theme: 'dark' | 'light') => void;
  updateProduct: (product: Product) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
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
}

const parseJSON = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
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
  const [products, setProducts] = useState<Product[]>(() => parseJSON('products', mockProducts));
  const [stockItems, setStockItems] = useState<StockItem[]>(() => parseJSON('stockItems', mockStockItems));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => parseJSON('suppliers', mockSuppliers));
  const [tables, setTables] = useState<Table[]>(() => {
    const saved = parseJSON<Table[]>('tables', mockTables);
    return saved.length !== mockTables.length ? mockTables : saved;
  });
  const [waiters] = useState<Waiter[]>(() => parseJSON('waiters', mockWaiters));
  const [orders, setOrders] = useState<Order[]>(() => parseJSON('orders', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => parseJSON('expenses', []));
  const [cashierSession, setCashierSession] = useState<CashierSession | null>(() => parseJSON('cashierSession', null));
  const [cashierHistory, setCashierHistory] = useState<CashierSession[]>(() => parseJSON('cashierHistory', []));
  const [customers, setCustomers] = useState<Customer[]>(() => parseJSON('customers', mockCustomers));
  const [collaborators, setCollaborators] = useState<Collaborator[]>(() => parseJSON('collaborators', mockCollaborators));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => parseJSON('stockMovements', []));
  const [settings, setSettings] = useState<AppSettings>(() => parseJSON('settings', mockSettings));
  const [readGuides, setReadGuides] = useState<string[]>(() => parseJSON('readGuides', []));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const th = localStorage.getItem('theme');
    return th === 'dark' || th === 'light' ? th : 'dark';
  });
  const [draftOrder, setDraftOrderState] = useState<Order | null>(() => parseJSON('draftOrder', null));

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
    localStorage.setItem('tables', JSON.stringify(tables));
    localStorage.setItem('waiters', JSON.stringify(waiters));
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('cashierSession', JSON.stringify(cashierSession));
    localStorage.setItem('cashierHistory', JSON.stringify(cashierHistory));
    localStorage.setItem('customers', JSON.stringify(customers));
    localStorage.setItem('collaborators', JSON.stringify(collaborators));
    localStorage.setItem('stockMovements', JSON.stringify(stockMovements));
    localStorage.setItem('settings', JSON.stringify(settings));
    localStorage.setItem('readGuides', JSON.stringify(readGuides));
    localStorage.setItem('theme', theme);
    localStorage.setItem('draftOrder', JSON.stringify(draftOrder));
  }, [products, stockItems, suppliers, tables, waiters, orders, expenses, cashierSession, cashierHistory, customers, collaborators, stockMovements, settings, readGuides, theme, draftOrder]);

  const setDraftOrder = (order: Order | null) => setDraftOrderState(order);
  const clearDraftOrder = () => setDraftOrderState(null);

  const updateOrderItemKitchenStatus = (orderId: string, itemIndex: number, status: KitchenItemStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const items = o.items.map((item, idx) =>
        idx === itemIndex ? { ...item, kitchenStatus: status } : item
      );
      return { ...o, items };
    }));
  };

  const resetToMocks = () => {
    localStorage.clear();
    window.location.reload();
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
      if (data.tables) setTables(data.tables);
      if (data.orders) setOrders(data.orders);
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

  const updateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
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
    setTables(prev => prev.map(t => t.number === updatedTable.number ? updatedTable : t));
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
    if (order.mode === 'mesa' && order.tableNumber) {
      setTables(prev => prev.map(t =>
        t.number === order.tableNumber ? { ...t, status: 'ocupada', activeOrderId: order.id } : t
      ));
    }
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const closeOrder = (order: Order, payments: PaymentItem[], serviceCharge: number) => {
    const closedOrder: Order = {
      ...order,
      payments,
      serviceCharge,
      status: 'closed',
      total: order.subtotal + serviceCharge,
    };

    setOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      return exists
        ? prev.map(o => o.id === order.id ? closedOrder : o)
        : [...prev, closedOrder];
    });

    if (order.tableNumber) {
      setTables(prev => prev.map(t =>
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
    const closedOrders = orders.filter(o => o.status === 'closed');
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
    };
    setCashierHistory(prev => [...prev, closedSession]);
    setCashierSession(null);
    setOrders([]);
    setExpenses([]);
  };

  const transferTable = (fromNumber: number, toNumber: number) => {
    const fromTable = tables.find(t => t.number === fromNumber);
    const toTable = tables.find(t => t.number === toNumber);

    if (!fromTable?.activeOrderId || toTable?.status !== 'livre') return;

    const orderId = fromTable.activeOrderId;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, tableNumber: toNumber } : o));
    setTables(prev => prev.map(t => {
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

    setOrders(prev => prev
      .filter(o => o.id !== sourceOrder.id)
      .map(o => o.id === targetOrder.id ? updatedTargetOrder : o)
    );

    setTables(prev => prev.map(t => {
      if (t.number === sourceNumber) return { ...t, status: 'livre', activeOrderId: undefined };
      return t;
    }));
  };

  const reserveTable = (numbers: number[], reason: string) => {
    setTables(prev => prev.map(t =>
      numbers.includes(t.number)
        ? { ...t, status: 'reservada', reservationReason: reason }
        : t
    ));
  };

  const clearTable = (number: number) => {
    setTables(prev => prev.map(t =>
      t.number === number
        ? { ...t, status: 'livre', activeOrderId: undefined, reservationReason: undefined }
        : t
    ));
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

  return (
    <AppContext.Provider value={{
      products, stockItems, suppliers, tables, waiters, orders, expenses, cashierSession, cashierHistory, customers, collaborators, stockMovements, settings, readGuides, theme, draftOrder,
      setTheme, updateProduct, addProduct, deleteProduct,
      updateStockItem, addStockItem, deleteStockItem,
      updateSupplier, addSupplier, deleteSupplier,
      updateTable, addOrder, updateOrder, closeOrder, addExpense, updateExpense, deleteExpense, openCashier, closeCashier,
      transferTable, mergeTables, reserveTable, clearTable,
      addCustomer, updateCustomer, deleteCustomer,
      addCollaborator, updateCollaborator, deleteCollaborator,
      addStockMovement, updateSettings, toggleGuideRead, importData, exportData, resetToMocks,
      setDraftOrder, clearDraftOrder, updateOrderItemKitchenStatus,
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
