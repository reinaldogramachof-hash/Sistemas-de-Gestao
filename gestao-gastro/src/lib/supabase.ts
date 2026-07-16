import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// O cliente Supabase só é criado se as env vars estiverem presentes.
// Quando ausentes (ambiente de dev sem .env.local), o app opera em modo
// Local-First completo usando somente localStorage.
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'SUBSTITUA_PELA_CHAVE_ANON_DO_SUPABASE';

const isComandaRoute = typeof window !== 'undefined' && window.location.pathname.includes('/comanda');
const authStorageKey = isComandaRoute
  ? 'gestao-gastro-comanda-auth'
  : 'gestao-gastro-admin-auth';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: authStorageKey,
      },
    })
  : null;
