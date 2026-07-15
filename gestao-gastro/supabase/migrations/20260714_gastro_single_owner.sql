-- Migração Versionada: garantir apenas uma proprietária (owner) ativa por tenant.
-- A pré-validação evita falha ambígua caso já existam dados inconsistentes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tenant_members
    WHERE role = 'owner' AND active = true
    GROUP BY tenant_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Há tenants com mais de uma owner ativa. Corrija os vínculos antes de aplicar esta migração.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_owner_per_tenant
ON public.tenant_members (tenant_id)
WHERE (role = 'owner' AND active = true);
