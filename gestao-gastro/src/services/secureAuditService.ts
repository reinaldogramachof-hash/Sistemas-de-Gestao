import { isSupabaseConfigured, supabase } from '../lib/supabase';

export async function writeSecureAudit(tenantId: string, action: string, metadata: Record<string, string | number | boolean> = {}) {
  if (!isSupabaseConfigured || !supabase || !tenantId) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) return;
  await fetch('/api_admin_users.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
    body: JSON.stringify({
      action: 'write_audit_event',
      tenant_id: tenantId,
      event: {
        action: action.replace(/[^a-z0-9_.:-]/gi, '_').slice(0, 80),
        correlation_id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        metadata,
      },
    }),
  });
}
