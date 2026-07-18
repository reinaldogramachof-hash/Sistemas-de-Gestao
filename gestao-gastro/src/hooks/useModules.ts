import { useEffect, useState } from 'react';
import { AppModule, PlanType, UserRole, isModuleAllowed } from '../config/modulesConfig';
import { useApp } from '../store/AppContext';

export const useModules = () => {
  const { currentUser } = useApp();
  const [currentPlan, setCurrentPlan] = useState<PlanType>('base');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  useEffect(() => {
    const storedPlan = localStorage.getItem('gestao_gastro_verified_plan') as PlanType;
    const validPlans: PlanType[] = ['base', 'premium', 'master'];
    const activeRole = currentUser.role as UserRole;
    const validRoles: UserRole[] = ['owner', 'admin', 'cashier', 'waiter'];

    if (storedPlan && validPlans.includes(storedPlan)) {
      setCurrentPlan(storedPlan);
    } else {
      setCurrentPlan('base');
    }

    setCurrentRole(activeRole && validRoles.includes(activeRole) ? activeRole : 'admin');
  }, [currentUser.role]);

  const checkAccess = (module: AppModule): boolean => {
    return isModuleAllowed(module, currentPlan, currentRole);
  };

  return {
    currentPlan,
    currentRole,
    checkAccess,
  };
};
