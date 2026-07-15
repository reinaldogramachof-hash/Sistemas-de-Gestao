import React from 'react';
import { useApp } from '../store/AppContext';
import { Order } from '../types';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../utils/format';

interface ReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const { theme, waiters, settings } = useApp();
  const isDark = theme === 'dark';

  const waiter = waiters.find(w => w.id === order.waiterId)?.name || 'Balcão';
  const dateStr = new Date(order.timestamp).toLocaleString('pt-BR');

  const handlePrint = () => {
    window.print();
  };

  const amountReceived = order.payments.reduce((acc, p) => acc + (p.receivedAmount ?? p.amount), 0);
  const troco = order.payments.reduce((acc, p) => acc + (p.changeAmount ?? 0), 0);

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:bg-white print:p-0 print:block overflow-y-auto`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        id="receipt-print-area"
        className={`relative w-full max-w-sm rounded-xl border flex flex-col overflow-hidden shadow-sm print:shadow-none print:border-none print:w-full print:max-w-none my-auto
        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-[#fffdfa] border-gray-200'} print:bg-white`}
      >

        <div className="flex justify-end p-4 border-b border-dashed print:hidden">
           <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <Printer className="w-4 h-4"/>
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <X className="w-4 h-4"/>
              </button>
           </div>
        </div>

        <div className={`p-6 font-mono text-[12px] leading-[1.4] ${isDark ? 'text-gray-300' : 'text-gray-800'} print:text-black print:p-0 print:w-full print:text-[12px]`}>
           <div className="print-content-wrapper">
             <div className="text-center mb-6">
               <div className="text-xl mb-1 print:hidden">🍸</div>
               <h2 className="text-lg font-bold tracking-tighter mb-0 uppercase print:text-[16px]">{settings.establishment.name}</h2>
               <div className="w-full border-b border-dashed border-current my-3"></div>
               <p className="text-[10px] print:text-[11px] uppercase">{settings.establishment.address}</p>
               <p className="text-[10px] print:text-[11px]">DOCUMENTO: {settings.establishment.document}</p>
               <p className="text-[10px] print:text-[11px]">TEL: {settings.establishment.phone}</p>
               <div className="w-full border-b border-dashed border-current my-3"></div>
             </div>

             <div className="space-y-0.5 mb-4 text-[10px] print:text-[11px] uppercase">
               <div className="flex justify-between"><span>DATA:</span> <span>{dateStr}</span></div>
               <div className="flex justify-between"><span>EXTRATO:</span> <span className="font-bold">#{order.id.slice(-8).toUpperCase()}</span></div>
               <div className="flex justify-between"><span>OPERADOR:</span> <span>{waiter}</span></div>
               <div className="flex justify-between"><span>MODO:</span> <span className="font-bold">{order.mode} {order.tableNumber ? `| MESA ${order.tableNumber}` : ''}</span></div>
             </div>

             <div className="mb-4">
               <div className="flex justify-between font-bold border-b border-dashed border-current pb-1 mb-2 text-[10px] print:text-[11px] uppercase">
                 <span className="w-8 shrink-0">Qtd</span>
                 <span className="flex-1">Descrição</span>
                 <span className="w-16 text-right">Total</span>
               </div>
               <div className="space-y-1.5">
                 {order.items.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-[11px] print:text-[12px]">
                       <span className="w-8 shrink-0">{item.quantity}</span>
                       <div className="flex-1 pr-1 overflow-hidden">
                         <p className="uppercase truncate">{item.product.name}</p>
                         <p className="text-[9px] print:text-[10px] opacity-70">@{item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                       </div>
                       <span className="w-16 text-right shrink-0">{(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                 ))}
               </div>
             </div>

             <div className="border-t border-dashed border-current pt-3 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="uppercase">Subtotal:</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="uppercase">Serviço (10%):</span>
                  <span>{formatCurrency(order.serviceCharge)}</span>
                </div>
                <div className="flex justify-between text-[14px] font-bold mt-1 pt-2 border-t border-dashed border-current uppercase">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
             </div>

             <div className="mt-4 pt-3 border-t border-dashed border-current space-y-1">
                <p className="font-bold text-[10px] uppercase mb-2">Pagamento:</p>
                {order.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="uppercase">{p.method}</span>
                    <span>{formatCurrency(p.receivedAmount ?? p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between mt-1 pt-1 border-t border-dotted border-current/30 font-bold text-[11px]">
                   <span>RECEBIDO:</span>
                   <span>{formatCurrency(amountReceived)}</span>
                </div>
                <div className="flex justify-between font-bold text-[11px]">
                   <span>TROCO:</span>
                   <span>{formatCurrency(troco)}</span>
                </div>
             </div>

             <div className="text-center mt-8 space-y-1">
               <div className="w-full border-b border-dashed border-current mb-3"></div>
               <p className="text-[10px] font-bold uppercase">Obrigado pela preferencia!</p>
               <p className="text-[9px] uppercase">Volte Sempre</p>
               <div className="pt-4 flex flex-col items-center gap-1 opacity-100">
                  <div className="w-full h-6 bg-black flex items-center justify-center text-white text-[8px] font-bold">
                    {order.id.slice(0, 18).toUpperCase()}
                  </div>
                  <span className="text-[7px] font-mono">{order.id}</span>
               </div>
             </div>
           </div>
        </div>
      </motion.div>

      {/* Print Specific Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          html, body {
            background: white !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt-print-area, #receipt-print-area * {
            visibility: visible !important;
            color: black !important;
            background: white !important;
          }
          #receipt-print-area {
            position: static !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }
          /* Standard Fiscal Printable Area (approx 72mm) */
          .print-content-wrapper {
            width: 72mm !important;
            margin: 0 auto !important;
            padding: 4mm 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
