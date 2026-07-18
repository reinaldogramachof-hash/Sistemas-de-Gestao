-- Gestão Gastro: aplica privilégio mínimo às tabelas de módulos e auditoria.

ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tenant_modules FROM anon, authenticated;
REVOKE ALL ON TABLE public.saas_audit_logs FROM anon, authenticated;

GRANT SELECT ON TABLE public.tenant_modules TO authenticated;
GRANT SELECT ON TABLE public.saas_audit_logs TO authenticated;
