import React, { useState } from 'react';
import { GarcomLogin } from './GarcomLogin';
import { ComandaMobile } from './ComandaMobile';
import type { Product } from '../types';
import { mockProducts } from '../store/mock';
import { listActiveProducts } from '../services/menuSupabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getClientRouteFromPath, resolveTenant } from '../config/clientRoutes';
import { validateLanOrigin } from '../utils/comandaAccess';

const SESSION_KEY = 'garcom_session';
const USER_ROLE_KEY = 'gestao_gastro_user_role';

interface WaiterSession {
  waiterId: string;
  waiterName: string;
}

interface MemberAccessResponse {
  status: 'success' | 'error';
  message?: string;
  member?: {
    role?: string;
    active?: boolean;
    display_name?: string;
  };
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
  sessionStorage.removeItem(USER_ROLE_KEY);
};

/**
 * ComandaMobileApp - wrapper isolado para a rota /comanda.
 *
 * Não usa o Layout administrativo (sem sidebar, header, etc.).
 * Gerencia autenticação do garçom via Supabase Auth/sessionStorage.
 * Os produtos são carregados do Supabase, com fallback local apenas quando
 * o projeto não está configurado para operação online.
 */
export const ComandaMobileApp: React.FC = () => {
  const [session, setSession] = useState<WaiterSession | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAccessError, setLastAccessError] = useState('');

  React.useEffect(() => {
    const route = getClientRouteFromPath(window.location.pathname);
    const accessModeFromUrl = new URLSearchParams(window.location.search).get('access');
    const accessMode = accessModeFromUrl === 'external' ? 'external' : 'local';
    const manifestHref = route
      ? `/api_comanda_manifest.php?slug=${encodeURIComponent(route.slug)}&access=${accessMode}&name=${encodeURIComponent(route.displayName)}`
      : '/gestao-gastro/manifest.webmanifest';

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    manifestLink.href = manifestHref;
    document.title = route ? `Comanda Gastro | ${route.displayName}` : 'Comanda Gastro';

    return () => {
      manifestLink.href = '/gestao-gastro/manifest.webmanifest';
      document.title = 'Gestao Gastro | Sistema Premium';
    };
  }, []);

  React.useEffect(() => {
    const initAuth = async () => {
      setAuthChecking(true);
      const tenant = resolveTenant(window.location.pathname);
      setResolvedTenantId(tenant);

      if (tenant) {
        try {
          const tenantKey = `gestao_gastro:${tenant}:settings`;
          const savedSettings = localStorage.getItem(tenantKey);
          const accessModeFromUrl = new URLSearchParams(window.location.search).get('access');
          let accessMode = accessModeFromUrl === 'external' || accessModeFromUrl === 'local'
            ? accessModeFromUrl
            : 'local';
          if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            accessMode = accessModeFromUrl === 'external' || accessModeFromUrl === 'local'
              ? accessMode
              : parsedSettings.waiterAccessMode || 'local';
          }
          const isLocalOrigin = window.location.origin.includes('localhost') ||
                                window.location.origin.includes('127.0.0.1') ||
                                validateLanOrigin(window.location.origin).valid;

          if (accessMode === 'local' && !isLocalOrigin) {
            setError('A comanda do garçom está liberada apenas na rede Wi-Fi do restaurante.');
            setAuthChecking(false);
            return;
          }
        } catch {
          // ignore parsing error
        }
      }

      if (isSupabaseConfigured) {
        if (!tenant) {
          setError('Restaurante não configurado ou rota inválida.');
          setAuthChecking(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          try {
            await verifyAccessAndSetSession(data.session.user.id, data.session.user.email || '', tenant);
          } catch (err) {
            clearSession();
            setSession(null);
            setError(err instanceof Error ? err.message : 'Acesso negado na comanda.');
          }
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
        setError('Restaurante não configurado ou rota inválida.');
        setLoading(false);
        return;
      }

      try {
        const remoteProducts = await listActiveProducts(tenant);
        setProducts(remoteProducts);
      } catch {
        setError('Erro ao carregar cardápio online. Verifique a conexão.');
      }
    } else {
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
        // Fallback below.
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

  const verifyAccessAndSetSession = async (
    userId: string,
    emailOrName: string,
    overrideTenant?: string,
  ): Promise<boolean> => {
    let verifiedDisplayName = '';
    setLastAccessError('');

    if (isSupabaseConfigured) {
      const tenant = overrideTenant || resolvedTenantId || resolveTenant(window.location.pathname);
      if (!tenant) {
        const message = 'Restaurante não configurado ou rota inválida.';
        setError(message);
        throw new Error(message);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        const message = 'Sessao expirada. Entre novamente na comanda.';
        setError(message);
        await supabase.auth.signOut();
        throw new Error(message);
      }

      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'validate_member_access',
          tenant_id: tenant,
          required_role: 'waiter',
        }),
      });
      const data: MemberAccessResponse = await response.json().catch(() => ({
        status: 'error',
        message: 'Resposta invalida da API de usuarios. Verifique se o api_admin_users.php foi atualizado no servidor.',
      }));
      const member = data.member;

      if (!response.ok || data.status !== 'success' || !member?.active) {
        const message = data.message || 'Usuario nao esta ativo neste restaurante.';
        setLastAccessError(message);
        setError(message);
        await supabase.auth.signOut();
        throw new Error(message);
      }

      if (member.role !== 'waiter') {
        const message = 'Esta area e exclusiva para garcons.';
        setLastAccessError(message);
        setError(message);
        await supabase.auth.signOut();
        throw new Error(message);
      }

      sessionStorage.setItem(USER_ROLE_KEY, member.role);
      verifiedDisplayName = member.display_name || '';
    } else {
      sessionStorage.setItem(USER_ROLE_KEY, 'waiter');
    }

    const fallbackName = emailOrName.includes('@') ? emailOrName.split('@')[0] : emailOrName;
    const newSession: WaiterSession = {
      waiterId: userId,
      waiterName: verifiedDisplayName || fallbackName,
    };

    saveSession(newSession);
    setSession(newSession);
    setError(null);
    return true;
  };

  const handleLogin = async (waiterId: string, waiterName: string) => {
    const authorized = await verifyAccessAndSetSession(waiterId, waiterName);
    if (!authorized) {
      throw new Error(lastAccessError || 'Acesso negado. Verifique se seu usuario e garcom ativo deste restaurante.');
    }
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
          <p className="text-red-500 font-semibold mb-2">Erro operacional</p>
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
    <>
      <div className="hidden lg:flex items-center justify-center p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm font-medium border-b border-amber-200 dark:border-amber-700/30">
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Otimizado para celulares: para a melhor experiência do garçom, recomendamos acessar esta tela por um dispositivo móvel.
        </span>
      </div>
      <ComandaMobile
        waiterSession={session}
        products={products}
        tenantId={resolvedTenantId || ''}
        onLogout={handleLogout}
      />
    </>
  );
};
