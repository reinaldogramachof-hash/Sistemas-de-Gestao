import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useApp } from '../store/AppContext';
import { Mail, Lock, User, Loader2, ShieldCheck, AlertCircle, Store, RefreshCw } from 'lucide-react';
import { resolveTenant } from '../config/clientRoutes';

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({ children }) => {
  const { currentEmpresa, currentUser, theme, setCurrentUser } = useApp();
  const isDark = theme === 'dark';

  const tenantId = resolveTenant(window.location.pathname) || import.meta.env.VITE_GASTRO_TENANT_ID;

  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [isAdminMember, setIsAdminMember] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerStatusError, setOwnerStatusError] = useState('');

  // Estados de formulário
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // 1. Verifica se já existe owner no tenant (consulta anônima ao PHP)
  const checkOwnerStatus = async () => {
    if (!isSupabaseConfigured || !tenantId) {
      setHasOwner(true); // Se não há Supabase, prossegue e considera local-first
      setOwnerStatusError('');
      return;
    }

    try {
      setOwnerStatusError('');
      // Faz fetch na API PHP do root para saber se o tenant tem proprietário cadastrado
      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_owner_status',
          tenant_id: tenantId,
          license_key: localStorage.getItem('plena_license') || '',
          email: localStorage.getItem('ml_license_email') || ''
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Falha ao comunicar com o servidor.');
      }
      if (data.status === 'success') {
        setHasOwner(data.has_owner);
        if (!data.has_owner || data.setup_required) {
          setAuthMode('register');
          if (data.owner_name) {
            setName(data.owner_name);
          }
        }
      } else {
        throw new Error('Resposta inválida ao consultar o primeiro acesso.');
      }
    } catch (err) {
      setHasOwner(null);
      setOwnerStatusError(err instanceof Error ? err.message : 'Não foi possível confirmar o primeiro acesso. Verifique sua conexão e tente novamente.');
    }
  };

  // 2. Valida se o usuário logado pertence à equipe administrativa
  const checkAdminMembership = async (userId: string) => {
    if (!isSupabaseConfigured || !supabase || !tenantId) {
      setIsAdminMember(true);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        throw new Error('Sessão inválida.');
      }

      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'validate_member_access',
          tenant_id: tenantId,
          required_role: 'team'
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.status !== 'success' || !data.member) {
        setIsAdminMember(false);
        setError(data?.message || 'Acesso negado: esta conta não possui permissão ativa neste restaurante.');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      const member = data.member;
      const roleMap: Record<string, string> = {
        owner: 'Proprietário',
        admin: 'Administrador',
        cashier: 'Caixa',
        waiter: 'Garçom'
      };
      const friendlyRole = roleMap[member.role] || 'Colaborador';
      const userName = member.display_name || friendlyRole;

      sessionStorage.setItem('gestao_gastro_user_role', member.role);
      sessionStorage.setItem('gestao_gastro_user_name', userName);

      setCurrentUser({
        id: member.user_id,
        name: userName,
        role: member.role
      });
      setIsAdminMember(true);
    } catch (err) {
      setIsAdminMember(false);
      setError('Erro ao validar sua permissão de acesso.');
    }
  };

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        // Verifica se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        if (!isActive) return;

        if (session && session.user) {
          setSessionUser(session.user);
          setHasOwner(true);
          await checkAdminMembership(session.user.id);
        } else {
          setSessionUser(null);
          setIsAdminMember(false);
          await checkOwnerStatus();
        }

        // Subscreve a mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session && session.user) {
            setSessionUser(session.user);
            await checkAdminMembership(session.user.id);
          } else {
            setSessionUser(null);
            setIsAdminMember(false);
            localStorage.removeItem('gestao_gastro_user_role');
            localStorage.removeItem('gestao_gastro_user_name');
            sessionStorage.removeItem('gestao_gastro_user_role');
            sessionStorage.removeItem('gestao_gastro_user_name');
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      } else {
        setIsAdminMember(true);
        await checkOwnerStatus();
      }
    };

    void initializeAuth().finally(() => {
      if (isActive) setLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [tenantId]);

  const retryOwnerStatus = async () => {
    setLoading(true);
    await checkOwnerStatus();
    setLoading(false);
  };

  // Login da administradora
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;

    setError('');
    setFormLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        setSessionUser(data.user);
        await checkAdminMembership(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setFormLoading(false);
    }
  };

  // Cadastro do Primeiro Acesso (Dona / Owner)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setFormLoading(true);

    try {
      const licenseEmail = localStorage.getItem('ml_license_email') || '';
      const requestEmail = email.trim();

      if (requestEmail.toLowerCase() !== licenseEmail.toLowerCase()) {
        setError('O e-mail cadastrado deve ser exatamente o mesmo e-mail associado à licença ativa.');
        setFormLoading(false);
        return;
      }

      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_owner',
          tenant_id: tenantId,
          name,
          email: requestEmail,
          password,
          license_key: localStorage.getItem('plena_license') || ''
        })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        alert('Cadastro realizado com sucesso! Efetue o login para acessar o painel.');
        setAuthMode('login');
        setHasOwner(true);
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(data.message || 'Erro ao realizar o cadastro de proprietária.');
      }
    } catch (err) {
      setError('Erro de conexão ao servidor. Tente novamente.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#121214] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-[#475569] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-white/40 animate-pulse">Carregando permissões...</span>
      </div>
    );
  }

  // Se não estiver configurado para nuvem, abre o painel local-first diretamente
  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  // Se estiver com sessão válida e permissão administrativa ativada, renderiza o painel
  if (sessionUser && isAdminMember === true) {
    return <>{children}</>;
  }

  if (ownerStatusError) {
    return (
      <div className="min-h-screen bg-[#121214] flex items-center justify-center p-4">
        <div className="bg-[#1A1A1D] p-8 md:p-10 rounded-2xl shadow-xl max-w-md w-full border border-white/5 space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Não foi possível abrir o acesso</h2>
            <p className="text-sm leading-relaxed text-slate-400">{ownerStatusError}</p>
          </div>
          <button
            type="button"
            onClick={retryOwnerStatus}
            className="w-full h-12 bg-[#475569] hover:bg-[#d6455d] text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wide"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center p-4">
      <div className="bg-[#1A1A1D] p-8 md:p-10 rounded-2xl shadow-xl max-w-md w-full border border-white/5 space-y-8 animate-in fade-in zoom-in-95 duration-200">

        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#475569]/10 rounded-2xl flex items-center justify-center border border-[#475569]/20">
              {authMode === 'register' ? (
                <Store className="w-8 h-8 text-[#475569]" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-[#475569]" />
              )}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
              {authMode === 'register' ? 'Primeiro Acesso' : 'Painel de Gestão'}
            </h2>
            <p className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mt-1">
              {currentEmpresa.name}
            </p>
          </div>
        </div>

        {/* Formulário de Registro (Primeiro Acesso) */}
        {authMode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider leading-normal">
                Nenhum proprietário ativo foi detectado neste restaurante. Preencha os dados abaixo para criar a conta master de administradora.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide ml-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 bg-[#222226] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#475569]"
                  placeholder="Nome de Exibição"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide ml-1">E-mail da Administradora</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-[#222226] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#475569]"
                  placeholder="exemplo@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#222226] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#475569]"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide ml-1">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 bg-[#222226] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#475569]"
                  placeholder="Repita a senha"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-red-400 text-xs font-semibold leading-normal">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="w-full h-12 bg-[#475569] hover:bg-[#d6455d] text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wide"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Concluir Cadastro'}
            </button>
          </form>
        ) : (
          /* Formulário de Login */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide ml-1">E-mail Administrativo</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-[#222226] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#475569]"
                  placeholder="administradora@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide ml-1">Senha de Segurança</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#222226] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#475569]"
                  placeholder="Sua senha secreta"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-red-400 text-xs font-semibold leading-normal">{error}</p>
              </div>
            )}

            {error && (
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="w-full h-11 border border-white/10 hover:border-[#475569] text-slate-300 font-bold rounded-xl transition-all flex justify-center items-center gap-2 text-[10px] uppercase tracking-wide"
              >
                Definir primeiro acesso
              </button>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="w-full h-12 bg-[#475569] hover:bg-[#d6455d] text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-wide animate-in fade-in"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
