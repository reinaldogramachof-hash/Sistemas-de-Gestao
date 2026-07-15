import { supabase } from '../lib/supabase';
import type { Product } from '../types';

interface MenuProductRow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number | null;
  image: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface MenuCategoryRow {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  created_at?: string;
}

const throwIfError = (message: string, error: { message: string } | null) => {
  if (error) throw new Error(`${message}: ${error.message}`);
};

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const requireAuthenticatedSession = async () => {
  if (!supabase) throw new Error('Supabase não configurado');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Sessão remota não disponível para sincronização');
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

  // Busca produtos ativos (para o garçom, apenas produtos ativos)
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
    price: row.price_cents / 100,
    category: row.category_id ? (categoryMap.get(row.category_id) ?? 'Sem Categoria') : 'Sem Categoria',
    image: row.image ?? undefined,
    active: row.active,
  }));
}

/**
 * Busca ou cria uma categoria pelo nome no Supabase para o tenant.
 * Retorna o UUID da categoria.
 */
export async function upsertCategory(tenantId: string, name: string): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado');
  if (!tenantId) throw new Error('Tenant ID é obrigatório para sincronizar categorias');
  await requireAuthenticatedSession();

  const catName = name.trim();
  if (!catName) throw new Error('Nome da categoria inválido');

  // 1. Busca categoria existente
  const { data: existing, error: selectError } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', catName)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id;

  // 2. Cria nova categoria
  const { data: inserted, error: insertError } = await supabase
    .from('menu_categories')
    .insert({
      tenant_id: tenantId,
      name: catName,
      sort_order: 10
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  if (!inserted) throw new Error('Falha ao inserir categoria no Supabase');

  return inserted.id;
}

/**
 * Sincroniza um produto individual com a tabela menu_products no Supabase.
 * Converte reais em price_cents.
 */
export async function syncProduct(
  tenantId: string,
  product: Product,
  remoteProductId?: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado');
  if (!tenantId) throw new Error('Tenant ID é obrigatório para sincronizar produtos');
  await requireAuthenticatedSession();

  let categoryId: string | null = null;
  if (product.category) {
    categoryId = await upsertCategory(tenantId, product.category);
  }

  const priceCents = Math.round(product.price * 100);

  const payload = {
    tenant_id: tenantId,
    category_id: categoryId,
    name: product.name,
    description: product.description || '',
    price_cents: priceCents,
    image: product.image || null,
    active: product.active !== false,
    updated_at: new Date().toISOString()
  };

  const resolvedRemoteId = remoteProductId || (isUuid(product.id) ? product.id : null);

  if (resolvedRemoteId) {
    const { data, error } = await supabase
      .from('menu_products')
      .upsert({ ...payload, id: resolvedRemoteId }, { onConflict: 'id' })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  const { data: existing, error: findError } = await supabase
    .from('menu_products')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', product.name)
    .eq('category_id', categoryId)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { data, error } = await supabase
      .from('menu_products')
      .update(payload)
      .eq('id', existing.id)
      .eq('tenant_id', tenantId)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase
    .from('menu_products')
    .insert(payload)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Inativa um produto no cardápio remoto sem apagar seu histórico.
 */
export async function deleteProductRemotely(tenantId: string, productId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  if (!tenantId) throw new Error('Tenant ID é obrigatório para excluir produtos');
  await requireAuthenticatedSession();

  const { error } = await supabase
    .from('menu_products')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('tenant_id', tenantId);

  if (error) throw error;
}
