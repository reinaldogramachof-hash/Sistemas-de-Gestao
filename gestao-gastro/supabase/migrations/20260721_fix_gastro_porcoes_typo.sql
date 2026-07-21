-- Migration to fix the 'Porçoões' category typo in menu_categories.
-- Safe upgrade: merges products if 'Porções' already exists, or renames the category if not.

DO $$
DECLARE
  v_dup_category_id UUID;
  v_correct_category_id UUID;
  r RECORD;
BEGIN
  -- Percorre todos os tenants que possuem a categoria com o erro ortográfico
  FOR r IN 
    SELECT id, tenant_id FROM public.menu_categories WHERE name = 'Porçoões'
  LOOP
    v_dup_category_id := r.id;
    
    -- Verifica se o mesmo tenant já possui a categoria correta 'Porções'
    SELECT id INTO v_correct_category_id 
    FROM public.menu_categories 
    WHERE tenant_id = r.tenant_id AND name = 'Porções'
    LIMIT 1;
    
    IF v_correct_category_id IS NOT NULL THEN
      -- Se a categoria correta já existe, movemos todos os produtos da incorreta para a correta
      UPDATE public.menu_products 
      SET category_id = v_correct_category_id 
      WHERE category_id = v_dup_category_id;
      
      -- E deletamos a categoria duplicada
      DELETE FROM public.menu_categories WHERE id = v_dup_category_id;
      
      RAISE NOTICE 'Merged duplicate Porçoões into Porções for tenant %', r.tenant_id;
    ELSE
      -- Se a categoria correta não existe, apenas renomeamos a existente
      UPDATE public.menu_categories 
      SET name = 'Porções' 
      WHERE id = v_dup_category_id;
      
      RAISE NOTICE 'Renamed Porçoões to Porções for tenant %', r.tenant_id;
    END IF;
  END LOOP;
END $$;
