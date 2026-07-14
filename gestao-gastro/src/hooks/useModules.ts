import { useEffect, useState } from 'react';
import { AppModule, PlanType, UserRole, isModuleAllowed } from '../config/modulesConfig';

const USER_ROLE_KEY = 'gestao_gastro_user_role';

export const useModules = () => {
  const [currentPlan, setCurrentPlan] = useState<PlanType>('base');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  useEffect(() => {
    const storedPlan = localStorage.getItem('gestao_gastro_verified_plan') as PlanType;
    const validPlans: PlanType[] = ['base', 'premium', 'master'];
    const storedRole = localStorage.getItem(USER_ROLE_KEY) as UserRole;
    const validRoles: UserRole[] = ['owner', 'admin', 'cashier', 'waiter'];

    if (storedPlan && validPlans.includes(storedPlan)) {
      setCurrentPlan(storedPlan);
    } else {
      setCurrentPlan('base');
    }

    setCurrentRole(storedRole && validRoles.includes(storedRole) ? storedRole : 'admin');
  }, []);

  const checkAccess = (module: AppModule): boolean => {
    return isModuleAllowed(module, currentPlan, currentRole);
  };

  return {
    currentPlan,
    currentRole,
    checkAccess,
  };
};
