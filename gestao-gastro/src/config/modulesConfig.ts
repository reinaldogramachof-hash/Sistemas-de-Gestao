export type AppModule = 
  | 'dashboard'
  | 'pdv'
  | 'mesas'
  | 'cozinha'
  | 'estoque'
  | 'caixa'
  | 'relatorios'
  | 'manual'
  | 'clientes'
  | 'colaboradores'
  | 'fornecedores'
  | 'produtos'
  | 'suporte'
  | 'configuracoes'
  | 'seguranca'
  | 'evolucao';

export type PlanType = 'base' | 'premium' | 'master';

export interface PlanConfig {
  plan: PlanType;
  allowedModules: AppModule[];
}

export const planMatrix: Record<PlanType, PlanConfig> = {
  base: {
    plan: 'base',
    allowedModules: [
      // TODO: Reinaldo definira a lista real.
      // Atualmente todos liberados para nao quebrar compatibilidade
      'dashboard', 'pdv', 'mesas', 'cozinha', 'caixa',
      'produtos', 'estoque', 'clientes', 'relatorios',
      'configuracoes', 'suporte', 'manual'
    ]
  },
  premium: {
    plan: 'premium',
    allowedModules: [
      'dashboard', 'pdv', 'mesas', 'cozinha', 'estoque', 'caixa', 
      'relatorios', 'manual', 'clientes', 'colaboradores', 
      'fornecedores', 'produtos', 'suporte', 'configuracoes', 
      'seguranca', 'evolucao'
    ]
  },
  master: {
    plan: 'master',
    allowedModules: [
      'dashboard', 'pdv', 'mesas', 'cozinha', 'estoque', 'caixa', 
      'relatorios', 'manual', 'clientes', 'colaboradores', 
      'fornecedores', 'produtos', 'suporte', 'configuracoes', 
      'seguranca', 'evolucao'
    ]
  }
};

// Funcao helper para verificar permissao do modulo baseada no plano
export const isModuleAllowed = (module: AppModule, currentPlan: PlanType = 'base'): boolean => {
  const config = planMatrix[currentPlan];
  return config ? config.allowedModules.includes(module) : false;
};
