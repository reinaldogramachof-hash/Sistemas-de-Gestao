import React, { useState } from 'react';
import { GarcomLogin } from './GarcomLogin';
import { ComandaMobile } from './ComandaMobile';
import type { Product } from '../types';
import { mockProducts } from '../store/mock';
import { listActiveProducts } from '../services/menuSupabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

const SESSION_KEY = 'garcom_session';

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
  const [session, setSession] = useState<WaiterSession | null>(loadSession);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      if (isSupabaseConfigured) {
        const tenant = import.meta.env.VITE_GASTRO_TENANT_ID as string;
        if (!tenant) {
          setError('VITE_GASTRO_TENANT_ID não configurado. Modo online requer Tenant ID.');
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
    void loadProducts();
  }, []);

  const handleLogin = (name: string, pin: string) => {
    const newSession: WaiterSession = {
      waiterId: `${pin}_${Date.now()}`,
      waiterName: name,
    };
    saveSession(newSession);
    setSession(newSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

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
      onLogout={handleLogout}
    />
  );
};
