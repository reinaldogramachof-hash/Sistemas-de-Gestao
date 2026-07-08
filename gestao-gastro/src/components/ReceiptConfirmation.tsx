import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface ReceiptConfirmationProps {
  onConfirmed: () => void;
}

export const ReceiptConfirmation: React.FC<ReceiptConfirmationProps> = ({ onConfirmed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    const email = localStorage.getItem('ml_license_email');
    const licenseKey = localStorage.getItem('plena_license');
    const masterMode = localStorage.getItem('ml_master_mode');

    if (masterMode === 'true') {
      localStorage.setItem('ml_receipt_confirmed', 'true');
      onConfirmed();
      return;
    }

    try {
      const response = await fetch('../api_licenca_ml.php?action=confirm_receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKey, email })
      });

      const data = await response.json();

      if (data.status === 'success' || data.status === 'already_confirmed') {
        localStorage.setItem('ml_receipt_confirmed', 'true');
        onConfirmed();
      } else {
        setError(data.message || 'Falha ao confirmar o recebimento. Tente novamente.');
      }
    } catch (err) {
      setError('Nao foi possível registrar o recibo agora. Verifique a conexao e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center p-4">
      <div className="bg-[#1A1A1D] p-8 rounded-lg shadow-sm max-w-md w-full border border-[#475569]/30">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-4">Confirmacao de Recebimento</h2>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200 leading-relaxed">
              Para liberar o uso completo e vitalicio do seu sistema, confirme que voce
              <strong> recebeu o produto digital corretamente</strong>. esta acao validara sua licença permanentemente.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Confirmar Recebimento do Produto'}
        </button>
      </div>
    </div>
  );
};
