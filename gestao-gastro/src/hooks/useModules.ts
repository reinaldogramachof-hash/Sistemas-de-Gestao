import { useState, useEffect } from 'react';
import { AppModule, PlanType, isModuleAllowed } from '../config/modulesConfig';

export const useModules = () => {
  // Simulando plano atual. Poderá vir do localStorage ou da API de licença.
  const [currentPlan, setCurrentPlan] = useState<PlanType>('base');

  useEffect(() => {
    // No futuro, isso pode ser integrado ao licenciamento e localStorage
    // const storedPlan = localStorage.getItem('gestao_gastro_plan') as PlanType;
    // se existir e for válido, setar: setCurrentPlan(storedPlan);
  }, []);

  const checkAccess = (module: AppModule): boolean => {
    return isModuleAllowed(module, currentPlan);
  };

  return {
    currentPlan,
    checkAccess
  };
};
