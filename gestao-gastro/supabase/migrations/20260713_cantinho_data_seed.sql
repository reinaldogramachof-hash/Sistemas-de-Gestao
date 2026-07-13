-- Seed data for Cantinho da Resenha
-- Tenant ID: cd8f21f4-73a1-4c87-a385-9b6deacaeae7
-- AVISO: Não aplicar este seed automaticamente em pipelines CI/CD sem autorização.
-- As mesas (1 a 12) podem ser aplicadas via SQL Editor no Supabase.
-- A criação de usuários deve ser feita no Dashboard (Auth), com posterior amarração no tenant_members.

-- 1. Create Tables 1 to 12
DO $$
DECLARE
  v_tenant_id UUID := 'cd8f21f4-73a1-4c87-a385-9b6deacaeae7';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    INSERT INTO public.restaurant_tables (tenant_id, number, status, active_order_id, reservation_reason)
    VALUES (v_tenant_id, i, 'livre', null, null)
    ON CONFLICT (tenant_id, number) DO NOTHING;
  END LOOP;
END $$;

-- =======================================================================
-- ROTEIRO OPERACIONAL PARA ACESSO SEGURO (INSTRUÇÕES PARA O ADMINISTRADOR)
-- =======================================================================
/*
A fim de preservar o RLS e a segurança, você precisará:

1. Acessar o Dashboard do Supabase -> Authentication -> Users.
2. Criar os usuários desejados usando "Add user":
   - admin@cantinho.com (Senha segura)
   - caixa@cantinho.com (Senha segura)
   - garcom@cantinho.com (Senha segura)
3. Copiar os IDs (UUIDs) dos usuários criados.
4. No SQL Editor do Supabase, rodar os comandos abaixo substituindo os UUIDs correspondentes:

INSERT INTO public.tenant_members (tenant_id, user_id, role, active)
VALUES 
  ('cd8f21f4-73a1-4c87-a385-9b6deacaeae7', 'UUID-DO-ADMIN', 'owner', true),
  ('cd8f21f4-73a1-4c87-a385-9b6deacaeae7', 'UUID-DO-CAIXA', 'cashier', true),
  ('cd8f21f4-73a1-4c87-a385-9b6deacaeae7', 'UUID-DO-GARCOM', 'waiter', true)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET active = EXCLUDED.active, role = EXCLUDED.role;
*/
