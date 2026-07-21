import { useApp } from '../store/AppContext';
import { logEvent } from '../services/auditService';
import { AuditLogEntry } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const sanitizeAuditMetadata = (extra?: Record<string, unknown>): Record<string, unknown> => {
  if (!extra) return {};
  const blocked = /password|token|secret|license_key/i;
  return Object.fromEntries(Object.entries(extra)
    .filter(([key, value]) => !blocked.test(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 120) : value]));
};

export function useAudit() {
  const { currentUser, currentEmpresa } = useApp();
  const log = (type: string, detail: string, extra?: Record<string, unknown>) => {
    if (!currentUser || !currentEmpresa) return;
    logEvent({
      type,
      userId: currentUser.id,
      userName: currentUser.name,
      empresaId: currentEmpresa.id,
      detail,
      extra
    }, currentEmpresa.id);

    if (isSupabaseConfigured && currentEmpresa.tenantId && supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        if (!data.session?.access_token) return;
        return fetch('/api_admin_users.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
          body: JSON.stringify({
            action: 'write_audit_event',
            tenant_id: currentEmpresa.tenantId,
            event: {
              action: type.replace(/[^a-z0-9_.:-]/gi, '_').slice(0, 80),
              correlation_id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
              metadata: sanitizeAuditMetadata(extra),
            },
          }),
        });
      }).catch(() => undefined);
    }
  };
  return { log };
}
