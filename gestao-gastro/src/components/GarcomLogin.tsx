import React from 'react';
import { ChefHat, User, Lock } from 'lucide-react';

import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface GarcomLoginProps {
  onLogin: (waiterId: string, waiterName: string) => void;
}

export const GarcomLogin: React.FC<GarcomLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe e-mail e senha.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured) {
      if (!navigator.onLine) {
        setError('Conecte-se à internet para autenticar.');
        setLoading(false);
        return;
      }
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) throw signInError;

        if (data.user) {
          // Name could be fetched from metadata or we can fallback to email prefix
          const name = data.user.user_metadata?.name || email.split('@')[0];
          onLogin(data.user.id, name);
        }
      } catch (err: any) {
        setError(err.message || 'Erro de autenticação.');
        setLoading(false);
      }
    } else {
      // Offline / fallback mode (apenas se Supabase NÃO estiver configurado)
      if (password.length < 3) {
        setError('Senha deve ter ao menos 3 caracteres (offline).');
        setLoading(false);
        return;
      }
      onLogin(`${password}_${Date.now()}`, email.split('@')[0]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-700 mx-auto flex items-center justify-center mb-4">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">Comanda Gastro</h1>
          <p className="text-xs text-gray-500 mt-1">Área do Garçom</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="garcom-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="E-mail de acesso"
              autoComplete="email"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="garcom-password"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Senha"
              autoComplete="current-password"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-slate-700 text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
