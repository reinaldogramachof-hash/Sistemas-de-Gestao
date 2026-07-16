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
  expiryDate?: string; // Formato YYYY-MM-DD
}

export interface RecipeItem {
  stockItemId: string;
  quantity: number; // quantidade do insumo consumida
}

export interface Product {
  id: string;
  empresaId?: string;
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
  // Amount effectively allocated to the order after any cash change.
  amount: number;
  receivedAmount?: number;
  changeAmount?: number;
}

export interface PartialPaymentItem {
  method: PaymentMethod;
  amount: number;
  paidAt: string;
}

export interface Order {
  id: string;
  empresaId?: string;
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
  closedOrderIds?: string[];
  expenseIds?: string[];
  expensesSnapshot?: Expense[];
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
    logo?: string;
    footerNotes?: string;
    operatingHours?: string;
  };
  thermalPrinter: {
    enabled: boolean;
    autoPrint: boolean;
    showLogo: boolean;
    paperWidth: '58mm' | '80mm';
    testPrint?: boolean;
    device?: string;
  };
  paymentMethods?: PaymentMethod[];
  kitchenMode?: 'display' | 'interactive';
  serviceChargeRate?: number;
  localTestOrigin?: string;
  metadata?: {
    updatedAt: string;
    source: string;
  };
}

export interface Promotion {
  id: string;
  empresaId: string;
  name: string;
  type: 'percent' | 'fixed';
  value: number;
  productIds: string[];
  categoryIds: string[];
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
}

export interface Combo {
  id: string;
  empresaId: string;
  name: string;
  description?: string;
  items: { productId: string; qty: number }[];
  originalPrice: number;
  comboPrice: number;
  imageBase64?: string;
  active: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  empresaId: string;
  name: string;
  promotionId: string;
  daysOfWeek: number[];
  startsHour: number;
  endsHour: number;
  active: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  empresaId: string;
  type: string;
  userId: string;
  userName: string;
  detail: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

export interface LoyaltyConfig {
  empresaId: string;
  active: boolean;
  pointsPerReal: number;
  redeemThreshold: number;
  redeemValue: number;
  expiresInDays?: number;
}

export interface LoyaltyEntry {
  id: string;
  empresaId: string;
  customerId: string;
  points: number;
  orderId?: string;
  description: string;
  createdAt: string;
}
