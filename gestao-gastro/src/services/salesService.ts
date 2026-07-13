import { Campaign, Combo, LoyaltyConfig, LoyaltyEntry, Product, Promotion } from '../types';

interface ComboAllocationInput {
  id: string;
  name: string;
  comboPrice: number;
  items: Combo['items'];
}

interface AllocatedComboItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discount: number;
  promotionName: string;
  comboId: string;
}

const now = () => new Date();

const isWithinRange = (startsAt: string, endsAt: string, reference = now()) => {
  const current = reference.getTime();
  return new Date(startsAt).getTime() <= current && current <= new Date(endsAt).getTime();
};

const appliesToProduct = (promotion: Promotion, product: Product) => {
  const appliesByProduct = promotion.productIds.length === 0 || promotion.productIds.includes(product.id);
  const appliesByCategory = promotion.categoryIds.length === 0 || promotion.categoryIds.includes(product.category);
  return appliesByProduct && appliesByCategory;
};

const calculateDiscount = (promotion: Promotion, product: Product) => {
  const raw = promotion.type === 'percent'
    ? product.price * (promotion.value / 100)
    : promotion.value;
  return Math.max(0, Math.min(product.price, raw));
};

export function getActivePromotions(promotions: Promotion[]): Promotion[] {
  return promotions.filter(promotion => promotion.active && isWithinRange(promotion.startsAt, promotion.endsAt));
}

export function getActiveCampaigns(campaigns: Campaign[], promotions: Promotion[]): Campaign[] {
  const reference = now();
  const currentDay = reference.getDay();
  const currentHour = reference.getHours();
  const activePromotionIds = new Set(getActivePromotions(promotions).map(promotion => promotion.id));

  return campaigns.filter(campaign => {
    if (!campaign.active || !activePromotionIds.has(campaign.promotionId)) return false;
    const inDay = campaign.daysOfWeek.includes(currentDay);
    const inHour = campaign.startsHour <= campaign.endsHour
      ? currentHour >= campaign.startsHour && currentHour < campaign.endsHour
      : currentHour >= campaign.startsHour || currentHour < campaign.endsHour;
    return inDay && inHour;
  });
}

export function getProductDiscount(
  product: Product,
  promotions: Promotion[],
  campaigns: Campaign[]
): { discount: number; promotionName: string } | null {
  const activePromotions = getActivePromotions(promotions);
  const campaignPromotionIds = new Set(getActiveCampaigns(campaigns, promotions).map(campaign => campaign.promotionId));
  const candidates = activePromotions.filter(promotion =>
    appliesToProduct(promotion, product) && (campaignPromotionIds.size === 0 || campaignPromotionIds.has(promotion.id) || !campaigns.some(c => c.promotionId === promotion.id))
  );

  const best = candidates
    .map(promotion => ({ promotion, discount: calculateDiscount(promotion, product) }))
    .filter(item => item.discount > 0)
    .sort((a, b) => b.discount - a.discount)[0];

  return best ? { discount: Number(best.discount.toFixed(2)), promotionName: best.promotion.name } : null;
}

export function getCustomerPoints(customerId: string, entries: LoyaltyEntry[]): number {
  return entries
    .filter(entry => entry.customerId === customerId)
    .reduce((total, entry) => total + entry.points, 0);
}

export function calcEarnedPoints(orderTotal: number, config: LoyaltyConfig): number {
  if (!config.active || config.pointsPerReal <= 0) return 0;
  return Math.max(0, Math.floor(orderTotal * config.pointsPerReal));
}

export function calcComboOriginalPrice(combo: Combo, products: Product[]): number {
  return combo.items.reduce((total, item) => {
    const product = products.find(p => p.id === item.productId);
    return total + (product?.price || 0) * item.qty;
  }, 0);
}

export function allocateComboItems(combo: ComboAllocationInput, products: Product[]): AllocatedComboItem[] {
  const originalTotal = combo.items.reduce((total, item) => {
    const product = products.find(candidate => candidate.id === item.productId);
    return total + (product?.price || 0) * item.qty;
  }, 0);

  if (originalTotal <= 0) return [];

  return combo.items.flatMap(comboItem => {
    const product = products.find(candidate => candidate.id === comboItem.productId);
    if (!product || comboItem.qty <= 0) return [];

    const lineOriginal = product.price * comboItem.qty;
    const distributedLineTotal = combo.comboPrice * (lineOriginal / originalTotal);
    const unitPrice = Number((distributedLineTotal / comboItem.qty).toFixed(2));

    return [{
      product,
      quantity: comboItem.qty,
      unitPrice,
      originalPrice: product.price,
      discount: Math.max(0, Number((product.price - unitPrice).toFixed(2))),
      promotionName: `Combo: ${combo.name}`,
      comboId: combo.id,
    }];
  });
}

export function calcComboSaving(combo: Combo, products: Product[]): number {
  const original = calcComboOriginalPrice(combo, products);
  if (original <= 0) return 0;
  return Math.max(0, Number((((original - combo.comboPrice) / original) * 100).toFixed(1)));
}
