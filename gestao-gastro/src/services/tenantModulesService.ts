import { supabase } from '../lib/supabase';
import type { AppModule } from '../config/modulesConfig';

const moduleAliases: Record<string, AppModule> = {
  cardapio: 'produtos',
  configuracao: 'configuracoes',
  financeiro: 'relatorios',
  mesas_garcom_mobile: 'mesas',
  kds: 'cozinha',
  relatorios_avancados: 'relatorios',
};

const appModules = new Set<AppModule>([
  'dashboard', 'pdv', 'mesas', 'cozinha', 'estoque', 'caixa', 'relatorios',
  'manual', 'clientes', 'colaboradores', 'fornecedores', 'produtos', 'suporte',
  'configuracoes', 'seguranca', 'evolucao',
]);

export const normalizeTenantModule = (moduleKey: string): AppModule | null => {
  const normalized = moduleAliases[moduleKey] ?? moduleKey;
  return appModules.has(normalized as AppModule) ? normalized as AppModule : null;
};

export async function listEnabledTenantModules(tenantId: string): Promise<AppModule[]> {
  if (!supabase || !tenantId) return [];
  const { data, error } = await supabase
    .from('tenant_modules')
    .select('module_key, enabled')
    .eq('tenant_id', tenantId)
    .eq('enabled', true);
  if (error) throw error;
  return [...new Set((data ?? []).map(row => normalizeTenantModule(row.module_key)).filter((module): module is AppModule => Boolean(module)))];
}
