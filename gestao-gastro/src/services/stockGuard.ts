import { Product, StockItem } from '../types';

export interface StockValidationResult {
  available: boolean;
  insufficientItemName?: string;
}

export function validateStock(
  product: Product,
  stockItems: StockItem[],
  currentQtyInOrder: number = 0,
  qtyToAdd: number = 1
): StockValidationResult {
  if (!product.recipe || product.recipe.length === 0) {
    return { available: true };
  }

  for (const recipeItem of product.recipe) {
    const stockItem = stockItems.find(si => si.id === recipeItem.stockItemId);
    if (!stockItem) {
      return { 
        available: false, 
        insufficientItemName: 'Insumo não cadastrado' 
      };
    }
    const totalNeeded = recipeItem.quantity * (currentQtyInOrder + qtyToAdd);
    if (stockItem.currentStock < totalNeeded) {
      return { 
        available: false, 
        insufficientItemName: stockItem.name 
      };
    }
  }

  return { available: true };
}

export function getProductStock(product: Product, stockItems: StockItem[]): number {
  if (!product.recipe || product.recipe.length === 0) {
    return 999; // Unlimited / Livre
  }
  let minStockPossible = Infinity;
  product.recipe.forEach(item => {
    const stockItem = stockItems.find(si => si.id === item.stockItemId);
    if (stockItem) {
      const possible = Math.floor(stockItem.currentStock / item.quantity);
      if (possible < minStockPossible) {
        minStockPossible = possible;
      }
    } else {
      minStockPossible = 0;
    }
  });
  return minStockPossible === Infinity ? 0 : minStockPossible;
}
