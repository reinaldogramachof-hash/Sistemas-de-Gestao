import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { useApp } from '../store/AppContext';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-[calc(100%-2rem)] max-w-md rounded-panel shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDark ? 'bg-[var(--color-app-base)] border border-[var(--color-border)]' : 'bg-white border border-border-light'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${isDark ? 'bg-red-500/10 text-danger' : 'bg-red-100 text-red-600'}`}>
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 id="confirm-dialog-title" className="text-lg font-bold">
                {title}
              </h2>
              <p id="confirm-dialog-description" className={`mt-2 text-sm whitespace-pre-line ${isDark ? 'text-[var(--color-muted)]' : 'text-muted-light'}`}>
                {description}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`px-6 py-4 flex items-center justify-end gap-3 ${isDark ? 'bg-black/20 border-t border-[var(--color-border)]' : 'bg-gray-50 border-t border-border-light'}`}>
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-control font-medium transition-colors ${
              isDark 
                ? 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-elevated)]' 
                : 'bg-transparent text-text-light hover:bg-elevated-light'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-control font-bold bg-danger text-white hover:bg-red-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
