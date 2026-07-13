import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Order, PartialPaymentItem, PaymentItem, PaymentMethod } from '../types';
import { X } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { calcEarnedPoints, getCustomerPoints } from '../services/salesService';

interface CheckoutModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

type CheckoutMode = 'fechar' | 'parcial';

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'credito', label: 'Crédito' },
  { id: 'debito', label: 'Débito' },
  { id: 'pix', label: 'PIX' },
  { id: 'vr', label: 'VR' },
  { id: 'va', label: 'VA' },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ order, onClose, onSuccess }) => {
  const { theme, closeOrder, updateOrder, waiters, customers, loyaltyConfig, loyaltyEntries, addLoyaltyEntry, settings } = useApp();
  const isDark = theme === 'dark';
  const isMesa = order.mode === 'mesa';
  const partialPayments = order.partialPayments ?? [];
  const hasPartialPayments = partialPayments.length > 0;

  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>(() => isMesa && hasPartialPayments ? 'parcial' : 'fechar');
  const [includeService, setIncludeService] = useState(() => isMesa ? (hasPartialPayments ? order.serviceCharge > 0 : true) : true);
  const [splitCount, setSplitCount] = useState(2);
  const [splitMode, setSplitMode] = useState<'nenhum' | 'pessoas'>('nenhum');
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('credito');
  const [amountInput, setAmountInput] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState(() => hasPartialPayments ? (order.loyaltyDiscount ?? 0) > 0 : false);

  const serviceChargeRate = settings.serviceChargeRate ?? 0.10;
  const serviceCharge = includeService && isMesa ? order.subtotal * serviceChargeRate : 0;
  const customer = customers.find(item => item.id === order.customerId);
  const currentPoints = customer ? getCustomerPoints(customer.id, loyaltyEntries) || customer.loyaltyPoints : 0;
  const canRedeem = loyaltyConfig.active && !!customer && currentPoints >= loyaltyConfig.redeemThreshold;
  const loyaltyDiscount = redeemLoyalty && canRedeem ? loyaltyConfig.redeemValue : 0;
  const totalAmount = Math.max(0, order.subtotal + serviceCharge - loyaltyDiscount);
  const earnedPoints = loyaltyConfig.active && customer ? calcEarnedPoints(totalAmount, loyaltyConfig) : 0;

  const partialAmountPaid = partialPayments.reduce((acc, payment) => acc + payment.amount, 0);
  const stagedAmountPaid = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const amountPaid = partialAmountPaid + stagedAmountPaid;
  const amountRemaining = Math.max(0, totalAmount - amountPaid);
  const troco = checkoutMode === 'parcial' ? 0 : Math.max(0, amountPaid - totalAmount);

  useEffect(() => {
    if (amountInput === '' && amountRemaining > 0) {
      setAmountInput(amountRemaining.toFixed(2));
    }
  }, [amountRemaining, amountInput]);

  const loyaltyPointsRedeemed = redeemLoyalty && canRedeem ? loyaltyConfig.redeemThreshold : 0;

  const buildOrderSnapshot = (partialList: PartialPaymentItem[]): Order => ({
    ...order,
    partialPayments: partialList,
    serviceCharge,
    total: totalAmount,
    loyaltyDiscount,
    loyaltyPointsEarned: earnedPoints,
    loyaltyPointsRedeemed,
  });

  const finalizeOrder = (finalPayments: PaymentItem[], partialList: PartialPaymentItem[]) => {
    const closedOrder = buildOrderSnapshot(partialList);

    if (loyaltyConfig.active && customer) {
      if (redeemLoyalty && canRedeem) {
        addLoyaltyEntry({
          customerId: customer.id,
          points: -loyaltyConfig.redeemThreshold,
          orderId: order.id,
          description: `Resgate - R$ ${loyaltyConfig.redeemValue.toFixed(2)} desconto`,
        });
      }
      if (earnedPoints > 0) {
        addLoyaltyEntry({
          customerId: customer.id,
          points: earnedPoints,
          orderId: order.id,
          description: `Pedido #${order.id}`,
        });
      }
    }

    closeOrder(closedOrder, finalPayments, serviceCharge);
    setReceiptOrder({ ...closedOrder, payments: finalPayments });
  };

  const handleSelectCheckoutMode = (mode: CheckoutMode) => {
    setCheckoutMode(mode);
    setPayments([]);
    setAmountInput('');
  };

  const handleAddPayment = () => {
    const value = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;
    setPayments(prev => [...prev, { method: currentMethod, amount: value }]);
    setAmountInput('');
  };

  const handleRemovePayment = (idx: number) => {
    setPayments(prev => prev.filter((_, index) => index !== idx));
    setAmountInput('');
  };

  const handleRegisterPartialPayment = () => {
    const value = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(value) || value <= 0 || value > amountRemaining + 0.01) return;

    const nextPartialPayments: PartialPaymentItem[] = [
      ...partialPayments,
      { amount: value, method: currentMethod, paidAt: new Date().toISOString() },
    ];

    if (amountRemaining - value <= 0.01) {
      finalizeOrder(
        nextPartialPayments.map(payment => ({ method: payment.method, amount: payment.amount })),
        nextPartialPayments
      );
      return;
    }

    updateOrder(buildOrderSnapshot(nextPartialPayments));
    setAmountInput('');
  };

  const handleFinish = () => {
    finalizeOrder(
      [
        ...partialPayments.map(payment => ({ method: payment.method, amount: payment.amount })),
        ...payments,
      ],
      partialPayments
    );
  };

  if (receiptOrder) {
    return (
      <ReceiptModal
        order={receiptOrder}
        onClose={() => {
          setReceiptOrder(null);
          onSuccess();
        }}
      />
    );
  }

  const waiterName = waiters.find(waiter => waiter.id === order.waiterId)?.name || 'Balcão';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-panel border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${isDark ? 'bg-[var(--color-surface)] border-[var(--color-border)]' : 'bg-surface-light border-border-light'}`}>
        <div className={`px-5 py-4 flex justify-between items-center border-b ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
          <div>
            <h2 className="text-lg font-bold">Fechamento de Conta</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>
              {isMesa ? `Mesa ${order.tableNumber?.toString().padStart(2, '0')}` : 'Balcão'} · Atendente: {waiterName}
            </p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 opacity-60 hover:opacity-100" /></button>
        </div>

        {isMesa && (
          <div className={`px-5 py-3 border-b ${isDark ? 'border-[var(--color-border)] bg-[var(--color-elevated)]' : 'border-border-light bg-elevated-light'}`}>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectCheckoutMode('fechar')}
                className={`h-10 rounded-control border text-xs font-semibold transition-colors ${checkoutMode === 'fechar' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : isDark ? 'border-[var(--color-border)] hover:bg-surface-light/5' : 'border-border-light hover:bg-white'}`}
              >
                Fechar Mesa
              </button>
              <button
                onClick={() => handleSelectCheckoutMode('parcial')}
                className={`h-10 rounded-control border text-xs font-semibold transition-colors ${checkoutMode === 'parcial' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : isDark ? 'border-[var(--color-border)] hover:bg-surface-light/5' : 'border-border-light hover:bg-white'}`}
              >
                Pagamento Parcial
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-6">
            <div>
              <h3 className={`text-xs font-bold mb-3 tracking-wider ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>Resumo</h3>
              <div className={`space-y-2 p-4 rounded-control border text-sm ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>
                      {item.quantity}× {item.product.name}
                    </span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className={`flex justify-between pt-2 mt-2 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                  <span>Subtotal</span>
                  <span className="font-medium">R$ {order.subtotal.toFixed(2)}</span>
                </div>
                {isMesa && (
                  <label className={`flex items-center gap-2 pt-1 ${hasPartialPayments ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={includeService}
                      disabled={hasPartialPayments}
                      onChange={event => setIncludeService(event.target.checked)}
                      className="accent-[var(--color-accent)]"
                    />
                    <span>Taxa de serviço ({Math.round(serviceChargeRate * 100)}%)</span>
                    <span className="ml-auto">R$ {serviceCharge.toFixed(2)}</span>
                  </label>
                )}
                {customer && loyaltyConfig.active && (
                  <div className={`pt-2 mt-2 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                    <div className="flex justify-between text-xs">
                      <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>{customer.name} · {currentPoints} pontos</span>
                      <span className="font-semibold text-success">+{earnedPoints} pontos</span>
                    </div>
                    {canRedeem && (
                      <label className={`flex items-center gap-2 pt-2 text-xs ${hasPartialPayments ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={redeemLoyalty}
                          disabled={hasPartialPayments}
                          onChange={event => {
                            setRedeemLoyalty(event.target.checked);
                            setPayments([]);
                            setAmountInput('');
                          }}
                          className="accent-[var(--color-accent)]"
                        />
                        <span>Resgatar {loyaltyConfig.redeemThreshold} pontos</span>
                        <span className="ml-auto text-warning">-R$ {loyaltyConfig.redeemValue.toFixed(2)}</span>
                      </label>
                    )}
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-warning">
                    <span>Desconto fidelidade</span>
                    <span>-R$ {loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                {partialPayments.length > 0 && (
                  <div className={`space-y-2 pt-2 mt-2 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Pagamentos parciais</span>
                      <span className="text-success">R$ {partialAmountPaid.toFixed(2)}</span>
                    </div>
                    {partialPayments.map((payment, index) => (
                      <div key={`${payment.paidAt}-${index}`} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="capitalize">{payment.method}</span>
                          <span className={`ml-2 ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>
                            {new Date(payment.paidAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <span>R$ {payment.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`flex justify-between text-lg font-bold pt-3 mt-1 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                  <span>Total</span>
                  <span className="text-[var(--color-accent)]">R$ {totalAmount.toFixed(2)}</span>
                </div>
                {partialPayments.length > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Saldo devedor</span>
                    <span className={amountRemaining > 0.01 ? 'text-danger' : 'text-success'}>
                      R$ {amountRemaining.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {checkoutMode === 'fechar' && (
              <div>
                <h3 className={`text-xs font-bold mb-3 tracking-wider ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>Divisão de Conta</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSplitMode('nenhum')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${splitMode === 'nenhum' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : isDark ? 'border-[var(--color-border)] hover:bg-surface-light/5' : 'border-border-light hover:bg-elevated-light'}`}
                  >
                    Não dividir
                  </button>
                  <button
                    onClick={() => setSplitMode('pessoas')}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${splitMode === 'pessoas' ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : isDark ? 'border-[var(--color-border)] hover:bg-surface-light/5' : 'border-border-light hover:bg-elevated-light'}`}
                  >
                    Por pessoa
                  </button>
                </div>
                {splitMode === 'pessoas' && (
                  <div className={`flex items-center gap-3 p-3 rounded-control border ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                    <span className="text-sm">Dividir entre</span>
                    <input
                      type="number"
                      min="2"
                      value={splitCount}
                      onChange={event => setSplitCount(Number(event.target.value))}
                      className={`h-10 w-14 px-3 text-center rounded-control border text-sm outline-none ${isDark ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-white' : 'bg-surface-light border-border-light'}`}
                    />
                    <span className="text-sm ml-auto font-bold text-[var(--color-accent)]">
                      R$ {(totalAmount / splitCount).toFixed(2)} / cada
                    </span>
                  </div>
                )}
              </div>
            )}

            {checkoutMode === 'parcial' && (
              <div className={`p-4 rounded-control border space-y-2 text-sm ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Total já recebido</span>
                  <span className="font-bold text-success">R$ {partialAmountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Saldo atual da mesa</span>
                  <span className="font-bold text-danger">R$ {amountRemaining.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h3 className={`text-xs font-bold mb-3 tracking-wider ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>Forma de Pagamento</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PAYMENT_METHODS.map(paymentMethod => (
                  <button
                    key={paymentMethod.id}
                    onClick={() => setCurrentMethod(paymentMethod.id)}
                    className={`h-10 px-3 text-xs font-medium rounded-control border transition-colors ${currentMethod === paymentMethod.id ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]' : isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)] hover:border-[var(--color-border)]' : 'bg-surface-light border-border-light hover:border-border-light'}`}
                  >
                    {paymentMethod.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>R$</span>
                  <input
                    type="text"
                    value={amountInput}
                    onChange={event => setAmountInput(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && (checkoutMode === 'parcial' ? handleRegisterPartialPayment() : handleAddPayment())}
                    className={`h-10 w-full pl-9 pr-3 rounded-control border outline-none ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)] text-white focus:border-[var(--color-accent)]' : 'bg-surface-light border-border-light focus:border-[var(--color-accent)]'}`}
                  />
                </div>
                <button
                  onClick={checkoutMode === 'parcial' ? handleRegisterPartialPayment : handleAddPayment}
                  className="h-10 px-4 bg-[var(--color-accent)] text-white rounded-control text-xs font-medium hover:brightness-110"
                >
                  {checkoutMode === 'parcial' ? 'Registrar' : 'Adicionar'}
                </button>
              </div>
            </div>

            {payments.length > 0 && (
              <div className={`p-4 rounded-control border space-y-2 text-sm ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="capitalize">{payment.method}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">R$ {payment.amount.toFixed(2)}</span>
                      <button
                        onClick={() => handleRemovePayment(idx)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${isDark ? 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-red-800 hover:text-danger' : 'border-border-light text-muted-light hover:border-red-300 hover:text-danger'}`}
                      >
                        remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`p-4 rounded-control border space-y-1.5 text-sm ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
              <div className="flex justify-between">
                <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Total pago</span>
                <span className="font-bold text-success">R$ {amountPaid.toFixed(2)}</span>
              </div>
              {amountRemaining > 0.01 && (
                <div className="flex justify-between">
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Falta</span>
                  <span className="font-bold text-danger">R$ {amountRemaining.toFixed(2)}</span>
                </div>
              )}
              {troco > 0.01 && (
                <div className="flex justify-between font-bold text-warning">
                  <span>Troco</span>
                  <span>R$ {troco.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'bg-[var(--color-elevated)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
          <button
            onClick={onClose}
            className={`h-10 px-4 rounded-control text-xs font-medium border transition-colors ${isDark ? 'border-[var(--color-border)] hover:bg-surface-light/5' : 'border-border-light hover:bg-elevated-light'}`}
          >
            Cancelar
          </button>
          {checkoutMode === 'parcial' ? (
            <button
              onClick={handleRegisterPartialPayment}
              disabled={amountRemaining <= 0.01}
              className="h-10 px-4 rounded-control bg-success text-white text-xs font-medium shadow-lg shadow-[var(--color-success)]/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar Parcial
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={amountPaid < totalAmount - 0.01}
              className="h-10 px-4 rounded-control bg-success text-white text-xs font-medium shadow-lg shadow-[var(--color-success)]/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar Pagamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
