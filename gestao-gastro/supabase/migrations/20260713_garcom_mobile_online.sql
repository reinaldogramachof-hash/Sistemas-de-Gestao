-- Garcom Mobile Online - Gestao Gastro
-- Compatível com o catalogo comercial existente: tenant_id UUID e menu_products.price_cents.

CREATE TABLE IF NOT EXISTS public.tenant_members (
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tenant membership" ON public.tenant_members;
CREATE POLICY "Users can read own tenant membership"
ON public.tenant_members
FOR SELECT
TO authenticated
USING (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'livre' CHECK (status IN ('livre', 'ocupada', 'aguardando', 'reservada')),
    active_order_id TEXT,
    reservation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, number)
);
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_restaurant_tables_updated_at ON public.restaurant_tables;
CREATE TRIGGER set_restaurant_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Membros do tenant podem visualizar mesas" ON public.restaurant_tables;
CREATE POLICY "Membros do tenant podem visualizar mesas"
ON public.restaurant_tables
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

DROP POLICY IF EXISTS "Membros do tenant podem atualizar mesas" ON public.restaurant_tables;
CREATE POLICY "Membros do tenant podem atualizar mesas"
ON public.restaurant_tables
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

DROP POLICY IF EXISTS "Apenas admin pode inserir mesas" ON public.restaurant_tables;
CREATE POLICY "Apenas admin pode inserir mesas"
ON public.restaurant_tables
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true AND t.role IN ('owner', 'admin')
  )
);

DROP POLICY IF EXISTS "Apenas admin pode deletar mesas" ON public.restaurant_tables;
CREATE POLICY "Apenas admin pode deletar mesas"
ON public.restaurant_tables
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true AND t.role IN ('owner', 'admin')
  )
);

CREATE TABLE IF NOT EXISTS public.restaurant_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id UUID NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('mesa', 'balcao')),
    table_number INTEGER,
    customer_name TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    service_charge NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    waiter_id TEXT NOT NULL,
    waiter_name TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_restaurant_orders_updated_at ON public.restaurant_orders;
CREATE TRIGGER set_restaurant_orders_updated_at
BEFORE UPDATE ON public.restaurant_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Membros do tenant podem ler pedidos" ON public.restaurant_orders;
CREATE POLICY "Membros do tenant podem ler pedidos"
ON public.restaurant_orders
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

DROP POLICY IF EXISTS "Membros do tenant podem inserir pedidos" ON public.restaurant_orders;
CREATE POLICY "Membros do tenant podem inserir pedidos"
ON public.restaurant_orders
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

DROP POLICY IF EXISTS "Membros do tenant podem atualizar pedidos" ON public.restaurant_orders;
CREATE POLICY "Membros do tenant podem atualizar pedidos"
ON public.restaurant_orders
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

DROP POLICY IF EXISTS "Admin pode deletar pedidos" ON public.restaurant_orders;
CREATE POLICY "Admin pode deletar pedidos"
ON public.restaurant_orders
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true AND t.role IN ('owner', 'admin')
  )
);

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros do tenant podem visualizar categorias" ON public.menu_categories;
CREATE POLICY "Membros do tenant podem visualizar categorias"
ON public.menu_categories
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros do tenant podem visualizar produtos" ON public.menu_products;
CREATE POLICY "Membros do tenant podem visualizar produtos"
ON public.menu_products
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t
    WHERE t.user_id = (select auth.uid()) AND t.active = true
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'restaurant_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'restaurant_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_orders;
  END IF;
END $$;
