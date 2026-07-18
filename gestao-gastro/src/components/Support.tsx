import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useModules } from '../hooks/useModules';
import { AppModule, getCommercialModuleName, planMatrix } from '../config/modulesConfig';
import { buildSupportDiagnostic } from '../utils/supportDiagnostic';
import { HelpTooltip } from './HelpTooltip';
import {
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

const moduleLabels: Record<AppModule, string> = {
  dashboard: 'Dashboard',
  pdv: 'PDV',
  mesas: 'Mesas/Comanda',
  cozinha: 'Cozinha',
  estoque: 'Estoque',
  caixa: 'Caixa',
  relatorios: 'Financeiro',
  manual: 'Manual',
  clientes: 'Clientes',
  colaboradores: 'Colaboradores',
  fornecedores: 'Fornecedores',
  produtos: 'Cardápio',
  suporte: 'Suporte',
  configuracoes: 'Configurações',
  seguranca: 'Segurança',
  evolucao: 'Evolução',
};

export const Support: React.FC = () => {
  const { theme, currentEmpresa, currentUser, supabaseOnline } = useApp();
  const { currentPlan, checkAccess } = useModules();
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [diagnosticGeneratedAt, setDiagnosticGeneratedAt] = useState(() => new Date().toISOString());
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const visibleModules = planMatrix[currentPlan].allowedModules
    .filter(checkAccess)
    .map(module => moduleLabels[module] || getCommercialModuleName(module));

  const diagnostic = buildSupportDiagnostic({
    generatedAt: diagnosticGeneratedAt,
    appVersion: APP_VERSION,
    route: window.location.pathname,
    tenantId: currentEmpresa.tenantId,
    tenantName: currentEmpresa.name,
    userRole: currentUser.role,
    plan: currentPlan,
    modules: visibleModules,
    browserOnline,
    supabaseOnline,
    pwaInstalled: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
  });

  const refreshDiagnostic = () => {
    setBrowserOnline(navigator.onLine);
    setDiagnosticGeneratedAt(new Date().toISOString());
    setCopyState('idle');
  };

  const copyDiagnostic = async () => {
    try {
      await navigator.clipboard.writeText(diagnostic);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
  };

  const contactMethods = [
    {
      title: 'WhatsApp',
      value: '(12) 99219-1018',
      sub: 'Atendimento via chat',
      icon: MessageCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      link: 'https://wa.me/5512992191018',
    },
    {
      title: 'E-mail',
      value: 'tecnologia@plenainformatica.com.br',
      sub: 'Suporte técnico oficial',
      icon: Mail,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      link: 'mailto:tecnologia@plenainformatica.com.br',
    },
    {
      title: 'Horário',
      value: 'Seg a Sex',
      sub: 'Das 09h às 17h',
      icon: Phone,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10',
      link: null,
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-12">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-xl bg-[#475569]/10 text-[#475569] mb-4">
          <Headphones className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center justify-center">Suporte <HelpTooltip moduleKey="support" /></h1>
        <p className="text-sm font-bold opacity-50 uppercase tracking-[0.2em] max-w-2xl mx-auto">
          Envie o diagnóstico junto ao chamado para reduzir o tempo de atendimento.
        </p>
      </div>

      <section
        aria-labelledby="support-diagnostic-title"
        className={`p-6 md:p-8 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/30'}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Clipboard className="w-5 h-5 text-[#475569]" />
              <h2 id="support-diagnostic-title" className="text-xl font-black uppercase tracking-tight">Diagnóstico do ambiente</h2>
            </div>
            <p className="text-sm font-semibold opacity-60 max-w-2xl">
              Contém apenas informações operacionais. Senhas, tokens, chaves e dados de pedidos não são coletados.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={refreshDiagnostic}
              className="min-h-11 px-4 rounded-lg border border-current/15 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#475569]"
            >
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button
              type="button"
              onClick={copyDiagnostic}
              className="min-h-11 px-5 rounded-lg bg-[#475569] text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#475569]"
            >
              {copyState === 'copied' ? <CheckCircle2 className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
              {copyState === 'copied' ? 'Diagnóstico copiado' : 'Copiar diagnóstico'}
            </button>
          </div>
        </div>

        <pre className={`max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg p-5 text-xs leading-6 border ${isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          {diagnostic}
        </pre>
        <div aria-live="polite" className="min-h-6 mt-3 text-sm font-semibold">
          {copyState === 'copied' && <span className="text-emerald-600">Copiado. Agora cole o diagnóstico no WhatsApp ou e-mail.</span>}
          {copyState === 'error' && <span className="text-red-600">Não foi possível copiar automaticamente. Selecione o texto acima e copie manualmente.</span>}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contactMethods.map((method, index) => {
          const content = (
            <>
              <div className={`w-14 h-14 rounded-lg ${method.bg} ${method.color} flex items-center justify-center mb-6`}>
                <method.icon className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest opacity-50 mb-1">{method.title}</h3>
              <p className={`${method.title === 'E-mail' ? 'text-sm' : 'text-xl'} font-black tracking-tight mb-2 break-all`}>{method.value}</p>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{method.sub}</p>
            </>
          );
          const className = `group p-8 rounded-xl border transition-all ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] hover:border-[#475569]/40' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20 hover:border-[#475569]/40'}`;

          return method.link ? (
            <motion.a
              key={method.title}
              href={method.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${className} active:scale-95`}
            >
              {content}
            </motion.a>
          ) : (
            <motion.div
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={className}
            >
              {content}
            </motion.div>
          );
        })}
      </div>

      <div className={`p-10 rounded-xl border overflow-hidden relative ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/30'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#475569]/5 -mr-32 -mt-32" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="space-y-2 flex-1 text-center md:text-left">
            <h2 className="text-2xl font-black tracking-tighter uppercase">Plena Informática</h2>
            <p className="text-sm font-bold opacity-60 leading-relaxed max-w-md uppercase tracking-tight">Acesse nosso site e conheça outras soluções.</p>
          </div>
          <a
            href="https://www.plenainformatica.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full md:w-auto items-center justify-center gap-3 px-6 md:px-10 py-6 bg-[#475569] text-white rounded-lg font-black uppercase tracking-widest text-[11px] shadow-sm shadow-[#475569]/40 active:scale-95 transition-all"
          >
            Visitar nosso site <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="text-center opacity-40 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Gestão Gastro — Versão {APP_VERSION}</p>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-2">© 2026 Plena Informática. Todos os direitos reservados.</p>
      </div>
    </div>
  );
};
