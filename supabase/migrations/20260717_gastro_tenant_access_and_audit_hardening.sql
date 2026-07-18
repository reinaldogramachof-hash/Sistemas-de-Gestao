-- Gestão Gastro: permissões por tenant, auditoria operacional e correções de segurança.

CREATE INDEX IF NOT EXISTS tenant_modules_source_plan_id_idx
  ON public.tenant_modules (source_plan_id);
CREATE INDEX IF NOT EXISTS saas_audit_logs_tenant_created_at_idx
  ON public.saas_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saas_audit_logs_customer_id_idx
  ON public.saas_audit_logs (customer_id);
CREATE INDEX IF NOT EXISTS saas_audit_logs_system_id_idx
  ON public.saas_audit_logs (system_id);

DROP POLICY IF EXISTS "Active tenant members can read enabled modules" ON public.tenant_modules;
CREATE POLICY "Active tenant members can read enabled modules"
  ON public.tenant_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members member
      WHERE member.tenant_id = tenant_modules.tenant_id
        AND member.user_id = (SELECT auth.uid())
        AND member.active = true
    )
  );

DROP POLICY IF EXISTS "Tenant administrators can read SaaS audit logs" ON public.saas_audit_logs;
CREATE POLICY "Tenant administrators can read SaaS audit logs"
  ON public.saas_audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_members member
      WHERE member.tenant_id = saas_audit_logs.tenant_id
        AND member.user_id = (SELECT auth.uid())
        AND member.active = true
        AND member.role IN ('owner', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.purge_saas_audit_logs(p_retention_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF p_retention_days < 30 OR p_retention_days > 3650 THEN
    RAISE EXCEPTION 'Retention period out of bounds';
  END IF;
  DELETE FROM public.saas_audit_logs
  WHERE created_at < now() - make_interval(days => p_retention_days);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_saas_audit_logs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_saas_audit_logs(integer) TO service_role;

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.gastro_slugify(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_menu_category_slug() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_menu_product_slug() SET search_path = public, pg_temp;
ALTER FUNCTION public.activate_license(text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_license_snapshot(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.list_notifications_for_license(text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.activate_license(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_license_snapshot(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_notifications_for_license(text) FROM PUBLIC, anon, authenticated;
