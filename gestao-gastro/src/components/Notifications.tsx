import React from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  HardDrive,
  Info,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Tag,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useSystemNotifications } from '../hooks/useSystemNotifications';
import { SystemNotificationType } from '../services/notificationsService';
import { OperationalState } from './OperationalState';

const typeMap: Record<SystemNotificationType, {
  icon: React.ElementType;
  label: string;
  shell: string;
  iconShell: string;
}> = {
  update: {
    icon: Rocket,
    label: 'Atualizacao',
    shell: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    iconShell: 'bg-blue-500/10 text-blue-500',
  },
  security: {
    icon: ShieldAlert,
    label: 'Seguranca',
    shell: 'bg-red-500/10 text-red-600 dark:text-red-300',
    iconShell: 'bg-red-500/10 text-red-500',
  },
  backup: {
    icon: HardDrive,
    label: 'Backup',
    shell: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    iconShell: 'bg-amber-500/10 text-amber-500',
  },
  info: {
    icon: Info,
    label: 'Informativo',
    shell: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    iconShell: 'bg-slate-500/10 text-slate-500',
  },
  promo: {
    icon: Tag,
    label: 'Novidade',
    shell: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    iconShell: 'bg-emerald-500/10 text-emerald-500',
  },
};

const formatPublished = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponivel';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const Notifications: React.FC = () => {
  const { theme } = useApp();
  const {
    notifications,
    readIds,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useSystemNotifications();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-panel bg-[#475569]/10 text-[#475569]">
            <Bell className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Notificacoes</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold uppercase tracking-[0.18em] opacity-45">
            Avisos, atualizacoes e comunicados enviados pela administracao do sistema.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void refresh(true)}
            className="min-h-11 rounded-control border border-current/15 px-4 text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={notifications.length === 0 || unreadCount === 0}
            className="min-h-11 rounded-control bg-[#475569] px-5 text-[10px] font-black uppercase tracking-widest text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`rounded-panel border p-5 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Total recebido</p>
          <p className="mt-2 text-3xl font-black">{notifications.length}</p>
        </div>
        <div className={`rounded-panel border p-5 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Nao lidas</p>
          <p className="mt-2 text-3xl font-black text-red-500">{unreadCount}</p>
        </div>
        <div className={`rounded-panel border p-5 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Origem</p>
          <p className="mt-2 text-sm font-black uppercase tracking-wide">Painel Admin</p>
        </div>
      </section>

      {loading && notifications.length === 0 && (
        <OperationalState
          variant="loading"
          title="Carregando notificacoes"
          description="Buscando os comunicados mais recentes enviados pela administracao."
        />
      )}

      {error && notifications.length === 0 && (
        <OperationalState
          variant="offline"
          title="Nao foi possivel carregar"
          description="Verifique a conexao. Se houver cache local, ele sera usado automaticamente na proxima tentativa."
          actionLabel="Tentar novamente"
          onAction={() => void refresh(true)}
        />
      )}

      {!loading && !error && notifications.length === 0 && (
        <OperationalState
          variant="empty"
          title="Nenhuma notificacao disponivel"
          description="Novidades, atualizacoes e avisos importantes aparecerao aqui."
        />
      )}

      {notifications.length > 0 && (
        <section className="space-y-4" aria-label="Lista de notificacoes">
          {notifications.map(notification => {
            const config = typeMap[notification.type] || typeMap.info;
            const Icon = config.icon;
            const isRead = readIds.includes(notification.id);

            return (
              <article
                key={notification.id}
                className={`rounded-panel border p-5 md:p-7 transition-all ${
                  isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'
                } ${isRead ? 'opacity-65' : 'ring-1 ring-[#475569]/25'}`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-panel ${config.iconShell}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${config.shell}`}>
                          {config.label}
                        </span>
                        {notification.priority === 'high' && (
                          <span className="rounded-full bg-red-500 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                            Alta prioridade
                          </span>
                        )}
                        {!isRead && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Nao lida" />}
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-40">
                          {formatPublished(notification.published)}
                        </span>
                        {notification.version && (
                          <span className="rounded-md border border-current/10 px-2 py-1 text-[9px] font-black uppercase opacity-50">
                            v{notification.version}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-black tracking-tight">{notification.title}</h2>
                      <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 opacity-75">{notification.body}</p>
                      {notification.details && (
                        <div className={`mt-5 rounded-panel border p-4 text-sm font-semibold leading-7 opacity-75 ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50'}`}>
                          {notification.details}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isRead ? (
                      <div className="inline-flex min-h-10 items-center gap-2 rounded-control border border-current/10 px-4 text-[10px] font-black uppercase tracking-widest opacity-45">
                        <CheckCheck className="h-4 w-4" /> Ja lida
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-control border border-[#475569]/25 bg-[#475569]/10 px-4 text-[10px] font-black uppercase tracking-widest text-[#475569] transition-colors hover:bg-[#475569] hover:text-white"
                      >
                        <Check className="h-4 w-4" /> Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {error && notifications.length > 0 && (
        <div className="flex items-center gap-3 rounded-panel border border-amber-500/25 bg-amber-500/5 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
          <WifiOff className="h-5 w-5 shrink-0" />
          Exibindo notificacoes em cache. Atualize novamente quando a conexao estiver estavel.
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] opacity-35">
          Ultimas 10 notificacoes exibidas.
        </p>
      )}

      {!loading && notifications.length === 0 && !error && (
        <div className="sr-only">
          <BellOff aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
