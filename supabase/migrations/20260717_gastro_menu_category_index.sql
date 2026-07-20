-- Evita varredura do catálogo ao relacionar produtos com categorias por tenant.
CREATE INDEX IF NOT EXISTS menu_products_category_id_idx
  ON public.menu_products (category_id);
