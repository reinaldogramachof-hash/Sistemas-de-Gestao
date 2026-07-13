import { useState, useEffect } from 'react';
import { AppModule, PlanType, isModuleAllowed } from '../config/modulesConfig';

export const useModules = () => {
  // Simulando plano atual. Podera vir do localStorage ou da API de licenca.
  const [currentPlan, setCurrentPlan] = useState<PlanType>('base');

  useEffect(() => {
    // A fonte confiável para definição do plano é a resposta validada da API de licença
    // gravada sob a chave 'gestao_gastro_verified_plan'. Fallback inicial é sempre 'base'.
    const storedPlan = localStorage.getItem('gestao_gastro_verified_plan') as PlanType;
    const validPlans: PlanType[] = ['base', 'premium', 'master'];

    if (storedPlan && validPlans.includes(storedPlan)) {
      setCurrentPlan(storedPlan);
    } else {
      setCurrentPlan('base');
    }
  }, []);

  const checkAccess = (module: AppModule): boolean => {
    return isModuleAllowed(module, currentPlan);
  };

  return {
    currentPlan,
    checkAccess
  };
};
