import React from 'react';
import { AlertCircle, LoaderCircle, PackageSearch, WifiOff } from 'lucide-react';

export type OperationalStateVariant = 'empty' | 'offline' | 'error' | 'loading';

interface OperationalStateProps {
  variant: OperationalStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const stateConfig = {
  empty: {
    Icon: PackageSearch,
    shell: 'border-slate-500/20 bg-slate-500/5 text-slate-600 dark:text-slate-300',
    icon: 'text-slate-500',
    role: 'status' as const,
    live: 'polite' as const,
  },
  offline: {
    Icon: WifiOff,
    shell: 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    icon: 'text-amber-500',
    role: 'status' as const,
    live: 'polite' as const,
  },
  error: {
    Icon: AlertCircle,
    shell: 'border-red-500/25 bg-red-500/5 text-red-700 dark:text-red-300',
    icon: 'text-red-500',
    role: 'alert' as const,
    live: 'assertive' as const,
  },
  loading: {
    Icon: LoaderCircle,
    shell: 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    icon: 'animate-spin text-blue-500',
    role: 'status' as const,
    live: 'polite' as const,
  },
};

export const OperationalState = React.memo(function OperationalState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: OperationalStateProps) {
  const config = stateConfig[variant];
  const Icon = config.Icon;

  return (
    <section
      role={config.role}
      aria-live={config.live}
      aria-busy={variant === 'loading'}
      className={`flex items-center gap-4 rounded-panel border ${compact ? 'p-4' : 'min-h-56 flex-col justify-center p-8 text-center'} ${config.shell}`}
    >
      <div className={`flex shrink-0 items-center justify-center rounded-panel bg-current/10 ${compact ? 'h-10 w-10' : 'h-14 w-14'}`}>
        <Icon className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} ${config.icon}`} aria-hidden="true" />
      </div>
      <div className={compact ? 'min-w-0 flex-1' : 'max-w-lg'}>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-control border border-current/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-current/30"
        >
          {actionLabel}
        </button>
      )}
    </section>
  );
});
