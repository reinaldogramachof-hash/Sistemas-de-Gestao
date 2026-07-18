import type { CashMovementKind, Expense, Order } from '../types';

export const getCashMovementKind = (expense: Expense): CashMovementKind => {
  if (expense.movementKind) return expense.movementKind;
  return expense.entryType === 'entrada' ? 'suprimento' : 'despesa';
};

export const isOperatingExpense = (expense: Expense) => getCashMovementKind(expense) === 'despesa';

export const getOrderNetRevenue = (order: Order) => Math.max(0, order.total - order.serviceCharge);
