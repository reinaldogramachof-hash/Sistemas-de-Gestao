-- Central SaaS schema for Sistemas de Gestão.
-- This migration belongs to the platform/admin layer, not to a single product.
--
-- REGRAS DE IMPACTO DO CATÁLOGO SAAS:
-- 1. Alterações nas definições de planos e módulos na tabela public.plan_modules afetam apenas novos provisionamentos.
-- 2. Clientes (tenants) já provisionados utilizam a tabela public.tenant_modules como cópia local e estática no momento do provisionamento.
-- 3. Edições e adições de novos módulos para um cliente ativo devem ser realizadas diretamente na tabela public.tenant_modules do tenant específico, e não alterando o plano global (evitando quebras retroativas).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    document TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID NOT NULL REFERENCES public.systems(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    billing_model TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_model IN ('monthly', 'trial', 'lifetime', 'one_time')),
    price_cents INTEGER NOT NULL DEFAULT 0,
    max_users INTEGER,
    max_devices INTEGER,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(system_id, slug)
);

CREATE TABLE IF NOT EXISTS public.plan_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    module_name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plan_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    system_id UUID REFERENCES public.systems(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS system_id UUID REFERENCES public.systems(id);
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.tenant_members (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    system_id UUID REFERENCES public.systems(id),
    plan_id UUID REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked', 'expired', 'archived')),
    sales_channel TEXT NOT NULL DEFAULT 'direct',
    license_type TEXT NOT NULL DEFAULT 'monthly',
    payment_model TEXT NOT NULL DEFAULT 'recurring',
    max_devices INTEGER,
    device_id TEXT,
    activation_email TEXT,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS system_id UUID REFERENCES public.systems(id);
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS license_type TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS payment_model TEXT NOT NULL DEFAULT 'recurring';
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS activation_email TEXT;
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    module_name TEXT NOT NULL,
    source_plan_id UUID REFERENCES public.plans(id),
    enabled BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, module_key)
);

CREATE TABLE IF NOT EXISTS public.saas_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    action TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    tenant_id UUID REFERENCES public.tenants(id),
    system_id UUID REFERENCES public.systems(id),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.systems (slug, name, description, metadata)
VALUES
    ('gestao-gastro', 'Gestão Gastro', 'Restaurantes, bares e lanchonetes', '{"public_path":"gestao-gastro","icon":"utensils"}'::jsonb),
    ('gestao-barbearia', 'Gestão Barbearia', 'Barbearias e profissionais de beleza masculina', '{"public_path":"gestao-barbearia","icon":"scissors"}'::jsonb),
    ('gestao-beleza', 'Gestão Beleza', 'Salões, estética e pacotes', '{"public_path":"gestao-beleza","icon":"sparkles"}'::jsonb)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    metadata = public.systems.metadata || EXCLUDED.metadata,
    updated_at = now();

WITH system_rows AS (
    SELECT id, slug FROM public.systems
),
plan_seed AS (
    SELECT s.id AS system_id, v.slug, v.name, v.billing_model, v.price_cents, v.max_users, v.max_devices, v.modules
    FROM system_rows s
    JOIN (
        VALUES
        ('gestao-gastro', 'basic', 'Básico', 'monthly', 9700, 12, 3, '[
          {"key":"pdv","name":"PDV"},
          {"key":"mesas_garcom_mobile","name":"Mesas e Garçom Mobile"},
          {"key":"caixa","name":"Caixa"},
          {"key":"dashboard","name":"Dashboard"},
          {"key":"cardapio","name":"Cardápio"},
          {"key":"financeiro","name":"Financeiro"},
          {"key":"estoque","name":"Estoque"},
          {"key":"manual","name":"Manual"},
          {"key":"configuracao","name":"Configuração"},
          {"key":"suporte","name":"Suporte"}
        ]'::jsonb),
        ('gestao-gastro', 'premium', 'Premium', 'monthly', 19700, null, null, '[
          {"key":"pdv","name":"PDV"},
          {"key":"mesas_garcom_mobile","name":"Mesas e Garçom Mobile"},
          {"key":"caixa","name":"Caixa"},
          {"key":"dashboard","name":"Dashboard"},
          {"key":"cardapio","name":"Cardápio"},
          {"key":"financeiro","name":"Financeiro"},
          {"key":"estoque","name":"Estoque"},
          {"key":"manual","name":"Manual"},
          {"key":"configuracao","name":"Configuração"},
          {"key":"suporte","name":"Suporte"},
          {"key":"kds","name":"Kitchen Display"},
          {"key":"relatorios_avancados","name":"Relatórios Avançados"}
        ]'::jsonb),
        ('gestao-gastro', 'trial', 'Trial', 'trial', 0, 12, 3, '[
          {"key":"pdv","name":"PDV"},
          {"key":"mesas_garcom_mobile","name":"Mesas e Garçom Mobile"},
          {"key":"caixa","name":"Caixa"},
          {"key":"dashboard","name":"Dashboard"},
          {"key":"cardapio","name":"Cardápio"},
          {"key":"financeiro","name":"Financeiro"},
          {"key":"estoque","name":"Estoque"},
          {"key":"manual","name":"Manual"},
          {"key":"configuracao","name":"Configuração"},
          {"key":"suporte","name":"Suporte"}
        ]'::jsonb),
        ('gestao-barbearia', 'basic', 'Básico', 'monthly', 5900, 6, 2, '[{"key":"agenda","name":"Agenda"},{"key":"caixa","name":"Caixa"},{"key":"clientes","name":"Clientes"},{"key":"servicos","name":"Serviços"},{"key":"profissionais","name":"Profissionais"},{"key":"relatorios","name":"Relatórios"},{"key":"suporte","name":"Suporte"}]'::jsonb),
        ('gestao-barbearia', 'premium', 'Premium Online', 'monthly', 9900, null, null, '[{"key":"agenda","name":"Agenda"},{"key":"caixa","name":"Caixa"},{"key":"clientes","name":"Clientes"},{"key":"servicos","name":"Serviços"},{"key":"profissionais","name":"Profissionais"},{"key":"relatorios","name":"Relatórios"},{"key":"comissoes","name":"Comissões"},{"key":"agendamento_online","name":"Agendamento Online"},{"key":"suporte","name":"Suporte"}]'::jsonb),
        ('gestao-beleza', 'basic', 'Básico', 'monthly', 6900, 6, 2, '[{"key":"agenda","name":"Agenda"},{"key":"caixa","name":"Caixa"},{"key":"clientes","name":"Clientes"},{"key":"servicos","name":"Serviços"},{"key":"estoque","name":"Estoque"},{"key":"suporte","name":"Suporte"}]'::jsonb),
        ('gestao-beleza', 'premium', 'Premium', 'monthly', 12900, null, null, '[{"key":"agenda","name":"Agenda"},{"key":"caixa","name":"Caixa"},{"key":"clientes","name":"Clientes"},{"key":"servicos","name":"Serviços"},{"key":"estoque","name":"Estoque"},{"key":"pacotes","name":"Pacotes"},{"key":"relatorios","name":"Relatórios"},{"key":"suporte","name":"Suporte"}]'::jsonb)
    ) AS v(system_slug, slug, name, billing_model, price_cents, max_users, max_devices, modules)
    ON v.system_slug = s.slug
),
upserted_plans AS (
    INSERT INTO public.plans (system_id, slug, name, billing_model, price_cents, max_users, max_devices)
    SELECT system_id, slug, name, billing_model, price_cents, max_users, max_devices
    FROM plan_seed
    ON CONFLICT (system_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        billing_model = EXCLUDED.billing_model,
        price_cents = EXCLUDED.price_cents,
        max_users = EXCLUDED.max_users,
        max_devices = EXCLUDED.max_devices,
        updated_at = now()
    RETURNING id, system_id, slug
)
INSERT INTO public.plan_modules (plan_id, module_key, module_name)
SELECT p.id, module_item->>'key', module_item->>'name'
FROM upserted_plans p
JOIN plan_seed seed ON seed.system_id = p.system_id AND seed.slug = p.slug
CROSS JOIN LATERAL jsonb_array_elements(seed.modules) module_item
ON CONFLICT (plan_id, module_key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    enabled = true;

CREATE OR REPLACE FUNCTION public.provision_saas_tenant(
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_tenant_name TEXT,
    p_tenant_slug TEXT,
    p_system_id TEXT,
    p_plan_id TEXT,
    p_license_key TEXT,
    p_license_type TEXT DEFAULT 'monthly',
    p_modules TEXT[] DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_customer_id UUID;
    v_system_uuid UUID;
    v_plan_uuid UUID;
    v_tenant_id UUID;
    v_module RECORD;
    v_table_count INTEGER;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;
    IF p_tenant_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION 'Invalid tenant slug';
    END IF;

    SELECT id INTO v_system_uuid
    FROM public.systems
    WHERE slug = p_system_id AND status = 'active';

    IF v_system_uuid IS NULL THEN
        RAISE EXCEPTION 'Unknown or inactive system %', p_system_id;
    END IF;

    SELECT id INTO v_plan_uuid
    FROM public.plans
    WHERE system_id = v_system_uuid AND slug = p_plan_id AND status = 'active';

    IF v_plan_uuid IS NULL THEN
        RAISE EXCEPTION 'Unknown or inactive plan % for system %', p_plan_id, p_system_id;
    END IF;

    IF p_license_type = 'trial' AND p_expires_at IS NULL THEN
        p_expires_at := now() + interval '14 days';
    END IF;

    INSERT INTO public.customers (name, email, status)
    VALUES (p_customer_name, lower(p_customer_email), 'active')
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        status = 'active',
        updated_at = now()
    RETURNING id INTO v_customer_id;

    INSERT INTO public.tenants (name, slug, customer_id, system_id, status, metadata)
    VALUES (p_tenant_name, p_tenant_slug, v_customer_id, v_system_uuid, 'active', jsonb_build_object('plan_slug', p_plan_id))
    RETURNING id INTO v_tenant_id;

    INSERT INTO public.tenant_members (tenant_id, user_id, role, active)
    VALUES (v_tenant_id, p_user_id, 'owner', true)
    ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = 'owner',
        active = true;

    INSERT INTO public.licenses (
        license_key,
        customer_id,
        tenant_id,
        system_id,
        plan_id,
        status,
        sales_channel,
        license_type,
        payment_model,
        activation_email,
        expires_at,
        metadata
    )
    VALUES (
        p_license_key,
        v_customer_id,
        v_tenant_id,
        v_system_uuid,
        v_plan_uuid,
        'active',
        'direct',
        p_license_type,
        CASE WHEN p_license_type = 'trial' THEN 'trial' ELSE 'recurring' END,
        lower(p_customer_email),
        p_expires_at,
        jsonb_build_object('plan_slug', p_plan_id, 'system_slug', p_system_id)
    );

    FOR v_module IN
        SELECT module_key, module_name
        FROM public.plan_modules
        WHERE plan_id = v_plan_uuid AND enabled = true
    LOOP
        IF p_modules IS NULL OR v_module.module_key = ANY(p_modules) THEN
            INSERT INTO public.tenant_modules (tenant_id, module_key, module_name, source_plan_id, enabled)
            VALUES (v_tenant_id, v_module.module_key, v_module.module_name, v_plan_uuid, true)
            ON CONFLICT (tenant_id, module_key) DO UPDATE
            SET module_name = EXCLUDED.module_name,
                source_plan_id = EXCLUDED.source_plan_id,
                enabled = true,
                updated_at = now();
        END IF;
    END LOOP;

    IF p_system_id = 'gestao-gastro' THEN
        FOR v_table_count IN 1..12 LOOP
            INSERT INTO public.restaurant_tables (tenant_id, number, status)
            VALUES (v_tenant_id, v_table_count, 'livre')
            ON CONFLICT (tenant_id, number) DO NOTHING;
        END LOOP;
    END IF;

    INSERT INTO public.saas_audit_logs (actor_user_id, action, customer_id, tenant_id, system_id, payload)
    VALUES (
        p_user_id,
        'tenant.provisioned',
        v_customer_id,
        v_tenant_id,
        v_system_uuid,
        jsonb_build_object('system_slug', p_system_id, 'plan_slug', p_plan_id, 'license_key', p_license_key)
    );

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer_id,
        'tenant_id', v_tenant_id,
        'system_id', v_system_uuid,
        'plan_id', v_plan_uuid
    );
END;
$$;

REVOKE ALL ON FUNCTION public.provision_saas_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_saas_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION public.provision_saas_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.provision_saas_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TIMESTAMPTZ) TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_audit_logs ENABLE ROW LEVEL SECURITY;
