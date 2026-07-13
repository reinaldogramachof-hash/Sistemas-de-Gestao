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
      'pdv',
      'mesas',
      'caixa',
      'dashboard',
      'produtos',
      'relatorios',
      'estoque',
      'manual',
      'configuracoes',
      'suporte'
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
