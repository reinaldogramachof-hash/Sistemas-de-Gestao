import { Product, Table, Waiter, StockItem, Supplier, Collaborator, Customer, AppSettings } from '../types';

export const mockStockItems: StockItem[] = [
  // Proteínas
  { id: 'si1', name: 'Carne Moída (Blend)', category: 'Proteínas', unit: 'kg', currentStock: 45, minStock: 10, costPrice: 38.50, supplierId: '3' },
  { id: 'si2', name: 'Filéé de Frango', category: 'Proteínas', unit: 'kg', currentStock: 30, minStock: 5, costPrice: 22.00, supplierId: '3' },
  { id: 'si3', name: 'Costelinha Suína', category: 'Proteínas', unit: 'kg', currentStock: 15, minStock: 5, costPrice: 28.00, supplierId: '3' },
  { id: 'si4', name: 'Bacon Defumado', category: 'Proteínas', unit: 'kg', currentStock: 12, minStock: 3, costPrice: 42.00, supplierId: '3' },

  // Padaria e Secos
  { id: 'si5', name: 'Pão de Brioche', category: 'Padaria', unit: 'un', currentStock: 200, minStock: 40, costPrice: 1.65, supplierId: '2' },
  { id: 'si6', name: 'Pão Australiano', category: 'Padaria', unit: 'un', currentStock: 80, minStock: 20, costPrice: 1.80, supplierId: '2' },
  { id: 'si7', name: 'Arroz Arbóreo', category: 'Secos', unit: 'kg', currentStock: 10, minStock: 2, costPrice: 18.00, supplierId: '2' },
  { id: 'si8', name: 'Açúcar Refinado', category: 'Secos', unit: 'kg', currentStock: 25, minStock: 5, costPrice: 4.80, supplierId: '2' },

  // Laticínios
  { id: 'si9', name: 'Queijo Cheddar', category: 'Laticínios', unit: 'kg', currentStock: 12, minStock: 3, costPrice: 48.00, supplierId: '3' },
  { id: 'si10', name: 'Queijo Muçarela', category: 'Laticínios', unit: 'kg', currentStock: 15, minStock: 5, costPrice: 38.00, supplierId: '3' },
  { id: 'si11', name: 'Creme de Leite', category: 'Laticínios', unit: 'L', currentStock: 10, minStock: 2, costPrice: 14.00, supplierId: '2' },

  // Hortifruti
  { id: 'si12', name: 'Limão Taiti', category: 'Hortifruti', unit: 'kg', currentStock: 20, minStock: 5, costPrice: 7.50, supplierId: '2' },
  { id: 'si13', name: 'Batata Asterix', category: 'Hortifruti', unit: 'kg', currentStock: 100, minStock: 20, costPrice: 5.50, supplierId: '2' },
  { id: 'si14', name: 'Tomate Cereja', category: 'Hortifruti', unit: 'kg', currentStock: 8, minStock: 2, costPrice: 12.00, supplierId: '2' },

  // Bebidas Brutas
  { id: 'si15', name: 'Cachaça Prata', category: 'Bebidas Brutas', unit: 'L', currentStock: 15, minStock: 4, costPrice: 32.00, supplierId: '1' },
  { id: 'si16', name: 'Gin Tanqueray', category: 'Bebidas Brutas', unit: 'L', currentStock: 8, minStock: 2, costPrice: 125.00, supplierId: '1' },
  { id: 'si17', name: 'Vodka Absolut', category: 'Bebidas Brutas', unit: 'L', currentStock: 10, minStock: 2, costPrice: 95.00, supplierId: '1' },
  { id: 'si18', name: 'Xarope de Frutas', category: 'Bebidas Brutas', unit: 'L', currentStock: 5, minStock: 1, costPrice: 45.00, supplierId: '1' },

  // Bebidas Prontas
  { id: 'si19', name: 'ÁÁgua Tônica (Lata)', category: 'Bebidas Prontas', unit: 'un', currentStock: 72, minStock: 24, costPrice: 3.40, supplierId: '1' },
  { id: 'si20', name: 'Coca-Cola (Lata)', category: 'Bebidas Prontas', unit: 'un', currentStock: 120, minStock: 48, costPrice: 2.80, supplierId: '1' },
  { id: 'si21', name: 'Heineken Long Neck', category: 'Bebidas Prontas', unit: 'un', currentStock: 144, minStock: 72, costPrice: 5.50, supplierId: '1' },
];

export const mockSuppliers: Supplier[] = [
  { id: '1', companyName: 'Bebidas Prime Distribuidora', category: 'Bebidas', contactName: 'Ricardo L.', phone: '(11) 4004-9000', email: 'vendas@prime.com.br', lastDelivery: '2026-05-02', deliveryPerformance: 98, rating: 5, paymentTerms: '30 dias', document: '12.345.678/0001-90', address: 'Av. Industrial, 1500 - SP' },
  { id: '2', companyName: 'Hortifruti da Fazenda', category: 'Perecíveis', contactName: 'Dona Maria', phone: '(11) 91234-5678', email: 'fazenda@email.com', lastDelivery: '2026-05-04', deliveryPerformance: 100, rating: 5, paymentTerms: 'À vista', document: '98.765.432/0001-10', address: 'Rua das Flores, 45 - Cotia/SP' },
  { id: '3', companyName: 'Atacadão Carnes & Cia', category: 'Proteínas', contactName: 'Carlos M.', phone: '(11) 3322-1100', email: 'comercial@atacadao.com', lastDelivery: '2026-04-30', deliveryPerformance: 85, rating: 3, paymentTerms: '15 dias', document: '45.678.901/0001-22', address: 'Marginal Tietê, KM 12 - SP' },
  { id: '4', companyName: 'Limpeza Express S/A', category: 'Limpeza', contactName: 'Felipe G.', phone: '(11) 2211-4433', email: 'contato@limpezaexpress.com', lastDelivery: '2026-04-15', deliveryPerformance: 92, rating: 4, paymentTerms: 'Boleto 21 dias', document: '33.221.100/0001-55', address: 'Rua Limpa, 100 - Barueri/SP' },
];

export const mockProducts: Product[] = [
  // --- DRINKS ---
  {
    id: 'p1', name: 'Caipirinha Tradicional', description: 'Cachaça prata, limão e açúcar', price: 24, category: 'Drinks',
    recipe: [
      { stockItemId: 'si15', quantity: 0.05 }, { stockItemId: 'si12', quantity: 0.12 }, { stockItemId: 'si8', quantity: 0.02 }
    ]
  },
  {
    id: 'p2', name: 'Gin Tônica Botânico', description: 'Gin Tanqueray, tônica e especiarias', price: 36, category: 'Drinks',
    recipe: [
      { stockItemId: 'si16', quantity: 0.05 }, { stockItemId: 'si19', quantity: 1.0 }, { stockItemId: 'si12', quantity: 0.02 }
    ]
  },
  {
    id: 'p3', name: 'Moscow Mule', description: 'Vodka, limão e espuma de gengibre', price: 34, category: 'Drinks',
    recipe: [
      { stockItemId: 'si17', quantity: 0.05 }, { stockItemId: 'si12', quantity: 0.03 }, { stockItemId: 'si11', quantity: 0.05 }
    ]
  },
  { id: 'p4', name: 'Heineken Long Neck', description: 'Cerveja Premium 330ml', price: 14, category: 'Drinks', recipe: [{ stockItemId: 'si21', quantity: 1 }] },
  { id: 'p5', name: 'Coca-Cola Lata', description: 'Original ou Zero 350ml', price: 8, category: 'Drinks', recipe: [{ stockItemId: 'si20', quantity: 1 }] },
  { id: 'p6', name: 'Suco de Limão Natural', description: '400ml feito na hora', price: 12, category: 'Drinks', recipe: [{ stockItemId: 'si12', quantity: 0.15 }, { stockItemId: 'si8', quantity: 0.03 }] },

  // --- HAMBÚRGUERES ---
  {
    id: 'p7', name: 'X-Burger Clássico', description: 'Pão brioche, blend 150g e cheddar', price: 38, category: 'Hambúrgueres',
    recipe: [
      { stockItemId: 'si1', quantity: 0.15 }, { stockItemId: 'si5', quantity: 1 }, { stockItemId: 'si9', quantity: 0.03 }
    ]
  },
  {
    id: 'p8', name: 'Bacon Monster', description: 'Duplo blend, muito bacon e cheddar', price: 48, category: 'Hambúrgueres',
    recipe: [
      { stockItemId: 'si1', quantity: 0.30 }, { stockItemId: 'si5', quantity: 1 }, { stockItemId: 'si9', quantity: 0.05 }, { stockItemId: 'si4', quantity: 0.04 }
    ]
  },
  {
    id: 'p9', name: 'Australiano Steak', description: 'Pão australiano, blend e muçarela', price: 42, category: 'Hambúrgueres',
    recipe: [
      { stockItemId: 'si1', quantity: 0.15 }, { stockItemId: 'si6', quantity: 1 }, { stockItemId: 'si10', quantity: 0.03 }
    ]
  },
  {
    id: 'p10', name: 'Chicken Crispy', description: 'Frango empanado, maionese e brioche', price: 36, category: 'Hambúrgueres',
    recipe: [
      { stockItemId: 'si2', quantity: 0.18 }, { stockItemId: 'si5', quantity: 1 }, { stockItemId: 'si10', quantity: 0.02 }
    ]
  },

  // --- PETISCOS ---
  {
    id: 'p11', name: 'Batata Rústica', description: 'Crocante com alecrim e alho', price: 32, category: 'Petiscos',
    recipe: [{ stockItemId: 'si13', quantity: 0.40 }]
  },
  {
    id: 'p12', name: 'Cheddar & Bacon Fries', description: 'Batata com cheddar e bacon', price: 42, category: 'Petiscos',
    recipe: [{ stockItemId: 'si13', quantity: 0.40 }, { stockItemId: 'si9', quantity: 0.08 }, { stockItemId: 'si4', quantity: 0.05 }]
  },
  {
    id: 'p13', name: 'Coxinha da Asa (6 un)', description: 'Frango crocante com barbecue', price: 45, category: 'Petiscos',
    recipe: [{ stockItemId: 'si2', quantity: 0.50 }]
  },
  {
    id: 'p14', name: 'Costelinha BBQ', description: 'Meia costela suína ao molho BBQ', price: 68, category: 'Petiscos',
    recipe: [{ stockItemId: 'si3', quantity: 0.60 }]
  },
  {
    id: 'p15', name: 'Dadinho de Tapioca', description: 'Com geleia de pimenta', price: 34, category: 'Petiscos',
    recipe: [{ stockItemId: 'si10', quantity: 0.20 }]
  },

  // --- PRATOS ---
  {
    id: 'p16', name: 'Risoto de Alho Poró', description: 'Arroz arbóreo e alho poró', price: 58, category: 'Pratos',
    recipe: [{ stockItemId: 'si7', quantity: 0.12 }, { stockItemId: 'si10', quantity: 0.05 }, { stockItemId: 'si11', quantity: 0.05 }]
  },
  {
    id: 'p17', name: 'Filéé de Frango Grelhado', description: 'Com legumes e arroz', price: 45, category: 'Pratos',
    recipe: [{ stockItemId: 'si2', quantity: 0.20 }, { stockItemId: 'si7', quantity: 0.10 }]
  },

  // --- SOBREMESAS ---
  {
    id: 'p18', name: 'Petit Gâteau', description: 'Com sorvete de baunilha', price: 28, category: 'Sobremesas',
    recipe: [{ stockItemId: 'si11', quantity: 0.05 }, { stockItemId: 'si8', quantity: 0.04 }]
  },
  { id: 'p19', name: 'Brownie de Chocolate', description: 'Nacional com nozes', price: 22, category: 'Sobremesas', recipe: [] },
  { id: 'p20', name: 'ÁÁgua Mineral 500ml', description: 'Sem gás', price: 6, category: 'Drinks', recipe: [] },
];

export const mockTables: Table[] = Array.from({ length: 20 }, (_, i) => ({
  number: i + 1,
  status: 'livre' as const,
}));

export const mockWaiters: Waiter[] = [
  { id: 'w1', name: 'Ana Silva' },
  { id: 'w2', name: 'Carlos Ferreira' },
  { id: 'w3', name: 'Mariana Costa' },
  { id: 'w4', name: 'Ricardo Mendes' },
];

export const mockCustomers: Customer[] = [
  { id: '1', name: 'Ana Silva', email: 'ana.silva@email.com', phone: '(11) 98888-7777', totalSpent: 2250.50, lastVisit: '2026-05-01', loyaltyPoints: 225 },
  { id: '2', name: 'Bruno Oliveira', email: 'bruno.o@email.com', phone: '(11) 97777-6666', totalSpent: 450.00, lastVisit: '2026-03-15', loyaltyPoints: 45 },
  { id: '3', name: 'Carla Santos', email: 'carla.s@email.com', phone: '(11) 96666-5555', totalSpent: 3100.20, lastVisit: '2026-05-04', loyaltyPoints: 310 },
];

export const mockCollaborators: Collaborator[] = [
  { id: '1', name: 'Reinaldogramacho', role: 'Administrador', email: 'admin@gestaogastro.com', status: 'active', joinedAt: '2025-01-15', permissions: 'admin', totalSales: 15400 },
  { id: '2', name: 'Maria Souza', role: 'Garçom Lead', email: 'maria.s@email.com', status: 'active', joinedAt: '2025-03-10', permissions: 'waiter', totalSales: 9200 },
];

export const mockSettings: AppSettings = {
  establishment: {
    name: 'Gastro Bar & Restaurante',
    address: 'Rua Gastronômica, 123 - Centro, São Paulo/SP',
    phone: '(11) 98765-4321',
    document: '12.345.678/0001-90',
    website: 'www.gestaogastro.com.br'
  },
  thermalPrinter: {
    enabled: true,
    autoPrint: false,
    showLogo: true,
    paperWidth: '80mm'
  },
  kitchenMode: 'display'
};
