import { useState } from 'react';

export type View =
  | 'dashboard'
  | 'pdv'
  | 'mesas'
  | 'estoque'
  | 'caixa'
  | 'relatorios'
  | 'configuracoes'
  | 'manual'
  | 'clientes'
  | 'colaboradores'
  | 'fornecedores'
  | 'produtos'
  | 'cozinha'
  | 'seguranca'
  | 'suporte'
  | 'evolucao';

export function useNavigation() {
  const [currentView, setCurrentView] = useState<View>(() => {
    const role = localStorage.getItem('gestao_gastro_user_role') || sessionStorage.getItem('gestao_gastro_user_role');
    if (role === 'cashier') return 'pdv';
    if (role === 'waiter') return 'mesas';
    return 'dashboard';
  });
  return { currentView, setCurrentView };
}
