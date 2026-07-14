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
export type UserRole = 'owner' | 'admin' | 'cashier' | 'waiter';

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
      'suporte',
      'seguranca',
      'evolucao',
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

export const commercialModuleAliases: Partial<Record<AppModule, string>> = {
  produtos: 'Cardápio',
  relatorios: 'Financeiro',
};

export const getCommercialModuleName = (module: AppModule): string => {
  return commercialModuleAliases[module] ?? module;
};

export const waiterCapabilities = [
  'mesas',
  'cardapio',
  'pre-fechamento',
] as const;

export const roleModuleMatrix: Record<UserRole, AppModule[]> = {
  owner: planMatrix.master.allowedModules,
  admin: planMatrix.master.allowedModules,
  cashier: [
    'dashboard',
    'pdv',
    'mesas',
    'caixa',
    'produtos',
    'relatorios',
    'suporte',
  ],
  waiter: [
    'mesas',
    'produtos',
  ],
};

// Funcao helper para verificar permissao do modulo baseada no plano
export const isModuleAllowed = (
  module: AppModule,
  currentPlan: PlanType = 'base',
  currentRole: UserRole = 'admin',
): boolean => {
  const config = planMatrix[currentPlan];
  const roleModules = roleModuleMatrix[currentRole] ?? roleModuleMatrix.admin;
  return config ? config.allowedModules.includes(module) && roleModules.includes(module) : false;
};
