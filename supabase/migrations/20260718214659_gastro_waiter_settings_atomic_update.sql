-- Gestão Gastro: atualiza apenas a configuração de acesso do garçom, sem sobrescrever outros metadados.

CREATE OR REPLACE FUNCTION public.set_tenant_waiter_access_settings(
  p_tenant_id uuid,
  p_settings jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Settings must be a JSON object';
  END IF;

  UPDATE public.tenants
  SET metadata = COALESCE(metadata, '{}'::jsonb)
    || jsonb_build_object('waiter_access', p_settings)
  WHERE id = p_tenant_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.set_tenant_waiter_access_settings(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_waiter_access_settings(uuid, jsonb)
  TO service_role;
