export const formatCurrency = (value: number | undefined | null): string => {
  const val = value ?? 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const formatStockQuantity = (quantity: number, unit: string): string => {
  const normUnit = unit.toLowerCase().trim();

  if (normUnit === 'kg' && quantity < 1) {
    const grams = Math.round(quantity * 1000);
    return `${grams} g`;
  }

  if (normUnit === 'l' && quantity < 1) {
    const ml = Math.round(quantity * 1000);
    return `${ml} ml`;
  }

  if (normUnit === 'un') {
    if (Number.isInteger(quantity)) {
      return `${quantity} un`;
    }
  }

  const formattedVal = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(quantity);

  return `${formattedVal} ${unit}`;
};
