import React from 'react';
import { ChefHat, User, Lock } from 'lucide-react';

interface GarcomLoginProps {
  onLogin: (name: string, pin: string) => void;
}

export const GarcomLogin: React.FC<GarcomLoginProps> = ({ onLogin }) => {
  const [name, setName] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (pin.length < 3) {
      setError('PIN deve ter ao menos 3 dígitos.');
      return;
    }
    onLogin(name.trim(), pin);
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
              id="garcom-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Seu nome"
              autoComplete="name"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="garcom-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="PIN (ex: 1234)"
              autoComplete="current-password"
              maxLength={6}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none tracking-[0.3em]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-slate-700 text-white font-semibold text-sm active:scale-[0.98] transition-all"
          >
            Entrar
          </button>
        </form>

        <div className="mt-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-1">
            ⚠️ Atenção: Acesso Simplificado (MVP)
          </p>
          <p className="text-[10px] text-red-500/80 leading-relaxed">
            Esta versão utiliza identificação visual sem validação real via Supabase Auth.
            <b> Não está pronta para produção pública.</b> As políticas RLS do Supabase irão bloquear envios online, a menos que configuradas para modo anônimo (inseguro).
          </p>
        </div>
      </div>
    </div>
  );
};
