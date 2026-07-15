import React from 'react';
import { ChefHat, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CANTINHO_DA_RESENHA_SLUG, getClientRouteFromPath } from '../config/clientRoutes';

interface GarcomLoginProps {
  onLogin: (waiterId: string, waiterName: string) => void;
}

export const GarcomLogin: React.FC<GarcomLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const clientRoute = getClientRouteFromPath(window.location.pathname);
  const establishmentName = clientRoute?.slug === CANTINHO_DA_RESENHA_SLUG
    ? 'Cantinho da Resenha'
    : 'Gestão Gastro';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Informe seu e-mail e senha para continuar.');
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
          const name = data.user.user_metadata?.display_name || data.user.user_metadata?.name || email.split('@')[0];
          onLogin(data.user.id, name);
        }
      } catch (err: any) {
        setError(err.message || 'Não foi possível autenticar este acesso.');
        setLoading(false);
      }
      return;
    }

    if (password.length < 3) {
      setError('A senha deve ter ao menos 3 caracteres no modo local.');
      setLoading(false);
      return;
    }

    onLogin(`${password}_${Date.now()}`, email.split('@')[0]);
  };

  return (
    <main className="min-h-screen bg-[#101827] px-4 py-8 text-white sm:flex sm:items-center sm:justify-center">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center sm:min-h-[calc(100vh-4rem)]">
        <header className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#526784]/45 bg-[#2c3d57] shadow-lg shadow-black/20">
            <ChefHat className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#a9bad2]">Gestão Gastro</p>
          <h1 className="text-3xl font-black tracking-normal text-white">Comanda do Garçom</h1>
          <p className="mt-2 text-sm font-medium text-[#b6c4d8]">{establishmentName}</p>
        </header>

        <div className="rounded-xl border border-white/10 bg-[#1a2436] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#425a7b]">
              <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Acesso da equipe</h2>
              <p className="mt-1 text-xs leading-5 text-[#b6c4d8]">Entre com as credenciais criadas pela administradora.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="garcom-email" className="block text-xs font-bold text-[#dfe8f6]">E-mail de acesso</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a9bad2]" aria-hidden="true" />
                <input
                  id="garcom-email"
                  type="email"
                  value={email}
                  onChange={event => { setEmail(event.target.value); setError(''); }}
                  placeholder="nome@empresa.com"
                  autoComplete="email"
                  inputMode="email"
                  className="h-12 w-full rounded-lg border border-[#41516a] bg-[#111a2a] py-3 pl-11 pr-4 text-sm font-medium text-white outline-none placeholder:text-[#74839a] transition-colors focus:border-[#8098bb] focus:ring-2 focus:ring-[#8098bb]/25"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="garcom-password" className="block text-xs font-bold text-[#dfe8f6]">Senha</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a9bad2]" aria-hidden="true" />
                <input
                  id="garcom-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => { setPassword(event.target.value); setError(''); }}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-lg border border-[#41516a] bg-[#111a2a] py-3 pl-11 pr-12 text-sm font-medium text-white outline-none placeholder:text-[#74839a] transition-colors focus:border-[#8098bb] focus:ring-2 focus:ring-[#8098bb]/25"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#a9bad2] transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#8098bb]/50"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-3 text-center text-xs font-semibold leading-5 text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#5b7191] text-sm font-bold text-white transition-colors hover:bg-[#6b84a7] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {loading ? 'Verificando acesso...' : 'Entrar na comanda'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs font-medium leading-5 text-[#8fa0b8]">
          Dúvidas sobre seu acesso? Procure a administradora do estabelecimento.
        </p>
      </section>
    </main>
  );
};
