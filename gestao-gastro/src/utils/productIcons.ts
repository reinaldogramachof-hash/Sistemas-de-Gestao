import { LucideIcon, Beer, GlassWater, Martini, Wine, Beef, Drumstick, Utensils, CookingPot, Package, Coffee, Pizza, IceCreamBowl, UtensilsCrossed } from 'lucide-react';

export const getProductIcon = (category: string, name?: string): LucideIcon => {
  const cat = category.toLowerCase();
  const itemName = name?.toLowerCase() || '';

  // Específicos por nome de produto (prioridade)
  if (itemName.includes('cerveja') || itemName.includes('heineken') || itemName.includes('skol') || itemName.includes('budweiser')) return Beer;
  if (itemName.includes('água') || itemName.includes('agua') || itemName.includes('refrigerante') || itemName.includes('coca') || itemName.includes('suco') || itemName.includes('red bull')) return GlassWater;
  if (itemName.includes('gin') || itemName.includes('drink') || itemName.includes('caipirinha') || itemName.includes('batida')) return Martini;
  if (itemName.includes('dose') || itemName.includes('whisky') || itemName.includes('cachaça') || itemName.includes('licor') || itemName.includes('combo')) return Wine;
  if (itemName.includes('batata') || itemName.includes('porção') || itemName.includes('porcoes') || itemName.includes('torresmo')) return Utensils;
  if (itemName.includes('espeto') || itemName.includes('espetinho') || itemName.includes('kafta') || itemName.includes('medalhão') || itemName.includes('carne') || itemName.includes('frango') || itemName.includes('calabresa')) return Drumstick;
  if (itemName.includes('arroz')) return CookingPot;
  if (itemName.includes('café') || itemName.includes('cafe')) return Coffee;

  // Por categoria
  if (cat.includes('cerveja')) return Beer;
  if (cat.includes('bebida') || cat.includes('água') || cat.includes('refrigerante') || cat.includes('suco')) return GlassWater;
  if (cat.includes('drink')) return Martini;
  if (cat.includes('dose') || cat.includes('combo') || cat.includes('destilado')) return Wine;
  if (cat.includes('espetinho') || cat.includes('carne')) return Drumstick;
  if (cat.includes('porção') || cat.includes('porcoes') || cat.includes('petisco')) return Pizza;
  if (cat.includes('acompanhamento')) return CookingPot;
  if (cat.includes('sobremesa') || cat.includes('doce')) return IceCreamBowl;
  if (cat.includes('prato')) return UtensilsCrossed;
  if (cat.includes('café') || cat.includes('cafe')) return Coffee;

  // Fallback neutro
  return Package;
};
