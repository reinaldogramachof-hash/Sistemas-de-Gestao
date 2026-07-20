import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Order, PartialPaymentItem, PaymentItem, PaymentMethod } from '../types';
import { X } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';
import { calcEarnedPoints, getCustomerPoints } from '../services/salesService';
import { formatCurrency } from '../utils/format';
import { OperationFeedback, OperationFeedbackMessage } from './OperationFeedback';

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

const SHORTCUT_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'F1',
  credito: 'F2',
  debito: 'F3',
  pix: 'F4',
  vr: 'F5',
  va: 'F6',
  voucher: 'F11',
};

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
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('dinheiro');
  const [amountInput, setAmountInput] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [redeemLoyalty, setRedeemLoyalty] = useState(() => hasPartialPayments ? (order.loyaltyDiscount ?? 0) > 0 : false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [syncResult, setSyncResult] = useState<{message: string, status: 'success'|'error'} | null>(null);
  const [feedback, setFeedback] = useState<OperationFeedbackMessage | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const PAYMENT_METHOD_IDS: PaymentMethod[] = ['dinheiro', 'credito', 'debito', 'pix', 'vr', 'va'];

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
  const amountReceived = partialAmountPaid + payments.reduce((acc, payment) => acc + (payment.receivedAmount ?? payment.amount), 0);
  const troco = checkoutMode === 'parcial' ? 0 : payments.reduce((acc, payment) => acc + (payment.changeAmount ?? 0), 0);
  const draftAmount = parseFloat(amountInput.replace(',', '.')) || 0;
  const draftTroco = checkoutMode === 'fechar' && currentMethod === 'dinheiro'
    ? Math.max(0, draftAmount - amountRemaining)
    : 0;

  useEffect(() => {
    if (amountInput === '' && amountRemaining > 0) {
      if (splitMode === 'pessoas' && splitCount > 1 && amountRemaining >= (totalAmount / splitCount) - 0.01) {
        setAmountInput((totalAmount / splitCount).toFixed(2));
      } else {
        setAmountInput(amountRemaining.toFixed(2));
      }
    }
  }, [amountRemaining, amountInput, splitMode, splitCount, totalAmount]);

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

  const finalizeOrder = async (finalPayments: PaymentItem[], partialList: PartialPaymentItem[]) => {
    setIsFinishing(true);
    const closedOrder = buildOrderSnapshot(partialList);

    if (loyaltyConfig.active && customer) {
      if (redeemLoyalty && canRedeem) {
        addLoyaltyEntry({
          customerId: customer.id,
          points: -loyaltyConfig.redeemThreshold,
          orderId: order.id,
          description: `Resgate - ${formatCurrency(loyaltyConfig.redeemValue)} desconto`,
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

    const result = await closeOrder(closedOrder, finalPayments, serviceCharge);

    if (result.remoteSynced) {
      setSyncResult({ message: 'Venda sincronizada com a nuvem.', status: 'success' });
    } else if (result.remoteError) {
      setSyncResult({ message: 'Venda salva neste dispositivo. A sincronização com a nuvem não foi confirmada.', status: 'error' });
    }

    setReceiptOrder({ ...closedOrder, payments: finalPayments });
    setIsFinishing(false);
  };

  const handleSelectCheckoutMode = (mode: CheckoutMode) => {
    setCheckoutMode(mode);
    setPayments([]);
    setAmountInput('');
    setFeedback(null);
  };

  const handleAddPayment = () => {
    const value = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;

    if (currentMethod !== 'dinheiro' && value > amountRemaining + 0.01) {
      setFeedback({
        tone: 'warning',
        title: 'Valor acima do saldo devedor',
        description: `Informe no máximo ${formatCurrency(amountRemaining)} para ${PAYMENT_METHODS.find(m => m.id === currentMethod)?.label}.`,
      });
      return;
    }

    if (amountRemaining <= 0.01) return;

    const settledAmount = currentMethod === 'dinheiro'
      ? Math.min(value, amountRemaining)
      : value;
    const changeAmount = currentMethod === 'dinheiro'
      ? Math.max(0, value - settledAmount)
      : 0;

    setPayments(prev => [...prev, {
      method: currentMethod,
      amount: settledAmount,
      ...(currentMethod === 'dinheiro' ? { receivedAmount: value, changeAmount } : {}),
    }]);
    setAmountInput('');
    setFeedback(null);
  };

  const handleRemovePayment = (idx: number) => {
    setPayments(prev => prev.filter((_, index) => index !== idx));
    setAmountInput('');
  };

  const handleRegisterPartialPayment = () => {
    const value = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(value) || value <= 0) return;

    if (value > amountRemaining + 0.01) {
      setFeedback({
        tone: 'warning',
        title: 'Pagamento parcial acima do saldo',
        description: `Informe no máximo ${formatCurrency(amountRemaining)}. Pagamentos parciais não geram troco.`,
      });
      return;
    }

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
    setFeedback(null);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (isInput && !event.key.startsWith('F') && event.key !== 'Escape' && !event.key.startsWith('Arrow')) {
        return;
      }

      // Setas esquerda/direita navegam entre formas de pagamento
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentMethod(prev => {
          const idx = PAYMENT_METHOD_IDS.indexOf(prev);
          const next = event.key === 'ArrowRight'
            ? (idx + 1) % PAYMENT_METHOD_IDS.length
            : (idx - 1 + PAYMENT_METHOD_IDS.length) % PAYMENT_METHOD_IDS.length;
          return PAYMENT_METHOD_IDS[next];
        });
        return;
      }

      switch (event.key) {
        case 'F1':
          event.preventDefault();
          setCurrentMethod('dinheiro');
          break;
        case 'F2':
          event.preventDefault();
          setCurrentMethod('credito');
          break;
        case 'F3':
          event.preventDefault();
          setCurrentMethod('debito');
          break;
        case 'F4':
          event.preventDefault();
          setCurrentMethod('pix');
          break;
        case 'F5':
          event.preventDefault();
          setCurrentMethod('vr');
          break;
        case 'F6':
          event.preventDefault();
          setCurrentMethod('va');
          break;
        case 'F11':
          event.preventDefault();
          setCurrentMethod('voucher');
          break;
        case 'F8':
          event.preventDefault();
          if (checkoutMode === 'parcial') {
            handleRegisterPartialPayment();
          } else {
            handleAddPayment();
          }
          break;
        case 'F10':
          event.preventDefault();
          if (checkoutMode === 'parcial') {
            if (amountRemaining > 0.01) {
              handleRegisterPartialPayment();
            }
          } else {
            if (amountPaid >= totalAmount - 0.01 && !isFinishing) {
              handleFinish();
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMethod, amountInput, amountRemaining, checkoutMode, payments, partialPayments, totalAmount, isFinishing]);

  // Focus-trap: Tab cicla apenas entre elementos do modal
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Auto-foco no input de valor ao abrir
    const t = setTimeout(() => {
      const input = container.querySelector<HTMLInputElement>('input[type="text"]');
      input?.focus();
      input?.select();
    }, 120);

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const allEls = Array.from(
        container.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];
      const focusable = allEls.filter(el => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first: HTMLElement = focusable[0];
      const last: HTMLElement = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => { clearTimeout(t); container.removeEventListener('keydown', handleTab); };
  }, []);

  if (receiptOrder) {
    return (
      <ReceiptModal
        order={receiptOrder}
        syncMessage={syncResult?.message}
        syncStatus={syncResult?.status}
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
      <OperationFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div
        ref={containerRef}
        className={`w-full max-w-2xl rounded-panel border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${isDark ? 'bg-[var(--color-surface)] border-[var(--color-border)]' : 'bg-surface-light border-border-light'}`}
      >
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
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className={`flex justify-between pt-2 mt-2 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(order.subtotal)}</span>
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
                    <span className="ml-auto">{formatCurrency(serviceCharge)}</span>
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
                        <span className="ml-auto text-warning">-{formatCurrency(loyaltyConfig.redeemValue)}</span>
                      </label>
                    )}
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-warning">
                    <span>Desconto fidelidade</span>
                    <span>-{formatCurrency(loyaltyDiscount)}</span>
                  </div>
                )}
                {partialPayments.length > 0 && (
                  <div className={`space-y-2 pt-2 mt-2 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Pagamentos parciais</span>
                      <span className="text-success">{formatCurrency(partialAmountPaid)}</span>
                    </div>
                    {partialPayments.map((payment, index) => (
                      <div key={`${payment.paidAt}-${index}`} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="capitalize">{payment.method}</span>
                          <span className={`ml-2 ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>
                            {new Date(payment.paidAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={`flex justify-between text-lg font-bold pt-3 mt-1 border-t ${isDark ? 'border-[var(--color-border)]' : 'border-border-light'}`}>
                  <span>Total</span>
                  <span className="text-[var(--color-accent)]">{formatCurrency(totalAmount)}</span>
                </div>
                {partialPayments.length > 0 && (
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Saldo devedor</span>
                    <span className={amountRemaining > 0.01 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(amountRemaining)}
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
                      {formatCurrency(totalAmount / splitCount)} / cada
                    </span>
                  </div>
                )}
              </div>
            )}

            {checkoutMode === 'parcial' && (
              <div className={`p-4 rounded-control border space-y-2 text-sm ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Total já recebido</span>
                  <span className="font-bold text-success">{formatCurrency(partialAmountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Saldo atual da mesa</span>
                  <span className="font-bold text-danger">{formatCurrency(amountRemaining)}</span>
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
                    className={`h-10 px-3 text-xs font-medium rounded-control border transition-colors flex items-center justify-between gap-1 ${currentMethod === paymentMethod.id ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]' : isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)] hover:border-[var(--color-border)]' : 'bg-surface-light border-border-light hover:border-border-light'}`}
                  >
                    <span>{paymentMethod.label}</span>
                    <kbd className={`px-1.5 py-0.5 rounded border text-[10px] font-mono shadow-[0_1.5px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.15)] ${
                      isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
                    }`}>{SHORTCUT_LABELS[paymentMethod.id]}</kbd>
                  </button>
                ))}
              </div>
              <label className={`block mb-2 text-xs font-medium ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>
                {checkoutMode === 'parcial'
                  ? 'Valor do pagamento parcial'
                  : currentMethod === 'dinheiro'
                    ? 'Valor recebido'
                    : 'Valor do pagamento'}
              </label>
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
                  className="h-10 px-4 bg-[var(--color-accent)] text-white rounded-control text-xs font-medium hover:brightness-110 flex items-center gap-1.5"
                >
                  <span>{checkoutMode === 'parcial' ? 'Registrar' : 'Adicionar'}</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white font-mono text-[9px] shadow-[0_1px_0_rgba(255,255,255,0.2)]">F8</kbd>
                </button>
              </div>
              {checkoutMode === 'fechar' && currentMethod === 'dinheiro' && (
                <div className={`mt-2 flex items-center justify-between rounded-control border px-3 py-2 text-xs ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Troco a devolver</span>
                  <span className="font-bold text-warning">{formatCurrency(draftTroco)}</span>
                </div>
              )}
            </div>

            {payments.length > 0 && (
              <div className={`p-4 rounded-control border space-y-2 text-sm ${isDark ? 'bg-[var(--color-app-base)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="capitalize">{payment.method}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(payment.receivedAmount ?? payment.amount)}</span>
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
                <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Valor recebido</span>
                <span className="font-bold text-success">{formatCurrency(amountReceived)}</span>
              </div>
              {amountRemaining > 0.01 && (
                <div className="flex justify-between">
                  <span className={isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}>Falta</span>
                  <span className="font-bold text-danger">{formatCurrency(amountRemaining)}</span>
                </div>
              )}
              {troco > 0.01 && (
                <div className="flex justify-between font-bold text-warning">
                  <span>Troco</span>
                  <span>{formatCurrency(troco)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`p-5 border-t flex items-center justify-end gap-3 ${isDark ? 'bg-[var(--color-elevated)] border-[var(--color-border)]' : 'bg-elevated-light border-border-light'}`}>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className={`h-10 px-4 rounded-control text-xs font-medium border transition-colors flex items-center gap-1.5 ${isDark ? 'border-[var(--color-border)] hover:bg-surface-light/5 text-gray-300' : 'border-border-light hover:bg-elevated-light text-gray-700'}`}
            >
              <span>Cancelar</span>
              <kbd className={`px-1.5 py-0.5 rounded border text-[9px] font-mono shadow-[0_1px_0_rgba(0,0,0,0.15)] dark:shadow-[0_1px_0_rgba(255,255,255,0.15)] ${
                isDark ? 'bg-surface border-border text-muted' : 'bg-surface-light border-border-light text-muted-light'
              }`}>ESC</kbd>
            </button>
          {checkoutMode === 'parcial' ? (
            <button
              onClick={handleRegisterPartialPayment}
              disabled={amountRemaining <= 0.01}
              className="h-10 px-4 rounded-control bg-success text-white text-xs font-medium shadow-lg shadow-[var(--color-success)]/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>Confirmar Parcial</span>
              <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white font-mono text-[9px] shadow-[0_1px_0_rgba(255,255,255,0.2)]">F10</kbd>
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={amountPaid < totalAmount - 0.01 || isFinishing}
              className="h-10 px-4 rounded-control bg-success text-white text-xs font-medium shadow-lg shadow-[var(--color-success)]/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>{isFinishing ? 'Processando...' : 'Confirmar Pagamento'}</span>
              <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-white font-mono text-[9px] shadow-[0_1px_0_rgba(255,255,255,0.2)]">F10</kbd>
            </button>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
