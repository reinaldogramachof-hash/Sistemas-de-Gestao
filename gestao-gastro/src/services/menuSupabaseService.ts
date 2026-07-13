import { supabase } from '../lib/supabase';
import type { Product } from '../types';

interface MenuProductRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface MenuCategoryRow {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

const throwIfError = (message: string, error: { message: string } | null) => {
  if (error) throw new Error(`${message}: ${error.message}`);
};

export async function listActiveProducts(tenantId: string): Promise<Product[]> {
  if (!supabase) return [];

  // Primeiro busca categorias para mapear o nome
  const { data: categoriesData, error: catError } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .returns<MenuCategoryRow[]>();

  throwIfError('Erro ao listar categorias', catError);
  
  const categoryMap = new Map<string, string>();
  if (categoriesData) {
    for (const cat of categoriesData) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  // Busca produtos ativos
  const { data: productsData, error: prodError } = await supabase
    .from('menu_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .returns<MenuProductRow[]>();

  throwIfError('Erro ao listar produtos', prodError);

  if (!productsData) return [];

  return productsData.map((row) => ({
    id: row.id,
    empresaId: row.tenant_id,
    name: row.name,
    description: row.description ?? '',
    price: row.price,
    category: row.category_id ? (categoryMap.get(row.category_id) ?? 'Sem Categoria') : 'Sem Categoria',
    image: row.image ?? undefined,
    active: row.active,
  }));
}
