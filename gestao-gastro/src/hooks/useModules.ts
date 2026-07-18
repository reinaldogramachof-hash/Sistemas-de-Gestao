import { useEffect, useState } from 'react';
import { AppModule, PlanType, UserRole, isModuleAllowed } from '../config/modulesConfig';
import { useApp } from '../store/AppContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { listEnabledTenantModules } from '../services/tenantModulesService';

export const useModules = () => {
  const { currentEmpresa, currentUser, supabaseOnline } = useApp();
  const [currentPlan, setCurrentPlan] = useState<PlanType>('base');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [tenantModules, setTenantModules] = useState<AppModule[] | null>(null);

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!isSupabaseConfigured || !supabaseOnline || !currentEmpresa.tenantId) {
        if (active) setTenantModules(null);
        return;
      }
      try {
        const modules = await listEnabledTenantModules(currentEmpresa.tenantId);
        if (active) setTenantModules(modules);
      } catch (error) {
        console.error('Falha ao carregar módulos do tenant:', error);
        if (active) setTenantModules([]);
      }
    };
    void load();
    return () => { active = false; };
  }, [currentEmpresa.tenantId, supabaseOnline]);

  const checkAccess = (module: AppModule): boolean => {
    const requiresTenantContract = isSupabaseConfigured && supabaseOnline && Boolean(currentEmpresa.tenantId);
    const allowedByTenant = requiresTenantContract ? tenantModules?.includes(module) === true : true;
    return isModuleAllowed(module, currentPlan, currentRole) && allowedByTenant;
  };

  return {
    currentPlan,
    currentRole,
    tenantModules,
    checkAccess,
  };
};
