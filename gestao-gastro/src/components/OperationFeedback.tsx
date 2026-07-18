import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type OperationFeedbackTone = 'success' | 'error' | 'warning' | 'info';

export interface OperationFeedbackMessage {
  tone: OperationFeedbackTone;
  title: string;
  description: string;
}

interface OperationFeedbackProps {
  feedback: OperationFeedbackMessage | null;
  onDismiss: () => void;
}

const toneConfig = {
  success: {
    Icon: CheckCircle2,
    shell: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-500',
    role: 'status' as const,
    live: 'polite' as const,
  },
  error: {
    Icon: AlertCircle,
    shell: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    icon: 'text-red-500',
    role: 'alert' as const,
    live: 'assertive' as const,
  },
  warning: {
    Icon: AlertTriangle,
    shell: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    icon: 'text-amber-500',
    role: 'alert' as const,
    live: 'assertive' as const,
  },
  info: {
    Icon: Info,
    shell: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
    role: 'status' as const,
    live: 'polite' as const,
  },
};

export const OperationFeedback: React.FC<OperationFeedbackProps> = ({ feedback, onDismiss }) => {
  if (!feedback) return null;

  const config = toneConfig[feedback.tone];
  const Icon = config.Icon;

  return (
    <aside
      role={config.role}
      aria-live={config.live}
      aria-atomic="true"
      className={`fixed right-4 top-20 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-panel border p-4 shadow-xl backdrop-blur-md ${config.shell}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{feedback.title}</p>
        <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{feedback.description}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-current/30"
        aria-label="Fechar mensagem"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
};
