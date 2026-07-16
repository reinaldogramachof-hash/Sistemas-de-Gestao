-- Security hardening for the multi-tenant Gastro operational tables.
-- Run after 20260713_garcom_mobile_online.sql.

BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.tenant_role(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT member.role
  FROM public.tenant_members AS member
  WHERE member.tenant_id = p_tenant_id
    AND member.user_id = (SELECT auth.uid())
    AND member.active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT app_private.tenant_role(p_tenant_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION app_private.is_tenant_manager(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT app_private.tenant_role(p_tenant_id) IN ('owner', 'admin', 'cashier');
$$;

CREATE OR REPLACE FUNCTION app_private.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT app_private.tenant_role(p_tenant_id) IN ('owner', 'admin');
$$;

REVOKE ALL ON FUNCTION app_private.tenant_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_tenant_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_tenant_manager(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_tenant_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.tenant_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_tenant_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_tenant_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_tenant_admin(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS tenant_members_active_user_tenant_idx
  ON public.tenant_members (user_id, tenant_id)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS restaurant_orders_tenant_waiter_idx
  ON public.restaurant_orders (tenant_id, waiter_id);
CREATE INDEX IF NOT EXISTS restaurant_tables_tenant_idx
  ON public.restaurant_tables (tenant_id);

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;

-- Direct browser writes to memberships are deliberately denied. Account creation
-- and role changes must go through the protected server endpoint.
DROP POLICY IF EXISTS "Admin/owner do tenant podem gerenciar membros" ON public.tenant_members;
DROP POLICY IF EXISTS "Membros do tenant podem visualizar membros" ON public.tenant_members;
DROP POLICY IF EXISTS "Users can read own tenant membership" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant members read memberships" ON public.tenant_members;
DROP POLICY IF EXISTS "admins insert tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "admins update tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "admins delete tenant members" ON public.tenant_members;
DROP POLICY IF EXISTS "Membro ve equipe do proprio tenant" ON public.tenant_members;
CREATE POLICY "Membro ve equipe do proprio tenant"
ON public.tenant_members
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR app_private.is_tenant_admin(tenant_id)
);

DROP POLICY IF EXISTS "Membros do tenant podem visualizar mesas" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Membros do tenant podem atualizar mesas" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Apenas admin pode inserir mesas" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Apenas admin pode deletar mesas" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Administracao pode inserir mesas" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Administracao pode excluir mesas" ON public.restaurant_tables;
CREATE POLICY "Membros do tenant podem visualizar mesas"
ON public.restaurant_tables
FOR SELECT TO authenticated
USING (app_private.is_tenant_member(tenant_id));
CREATE POLICY "Membros do tenant podem atualizar mesas"
ON public.restaurant_tables
FOR UPDATE TO authenticated
USING (app_private.is_tenant_member(tenant_id))
WITH CHECK (app_private.is_tenant_member(tenant_id));
CREATE POLICY "Administracao pode inserir mesas"
ON public.restaurant_tables
FOR INSERT TO authenticated
WITH CHECK (app_private.is_tenant_admin(tenant_id));
CREATE POLICY "Administracao pode excluir mesas"
ON public.restaurant_tables
FOR DELETE TO authenticated
USING (app_private.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS "Membros do tenant podem ler pedidos" ON public.restaurant_orders;
DROP POLICY IF EXISTS "Membros do tenant podem inserir pedidos" ON public.restaurant_orders;
DROP POLICY IF EXISTS "Membros do tenant podem atualizar pedidos" ON public.restaurant_orders;
DROP POLICY IF EXISTS "Admin pode deletar pedidos" ON public.restaurant_orders;
DROP POLICY IF EXISTS "Membro pode inserir pedido proprio" ON public.restaurant_orders;
DROP POLICY IF EXISTS "Gerencia pedido ou garcom altera pedido proprio aberto" ON public.restaurant_orders;
DROP POLICY IF EXISTS "Administracao pode excluir pedidos" ON public.restaurant_orders;
CREATE POLICY "Membros do tenant podem ler pedidos"
ON public.restaurant_orders
FOR SELECT TO authenticated
USING (app_private.is_tenant_member(tenant_id));
CREATE POLICY "Membro pode inserir pedido proprio"
ON public.restaurant_orders
FOR INSERT TO authenticated
WITH CHECK (
  app_private.is_tenant_manager(tenant_id)
  OR (app_private.is_tenant_member(tenant_id) AND waiter_id = (SELECT auth.uid())::TEXT)
);
CREATE POLICY "Gerencia pedido ou garcom altera pedido proprio aberto"
ON public.restaurant_orders
FOR UPDATE TO authenticated
USING (
  app_private.is_tenant_manager(tenant_id)
  OR (waiter_id = (SELECT auth.uid())::TEXT AND status = 'open')
)
WITH CHECK (
  app_private.is_tenant_manager(tenant_id)
  OR (waiter_id = (SELECT auth.uid())::TEXT AND status = 'open')
);
CREATE POLICY "Administracao pode excluir pedidos"
ON public.restaurant_orders
FOR DELETE TO authenticated
USING (app_private.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS "Membros do tenant podem visualizar categorias" ON public.menu_categories;
DROP POLICY IF EXISTS "Membros do tenant podem gerenciar categorias" ON public.menu_categories;
DROP POLICY IF EXISTS "Administracao gerencia categorias" ON public.menu_categories;
CREATE POLICY "Membros do tenant podem visualizar categorias"
ON public.menu_categories
FOR SELECT TO authenticated
USING (app_private.is_tenant_member(tenant_id));
CREATE POLICY "Administracao gerencia categorias"
ON public.menu_categories
FOR ALL TO authenticated
USING (app_private.is_tenant_admin(tenant_id))
WITH CHECK (app_private.is_tenant_admin(tenant_id));

DROP POLICY IF EXISTS "Membros do tenant podem visualizar produtos" ON public.menu_products;
DROP POLICY IF EXISTS "Membros do tenant podem gerenciar produtos" ON public.menu_products;
DROP POLICY IF EXISTS "Administracao gerencia produtos" ON public.menu_products;
CREATE POLICY "Membros do tenant podem visualizar produtos"
ON public.menu_products
FOR SELECT TO authenticated
USING (app_private.is_tenant_member(tenant_id));
CREATE POLICY "Administracao gerencia produtos"
ON public.menu_products
FOR ALL TO authenticated
USING (app_private.is_tenant_admin(tenant_id))
WITH CHECK (app_private.is_tenant_admin(tenant_id));

COMMIT;
