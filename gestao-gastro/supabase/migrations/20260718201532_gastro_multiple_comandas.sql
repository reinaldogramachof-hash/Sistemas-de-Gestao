-- Gestao Gastro: multiple open checks per table with atomic lifecycle operations.

ALTER TABLE public.restaurant_orders
  ADD COLUMN IF NOT EXISTS comanda_label varchar(80),
  ADD COLUMN IF NOT EXISTS offline_id_key text;

ALTER TABLE public.restaurant_orders
  DROP CONSTRAINT IF EXISTS restaurant_orders_comanda_label_check,
  ADD CONSTRAINT restaurant_orders_comanda_label_check
    CHECK (
      comanda_label IS NULL
      OR char_length(btrim(comanda_label)) BETWEEN 1 AND 80
    ),
  DROP CONSTRAINT IF EXISTS restaurant_orders_offline_id_key_check,
  ADD CONSTRAINT restaurant_orders_offline_id_key_check
    CHECK (
      offline_id_key IS NULL
      OR char_length(btrim(offline_id_key)) BETWEEN 1 AND 128
    );

WITH ranked_open_orders AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, table_number
      ORDER BY created_at, id
    ) AS position
  FROM public.restaurant_orders
  WHERE mode = 'mesa'
    AND table_number IS NOT NULL
    AND status = 'open'
    AND comanda_label IS NULL
)
UPDATE public.restaurant_orders orders
SET comanda_label = CASE
  WHEN ranked.position = 1 THEN 'Comanda Geral'
  ELSE 'Comanda ' || ranked.position::text
END
FROM ranked_open_orders ranked
WHERE orders.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_orders_open_comanda_label_key
  ON public.restaurant_orders (
    tenant_id,
    table_number,
    lower(btrim(comanda_label))
  )
  WHERE mode = 'mesa'
    AND status = 'open'
    AND table_number IS NOT NULL
    AND comanda_label IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS restaurant_orders_offline_id_key_key
  ON public.restaurant_orders (tenant_id, offline_id_key)
  WHERE offline_id_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS restaurant_orders_open_table_created_idx
  ON public.restaurant_orders (tenant_id, table_number, created_at, id)
  WHERE mode = 'mesa' AND status = 'open';

CREATE OR REPLACE FUNCTION public.gastro_create_comanda_rpc(
  p_tenant_id uuid,
  p_table_number integer,
  p_comanda_label text,
  p_offline_id_key text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_count integer DEFAULT NULL,
  p_adult_count integer DEFAULT NULL,
  p_children_count integer DEFAULT NULL,
  p_general_observation text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_subtotal numeric DEFAULT 0,
  p_service_charge numeric DEFAULT 0,
  p_total numeric DEFAULT 0,
  p_waiter_id text DEFAULT NULL,
  p_waiter_name text DEFAULT NULL,
  p_timestamp timestamptz DEFAULT now()
)
RETURNS public.restaurant_orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_order public.restaurant_orders%ROWTYPE;
  v_table public.restaurant_tables%ROWTYPE;
  v_waiter_id text;
  v_label text := btrim(p_comanda_label);
  v_offline_key text := NULLIF(btrim(p_offline_id_key), '');
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT app_private.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Usuario sem acesso ao tenant' USING ERRCODE = '42501';
  END IF;

  IF p_table_number IS NULL OR p_table_number <= 0 THEN
    RAISE EXCEPTION 'Numero da mesa invalido' USING ERRCODE = '22023';
  END IF;

  IF v_label IS NULL OR char_length(v_label) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Identificador da comanda deve ter entre 1 e 80 caracteres'
      USING ERRCODE = '22023';
  END IF;

  IF v_offline_key IS NOT NULL AND char_length(v_offline_key) > 128 THEN
    RAISE EXCEPTION 'Chave offline excede 128 caracteres' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Itens da comanda devem ser um array JSON' USING ERRCODE = '22023';
  END IF;

  IF COALESCE(p_subtotal, 0) < 0
    OR COALESCE(p_service_charge, 0) < 0
    OR COALESCE(p_total, 0) < 0 THEN
    RAISE EXCEPTION 'Valores da comanda nao podem ser negativos' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_table
  FROM public.restaurant_tables
  WHERE tenant_id = p_tenant_id
    AND number = p_table_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_table.status = 'reservada' THEN
    RAISE EXCEPTION 'Mesa reservada deve ser liberada antes da abertura da comanda'
      USING ERRCODE = '55000';
  END IF;

  IF v_offline_key IS NOT NULL THEN
    SELECT *
    INTO v_order
    FROM public.restaurant_orders
    WHERE tenant_id = p_tenant_id
      AND offline_id_key = v_offline_key;

    IF FOUND THEN
      RETURN v_order;
    END IF;
  END IF;

  v_waiter_id := COALESCE(NULLIF(btrim(p_waiter_id), ''), (SELECT auth.uid())::text);

  IF NOT app_private.is_tenant_manager(p_tenant_id)
    AND v_waiter_id <> (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Garcom so pode criar comandas em seu proprio nome'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.restaurant_orders (
    tenant_id,
    mode,
    table_number,
    customer_name,
    customer_count,
    adult_count,
    children_count,
    general_observation,
    items,
    subtotal,
    service_charge,
    total,
    payments,
    status,
    waiter_id,
    waiter_name,
    timestamp,
    comanda_label,
    offline_id_key
  ) VALUES (
    p_tenant_id,
    'mesa',
    p_table_number,
    NULLIF(btrim(p_customer_name), ''),
    p_customer_count,
    p_adult_count,
    p_children_count,
    NULLIF(btrim(p_general_observation), ''),
    COALESCE(p_items, '[]'::jsonb),
    COALESCE(p_subtotal, 0),
    COALESCE(p_service_charge, 0),
    COALESCE(p_total, 0),
    '[]'::jsonb,
    'open',
    v_waiter_id,
    NULLIF(btrim(p_waiter_name), ''),
    COALESCE(p_timestamp, now()),
    v_label,
    v_offline_key
  )
  ON CONFLICT (tenant_id, offline_id_key)
    WHERE offline_id_key IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_order;

  IF v_order.id IS NULL AND v_offline_key IS NOT NULL THEN
    SELECT *
    INTO v_order
    FROM public.restaurant_orders
    WHERE tenant_id = p_tenant_id
      AND offline_id_key = v_offline_key;
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Nao foi possivel criar a comanda' USING ERRCODE = 'P0001';
  END IF;

  SELECT id
  INTO v_table.active_order_id
  FROM public.restaurant_orders
  WHERE tenant_id = p_tenant_id
    AND mode = 'mesa'
    AND table_number = p_table_number
    AND status = 'open'
  ORDER BY created_at, id
  LIMIT 1;

  UPDATE public.restaurant_tables
  SET status = 'ocupada',
      active_order_id = v_table.active_order_id,
      reservation_reason = NULL
  WHERE tenant_id = p_tenant_id
    AND number = p_table_number;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.gastro_close_comanda_rpc(
  p_tenant_id uuid,
  p_order_id text,
  p_payments jsonb DEFAULT '[]'::jsonb,
  p_service_charge numeric DEFAULT 0,
  p_total numeric DEFAULT NULL
)
RETURNS public.restaurant_orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_order public.restaurant_orders%ROWTYPE;
  v_next_order_id text;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT app_private.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Usuario sem acesso ao tenant' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(COALESCE(p_payments, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Pagamentos devem ser um array JSON' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_order
  FROM public.restaurant_orders
  WHERE tenant_id = p_tenant_id
    AND id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status = 'closed' THEN
    RETURN v_order;
  END IF;

  IF COALESCE(p_service_charge, 0) < 0
    OR COALESCE(p_total, v_order.subtotal + COALESCE(p_service_charge, 0)) < 0 THEN
    RAISE EXCEPTION 'Valores de fechamento nao podem ser negativos'
      USING ERRCODE = '22023';
  END IF;

  IF v_order.mode = 'mesa' AND v_order.table_number IS NOT NULL THEN
    PERFORM 1
    FROM public.restaurant_tables
    WHERE tenant_id = p_tenant_id
      AND number = v_order.table_number
    FOR UPDATE;
  END IF;

  UPDATE public.restaurant_orders
  SET status = 'closed',
      payments = COALESCE(p_payments, '[]'::jsonb),
      service_charge = COALESCE(p_service_charge, 0),
      total = COALESCE(p_total, subtotal + COALESCE(p_service_charge, 0)),
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND id = p_order_id
    AND status = 'open'
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda nao pode ser fechada pelo usuario atual'
      USING ERRCODE = '42501';
  END IF;

  IF v_order.mode = 'mesa' AND v_order.table_number IS NOT NULL THEN
    SELECT id
    INTO v_next_order_id
    FROM public.restaurant_orders
    WHERE tenant_id = p_tenant_id
      AND mode = 'mesa'
      AND table_number = v_order.table_number
      AND status = 'open'
    ORDER BY created_at, id
    LIMIT 1;

    UPDATE public.restaurant_tables
    SET status = CASE WHEN v_next_order_id IS NULL THEN 'livre' ELSE 'ocupada' END,
        active_order_id = v_next_order_id,
        reservation_reason = CASE
          WHEN v_next_order_id IS NULL THEN NULL
          ELSE reservation_reason
        END
    WHERE tenant_id = p_tenant_id
      AND number = v_order.table_number;
  END IF;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.gastro_transfer_comanda_rpc(
  p_tenant_id uuid,
  p_order_id text,
  p_target_table_number integer
)
RETURNS public.restaurant_orders
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_order public.restaurant_orders%ROWTYPE;
  v_source_table_number integer;
  v_source_active_order_id text;
  v_target_table public.restaurant_tables%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT app_private.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Usuario sem acesso ao tenant' USING ERRCODE = '42501';
  END IF;

  IF p_target_table_number IS NULL OR p_target_table_number <= 0 THEN
    RAISE EXCEPTION 'Mesa de destino invalida' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_order
  FROM public.restaurant_orders
  WHERE tenant_id = p_tenant_id
    AND id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_order.mode <> 'mesa' OR v_order.status <> 'open'
    OR v_order.table_number IS NULL THEN
    RAISE EXCEPTION 'Comanda aberta de mesa nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  v_source_table_number := v_order.table_number;

  IF v_source_table_number = p_target_table_number THEN
    RETURN v_order;
  END IF;

  PERFORM 1
  FROM public.restaurant_tables
  WHERE tenant_id = p_tenant_id
    AND number IN (v_source_table_number, p_target_table_number)
  ORDER BY number
  FOR UPDATE;

  SELECT *
  INTO v_target_table
  FROM public.restaurant_tables
  WHERE tenant_id = p_tenant_id
    AND number = p_target_table_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa de destino nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_target_table.status <> 'livre'
    OR EXISTS (
      SELECT 1
      FROM public.restaurant_orders
      WHERE tenant_id = p_tenant_id
        AND mode = 'mesa'
        AND table_number = p_target_table_number
        AND status = 'open'
    ) THEN
    RAISE EXCEPTION 'Mesa de destino deve estar livre' USING ERRCODE = '55000';
  END IF;

  UPDATE public.restaurant_orders
  SET table_number = p_target_table_number,
      updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND id = p_order_id
    AND status = 'open'
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comanda nao pode ser transferida pelo usuario atual'
      USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO v_source_active_order_id
  FROM public.restaurant_orders
  WHERE tenant_id = p_tenant_id
    AND mode = 'mesa'
    AND table_number = v_source_table_number
    AND status = 'open'
  ORDER BY created_at, id
  LIMIT 1;

  UPDATE public.restaurant_tables
  SET status = CASE WHEN v_source_active_order_id IS NULL THEN 'livre' ELSE 'ocupada' END,
      active_order_id = v_source_active_order_id,
      reservation_reason = CASE
        WHEN v_source_active_order_id IS NULL THEN NULL
        ELSE reservation_reason
      END
  WHERE tenant_id = p_tenant_id
    AND number = v_source_table_number;

  UPDATE public.restaurant_tables
  SET status = 'ocupada',
      active_order_id = v_order.id,
      reservation_reason = NULL
  WHERE tenant_id = p_tenant_id
    AND number = p_target_table_number;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.gastro_release_table_rpc(
  p_tenant_id uuid,
  p_table_number integer
)
RETURNS public.restaurant_tables
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_table public.restaurant_tables%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT app_private.is_tenant_member(p_tenant_id) THEN
    RAISE EXCEPTION 'Usuario sem acesso ao tenant' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_table
  FROM public.restaurant_tables
  WHERE tenant_id = p_tenant_id
    AND number = p_table_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.restaurant_orders
    WHERE tenant_id = p_tenant_id
      AND mode = 'mesa'
      AND table_number = p_table_number
      AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Mesa possui comandas abertas' USING ERRCODE = '55000';
  END IF;

  UPDATE public.restaurant_tables
  SET status = 'livre',
      active_order_id = NULL,
      reservation_reason = NULL
  WHERE tenant_id = p_tenant_id
    AND number = p_table_number
  RETURNING * INTO v_table;

  RETURN v_table;
END;
$$;

REVOKE ALL ON FUNCTION public.gastro_create_comanda_rpc(
  uuid, integer, text, text, text, integer, integer, integer, text,
  jsonb, numeric, numeric, numeric, text, text, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gastro_create_comanda_rpc(
  uuid, integer, text, text, text, integer, integer, integer, text,
  jsonb, numeric, numeric, numeric, text, text, timestamptz
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.gastro_close_comanda_rpc(
  uuid, text, jsonb, numeric, numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gastro_close_comanda_rpc(
  uuid, text, jsonb, numeric, numeric
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.gastro_transfer_comanda_rpc(
  uuid, text, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gastro_transfer_comanda_rpc(
  uuid, text, integer
) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.gastro_release_table_rpc(
  uuid, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gastro_release_table_rpc(
  uuid, integer
) TO authenticated, service_role;
