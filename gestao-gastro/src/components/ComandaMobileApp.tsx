import React, { useState } from 'react';
import { GarcomLogin } from './GarcomLogin';
import { ComandaMobile } from './ComandaMobile';
import type { Product } from '../types';
import { mockProducts } from '../store/mock';
import { listActiveProducts } from '../services/menuSupabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resolveTenant } from '../config/clientRoutes';

const SESSION_KEY = 'garcom_session';
const USER_ROLE_KEY = 'gestao_gastro_user_role';

interface WaiterSession {
  waiterId: string;
  waiterName: string;
}

const loadSession = (): WaiterSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveSession = (session: WaiterSession) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
};

/**
 * ComandaMobileApp — wrapper isolado para a rota /comanda.
 *
 * Não usa o Layout administrativo (sem sidebar, header, etc.).
 * Gerencia autenticação simplificada do garçom via sessionStorage.
 * Os produtos são carregados do localStorage (com fallback para mock)
 * para não depender do estado global do admin.
 */
export const ComandaMobileApp: React.FC = () => {
  const [session, setSession] = useState<WaiterSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const initAuth = async () => {
      setAuthChecking(true);
      const tenant = resolveTenant(window.location.pathname);
      setResolvedTenantId(tenant);

      if (isSupabaseConfigured) {
        if (!tenant) {
          setError('Tenant não configurado ou rota inválida.');
          setAuthChecking(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await verifyAccessAndSetSession(data.session.user.id, data.session.user.email || '', tenant);
        } else {
          clearSession();
          setSession(null);
        }
      } else {
        setSession(loadSession());
      }
      setAuthChecking(false);
    };
    void initAuth();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    if (isSupabaseConfigured) {
      const tenant = resolvedTenantId || resolveTenant(window.location.pathname);
      if (!tenant) {
        setError('Tenant não configurado ou rota inválida.');
        setLoading(false);
        return;
      }
      try {
        const remoteProducts = await listActiveProducts(tenant);
        setProducts(remoteProducts);
      } catch (err) {
        setError('Erro ao carregar cardápio online. Verifique a conexão.');
      }
    } else {
      // Fallback
      try {
        const raw = localStorage.getItem('products');
        if (raw) {
          const parsed: Product[] = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProducts(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore
      }
      setProducts(mockProducts);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    if (session) {
      void loadProducts();
    }
  }, [session, resolvedTenantId]);

  const verifyAccessAndSetSession = async (userId: string, email: string, overrideTenant?: string) => {
    if (isSupabaseConfigured) {
      const tenant = overrideTenant || resolvedTenantId || resolveTenant(window.location.pathname);
      if (!tenant) {
        setError('Tenant não configurado ou rota inválida.');
        return;
      }
      const { data: member, error: memberError } = await supabase
        .from('tenant_members')
        .select('role, active')
        .eq('tenant_id', tenant)
        .eq('user_id', userId)
        .single();

      if (memberError || !member || !member.active) {
        setError('Acesso negado. Usuário não é membro ativo deste restaurante.');
        await supabase.auth.signOut();
        return;
      }

      const validRoles = ['waiter', 'cashier', 'admin', 'owner'];
      if (!validRoles.includes(member.role)) {
        setError('Acesso negado. Perfil incompatível com o PDV Mobile.');
        await supabase.auth.signOut();
        return;
      }

      localStorage.setItem(USER_ROLE_KEY, member.role);
    } else {
      localStorage.setItem(USER_ROLE_KEY, 'waiter');
    }

    const name = email.split('@')[0];
    const newSession: WaiterSession = {
      waiterId: userId,
      waiterName: name,
    };
    saveSession(newSession);
    setSession(newSession);
  };

  const handleLogin = (waiterId: string, waiterName: string) => {
    // Se isSupabaseConfigured for true, já foi validado no GarcomLogin a senha.
    // Mas devemos validar o tenant_members
    void verifyAccessAndSetSession(waiterId, waiterName);
  };

  const handleLogout = async () => {
    clearSession();
    setSession(null);
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <p className="text-sm text-gray-500">Verificando sessão...</p>
      </div>
    );
  }

  if (!session) {
    return <GarcomLogin onLogin={handleLogin} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-500/20 text-center max-w-sm">
          <p className="text-red-500 font-semibold mb-2">Erro Operacional</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <p className="text-sm text-gray-500">Carregando cardápio...</p>
      </div>
    );
  }

  return (
    <ComandaMobile
      waiterSession={session}
      products={products}
      tenantId={resolvedTenantId || ''}
      onLogout={handleLogout}
    />
  );
};
