-- Seed data for Gestão Teste (Ambiente de Validação)
-- AVISO: Mantenha este script ISOLADO do tenant Cantinho da Resenha.
-- Este script prepara o ambiente para o cliente "Gestão Teste".

-- INSTRUÇÕES DE USO:
-- 1. Descubra o TENANT_ID do seu ambiente "gestao-teste" na tabela tenants (ou crie um se não existir).
-- 2. Substitua o valor '<INSIRA_SEU_TENANT_ID_AQUI>' pelo UUID correto abaixo.
-- 3. Rode no SQL Editor do Supabase.

DO $$
DECLARE
  v_tenant_id UUID := '552e5a5a-6bb7-49ee-abd4-51614e3ebdf3'; -- Cole o UUID do gestao-teste aqui
  v_cat_bebidas UUID := gen_random_uuid();
  v_cat_lanches UUID := gen_random_uuid();
  v_cat_sobremesas UUID := gen_random_uuid();
  
  v_prod_coca UUID := gen_random_uuid();
  v_prod_suco UUID := gen_random_uuid();
  v_prod_burguer UUID := gen_random_uuid();
  v_prod_salada UUID := gen_random_uuid();
  v_prod_pudim UUID := gen_random_uuid();
  
  v_order_mesa1 UUID := gen_random_uuid();
  v_order_mesa3 UUID := gen_random_uuid();
  i INTEGER;
BEGIN

  -- 1. Criação das Mesas (1 a 10)
  FOR i IN 1..10 LOOP
    INSERT INTO public.restaurant_tables (tenant_id, number, status, active_order_id, reservation_reason)
    VALUES (v_tenant_id, i, 'livre', null, null)
    ON CONFLICT (tenant_id, number) DO NOTHING;
  END LOOP;

  -- 2. Criação de Categorias
  INSERT INTO public.menu_categories (id, tenant_id, name, sort_order)
  VALUES 
    (v_cat_bebidas, v_tenant_id, 'Bebidas', 1),
    (v_cat_lanches, v_tenant_id, 'Lanches', 2),
    (v_cat_sobremesas, v_tenant_id, 'Sobremesas', 3)
  ON CONFLICT DO NOTHING;

  -- 3. Criação de Produtos
  INSERT INTO public.menu_products (id, tenant_id, category_id, name, description, price_cents, active)
  VALUES 
    (v_prod_coca, v_tenant_id, v_cat_bebidas, 'Coca-Cola', 'Refrigerante 350ml', 700, true),
    (v_prod_suco, v_tenant_id, v_cat_bebidas, 'Suco de Laranja', 'Copo 400ml Natural', 900, true),
    (v_prod_burguer, v_tenant_id, v_cat_lanches, 'X-Burguer', 'Pão, Carne 150g, Queijo', 2500, true),
    (v_prod_salada, v_tenant_id, v_cat_lanches, 'X-Salada', 'Pão, Carne 150g, Queijo, Alface, Tomate', 2800, true),
    (v_prod_pudim, v_tenant_id, v_cat_sobremesas, 'Pudim de Leite', 'Fatia de pudim caseiro', 1200, true)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Criar pedidos simulados (Comandas Abertas)
  -- Mesa 1: Ocupada com pedido
  INSERT INTO public.restaurant_orders (
    id, tenant_id, mode, table_number, comanda_label, items, subtotal, service_charge, total, status, waiter_id, waiter_name
  ) VALUES (
    v_order_mesa1::text, v_tenant_id, 'mesa', 1, 'Comanda Geral',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'product', jsonb_build_object('id', v_prod_burguer, 'name', 'X-Burguer', 'price', 25.00), 'quantity', 2, 'price', 25.00),
      jsonb_build_object('id', gen_random_uuid(), 'product', jsonb_build_object('id', v_prod_coca, 'name', 'Coca-Cola', 'price', 7.00), 'quantity', 2, 'price', 7.00)
    ),
    64.00, 6.40, 70.40, 'open', 'garcom_simulado_id', 'Garçom Teste'
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE public.restaurant_tables 
  SET status = 'ocupada', active_order_id = v_order_mesa1::text 
  WHERE tenant_id = v_tenant_id AND number = 1;

  -- Mesa 3: Ocupada com pedido
  INSERT INTO public.restaurant_orders (
    id, tenant_id, mode, table_number, comanda_label, items, subtotal, service_charge, total, status, waiter_id, waiter_name
  ) VALUES (
    v_order_mesa3::text, v_tenant_id, 'mesa', 3, 'Comanda Geral',
    jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid(), 'product', jsonb_build_object('id', v_prod_salada, 'name', 'X-Salada', 'price', 28.00), 'quantity', 1, 'price', 28.00),
      jsonb_build_object('id', gen_random_uuid(), 'product', jsonb_build_object('id', v_prod_suco, 'name', 'Suco de Laranja', 'price', 9.00), 'quantity', 1, 'price', 9.00)
    ),
    37.00, 3.70, 40.70, 'open', 'garcom_simulado_id', 'Garçom Teste'
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE public.restaurant_tables 
  SET status = 'ocupada', active_order_id = v_order_mesa3::text 
  WHERE tenant_id = v_tenant_id AND number = 3;

END $$;

-- =======================================================================
-- ROTEIRO OPERACIONAL PARA ACESSO (PERFIS DE TESTE)
-- =======================================================================
/*
A fim de preservar o RLS e a segurança sem interferir no cliente real:

1. Acesse o Dashboard do Supabase -> Authentication -> Users.
2. Crie os usuários para o seu teste:
   - admin@gestaoteste.com
   - caixa@gestaoteste.com
   - garcom@gestaoteste.com
3. Copie os IDs (UUIDs) dos usuários recém-criados.
4. No SQL Editor, rode o comando abaixo substituindo os UUIDs correspondentes e o TENANT_ID:

INSERT INTO public.tenant_members (tenant_id, user_id, role, active)
VALUES 
  ('<INSIRA_SEU_TENANT_ID_AQUI>', 'UUID-DO-ADMIN-TESTE', 'owner', true),
  ('<INSIRA_SEU_TENANT_ID_AQUI>', 'UUID-DO-CAIXA-TESTE', 'cashier', true),
  ('<INSIRA_SEU_TENANT_ID_AQUI>', 'UUID-DO-GARCOM-TESTE', 'waiter', true)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET active = EXCLUDED.active, role = EXCLUDED.role;
*/
