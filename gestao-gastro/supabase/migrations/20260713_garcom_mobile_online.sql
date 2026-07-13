-- 1. Tabela de Membros de Tenant (Usada para checagem segura de RLS)
CREATE TABLE IF NOT EXISTS public.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'waiter', -- admin, waiter, cashier
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Policy de tenant_members: Apenas o próprio usuário ou um super admin pode ver sua associação
CREATE POLICY "Users can read own tenant membership" 
ON public.tenant_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- 2. Tabela de Mesas
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'livre',
    active_order_id TEXT,
    reservation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, number)
);
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Políticas Seguras de Mesas
CREATE POLICY "Membros do tenant podem visualizar mesas" 
ON public.restaurant_tables
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);

CREATE POLICY "Membros do tenant podem atualizar mesas" 
ON public.restaurant_tables
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);

CREATE POLICY "Apenas admin pode inserir mesas" 
ON public.restaurant_tables
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid() AND t.role = 'admin'
  )
);

CREATE POLICY "Apenas admin pode deletar mesas" 
ON public.restaurant_tables
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid() AND t.role = 'admin'
  )
);


-- 3. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.restaurant_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    table_number INTEGER,
    customer_name TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    service_charge NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payments JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open',
    waiter_id TEXT NOT NULL,
    waiter_name TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;

-- Políticas Seguras de Pedidos
CREATE POLICY "Membros do tenant podem ler pedidos" 
ON public.restaurant_orders
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);

CREATE POLICY "Membros do tenant podem inserir pedidos" 
ON public.restaurant_orders
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);

CREATE POLICY "Membros do tenant podem atualizar pedidos" 
ON public.restaurant_orders
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);

CREATE POLICY "Admin pode deletar pedidos" 
ON public.restaurant_orders
FOR DELETE
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid() AND t.role = 'admin'
  )
);


-- 4. Tabela de Categorias do Cardápio
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros do tenant podem visualizar categorias" 
ON public.menu_categories
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);


-- 5. Tabela de Produtos do Cardápio
CREATE TABLE IF NOT EXISTS public.menu_products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category_id UUID REFERENCES public.menu_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros do tenant podem visualizar produtos" 
ON public.menu_products
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT t.tenant_id FROM public.tenant_members t WHERE t.user_id = auth.uid()
  )
);

-- Ativando realtime para restaurant_tables e restaurant_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_orders;
