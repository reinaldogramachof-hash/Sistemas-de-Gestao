export type OrderMode = 'mesa' | 'balcao';
export type PaymentMethod = 'dinheiro' | 'credito' | 'debito' | 'pix' | 'vr' | 'va' | 'voucher';
export type KitchenItemStatus = 'aguardando' | 'preparo' | 'pronto';

export interface StockItem {
  id: string;
  name: string;
  category: string;
  unit: string; // kg, L, un, g, ml
  currentStock: number;
  minStock: number;
  costPrice: number;
  supplierId?: string;
}

export interface RecipeItem {
  stockItemId: string;
  quantity: number; // quantidade do insumo consumida
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  recipe?: RecipeItem[]; // Ficha técnica
  image?: string;
  active?: boolean;
}

export interface OrderItem {
  id: string; // unique order item id
  product: Product;
  quantity: number;
  price: number;
  observation?: string;
  originalPrice?: number;
  discount?: number;
  promotionName?: string;
  comboId?: string;
  addedAt?: string;
  kitchenStatus?: KitchenItemStatus;
}

export interface SplitItem {
  personName: string;
  items: OrderItem[];
}

export interface PaymentItem {
  method: PaymentMethod;
  amount: number;
}

export interface PartialPaymentItem {
  method: PaymentMethod;
  amount: number;
  paidAt: string;
}

export interface Order {
  id: string;
  mode: OrderMode;
  tableNumber?: number;
  customerName?: string;
  customerCount?: number;
  adultCount?: number;
  childrenCount?: number;
  items: OrderItem[];
  subtotal: number;
  serviceCharge: number;
  total: number;
  payments: PaymentItem[];
  partialPayments?: PartialPaymentItem[];
  loyaltyDiscount?: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  status: 'open' | 'closed';
  waiterId: string;
  customerId?: string;
  timestamp: string;
}

export interface Table {
  number: number;
  status: 'livre' | 'ocupada' | 'aguardando' | 'reservada';
  activeOrderId?: string;
  reservationReason?: string;
}

export interface Waiter {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Insumos' | 'Pessoal' | 'Aluguel' | 'Utilidades' | 'Marketing' | 'Impostos' | 'Outros';
  status: 'pago' | 'pendente';
  paymentMethod?: PaymentMethod;
  dueDate?: string;
  timestamp: string;
  entryType?: 'saida' | 'entrada';
}

export interface CashierSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: number;
  salesTotal: number;
  serviceTaxTotal: number;
  expensesTotal: number;
  tipsTotal: number;
  finalBalance?: number;
  ordersCount: number;
  status: 'open' | 'closed';
  countedCash?: number;
  cashBreakdown?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  lastVisit: string;
  loyaltyPoints: number;
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'inactive' | 'break';
  joinedAt: string;
  permissions: 'admin' | 'staff' | 'waiter';
  totalSales?: number;
  lastCheckIn?: string;
  lastCheckOut?: string;
  observations?: string;
  contractType?: 'CLT' | 'PJ' | 'Diarista' | 'Freelancer';
  salary?: number;
  commissionRate?: number;
  document?: string;
  address?: string;
  bankDetails?: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  lastDelivery: string;
  deliveryPerformance: number;
  document?: string; // CNPJ/CPF
  address?: string;
  paymentTerms?: string; // ex: 15 dias, 30 dias, à vista
  preferredPaymentMethod?: PaymentMethod;
  observations?: string;
  rating?: number; // 1-5 stars
}

export interface StockMovement {
  id: string;
  stockItemId: string; // Aponta para o insumo
  type: 'in' | 'out' | 'loss';
  quantity: number;
  unitCost?: number;
  reason?: string;
  timestamp: string;
  collaboratorId?: string;
}

export interface AppSettings {
  establishment: {
    name: string;
    address: string;
    phone: string;
    document: string;
    website?: string;
  };
  thermalPrinter: {
    enabled: boolean;
    autoPrint: boolean;
    showLogo: boolean;
    paperWidth: '58mm' | '80mm';
  };
  kitchenMode?: 'display' | 'interactive';
}
