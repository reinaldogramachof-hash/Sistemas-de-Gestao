import React, { useState, useEffect } from 'react';
import { Rocket, Cloud, Users, MessageSquare, Globe, BarChart3, ShoppingBag, ShieldCheck, CheckCircle2, Sparkles, Send, MessageCircle, Tag, History, ThumbsUp } from 'lucide-react';
import { useModules } from '../hooks/useModules';
import { planMatrix, getCommercialModuleName } from '../config/modulesConfig';
import { useApp } from '../store/AppContext';
import { HelpTooltip } from './HelpTooltip';

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  items: {
    type: 'novo' | 'melhoria' | 'correcao';
    text: string;
  }[];
}

const releaseHistory: ReleaseNote[] = [
  {
    version: 'v1.4.0',
    date: '21 de Julho, 2026',
    title: 'Evolução dos Módulos Estruturais do Sistema',
    items: [
      { type: 'novo', text: 'Trilha de Auditoria interativa com busca, filtros por colaborador e exportação em CSV.' },
      { type: 'novo', text: 'Painel de Saúde do Sistema (Health Check) com monitor de internet, Supabase e fila offline.' },
      { type: 'melhoria', text: 'Reorganização da tela de Configurações em abas lógicas com assistente de IP local.' },
      { type: 'correcao', text: 'Bypass de licença em ambiente local (localhost) para testes sem consumo da licença oficial.' }
    ]
  },
  {
    version: 'v1.3.0',
    date: '10 de Julho, 2026',
    title: 'Gestão Avançada de Comandas & PWA',
    items: [
      { type: 'novo', text: 'Suporte a múltiplas comandas por mesa no aplicativo do garçom.' },
      { type: 'melhoria', text: 'Modo PWA com instalação direta no celular/desktop e suporte offline total.' },
      { type: 'correcao', text: 'Ajuste no tempo de resposta do fechamento de caixa e sincronização remota.' }
    ]
  },
  {
    version: 'v1.2.0',
    date: '25 de Junho, 2026',
    title: 'PDV & Controle de Caixa',
    items: [
      { type: 'novo', text: 'Abertura, suprimentos, sangrias e fechamento de caixa com conferência cega.' },
      { type: 'melhoria', text: 'Impressão térmica configurável para vias do caixa e da cozinha.' }
    ]
  }
];

interface UserSuggestion {
  id: string;
  moduleName: string;
  title: string;
  description: string;
  createdAt: string;
}

export const EvolutionCenter: React.FC = () => {
  const { currentPlan } = useModules();
  const { theme, currentEmpresa } = useApp();
  const isDark = theme === 'dark';
  const [toastMsg, setToastMsg] = useState('');

  // Estados do formulário de sugestão
  const [suggestionModule, setSuggestionModule] = useState('PDV / Vendas');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [submittedSuggestions, setSubmittedSuggestions] = useState<UserSuggestion[]>([]);
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gestao_gastro_user_suggestions');
      if (saved) setSubmittedSuggestions(JSON.parse(saved));
    } catch {}
  }, []);

  const handleSendSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionTitle.trim() || !suggestionDescription.trim()) return;

    const newSuggestion: UserSuggestion = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      moduleName: suggestionModule,
      title: suggestionTitle.trim(),
      description: suggestionDescription.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newSuggestion, ...submittedSuggestions];
    setSubmittedSuggestions(updated);
    try {
      localStorage.setItem('gestao_gastro_user_suggestions', JSON.stringify(updated));
    } catch {}

    setSuggestionTitle('');
    setSuggestionDescription('');
    setSuggestionSuccess(true);
    setTimeout(() => setSuggestionSuccess(false), 5000);
  };

  const handleSendViaWhatsApp = (sug: UserSuggestion) => {
    const text = encodeURIComponent(
      `*Sugestão de Melhoria - Gestão Gastro*\n\n` +
      `*Restaurante:* ${currentEmpresa?.name || 'Cliente'}\n` +
      `*Módulo:* ${sug.moduleName}\n` +
      `*Título:* ${sug.title}\n` +
      `*Detalhes:* ${sug.description}`
    );
    window.open(`https://wa.me/5512992191018?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const premiumFeatures = [
    {
      id: 'pedidos',
      title: 'Pedidos Online',
      description: 'Receba pedidos de delivery e retirada diretamente pelo seu próprio cardápio digital, sem taxas abusivas.',
      icon: ShoppingBag,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      status: 'premium',
      plan: 'premium_monthly',
      cta: 'Conhecer recurso',
      message: 'Este recurso fará parte da evolução Premium Online Mensal.'
    },
    {
      id: 'cloud',
      title: 'Backup em Nuvem',
      description: 'Sincronização automática e segura de todos os dados do seu restaurante para a nuvem. Nunca perca uma informação.',
      icon: Cloud,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      status: 'premium',
      plan: 'premium_monthly',
      cta: 'Conhecer recurso',
      message: 'Este recurso fará parte da evolução Premium Online Mensal.'
    },
    {
      id: 'multi',
      title: 'Multiusuário',
      description: 'Acesse o sistema simultaneamente de diferentes dispositivos (caixa, celular do garçom, tablet na cozinha).',
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      status: 'premium',
      plan: 'premium_monthly',
      cta: 'Conhecer recurso',
      message: 'Este recurso fará parte da evolução Premium Online Mensal.'
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Automático',
      description: 'Envie status de pedidos, cardápio e promoções de forma automática pelo WhatsApp do cliente.',
      icon: MessageSquare,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      status: 'premium',
      plan: 'premium_monthly',
      cta: 'Conhecer recurso',
      message: 'Este recurso fará parte da evolução Premium Online Mensal.'
    },
    {
      id: 'website',
      title: 'Página Pública',
      description: 'Um site profissional gerado automaticamente com seu cardápio, horário de funcionamento e localização.',
      icon: Globe,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10',
      status: 'premium',
      plan: 'premium_monthly',
      cta: 'Conhecer recurso',
      message: 'Este recurso fará parte da evolução Premium Online Mensal.'
    },
    {
      id: 'reports',
      title: 'Relatórios Avançados Online',
      description: 'Dashboard financeiro e de vendas completo acessível de qualquer lugar pelo celular.',
      icon: BarChart3,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10',
      status: 'premium',
      plan: 'premium_monthly',
      cta: 'Conhecer recurso',
      message: 'Este recurso fará parte da evolução Premium Online Mensal.'
    }
  ];

  const handleCTA = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-24 relative">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#475569] text-white px-6 py-3 rounded-full shadow-lg shadow-[#475569]/20 animate-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dashed border-current/10 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Rocket className="w-8 h-8 text-[#475569]" />
            Central de Evolução <HelpTooltip moduleKey="evolution" />
          </h1>
          <p className="opacity-50 font-bold uppercase tracking-wide text-[10px] mt-1">Acompanhe as novidades, envie sugestões e descubra recursos para o seu restaurante.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#475569]/10 border border-[#475569]/30 rounded-full">
          <ShieldCheck className="w-5 h-5 text-[#475569]" />
          <span className="text-[#475569] font-bold uppercase tracking-wider text-[10px]">Licença Ativa — Plano {currentPlan}</span>
        </div>
      </div>

      {/* Grid: Novidades Recentes & Sugestões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Mural de Novidades (Release Notes) */}
        <div className={`p-8 rounded-xl border space-y-6 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between border-b border-dashed border-current/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold uppercase tracking-tight">Mural de Novidades</h2>
                <p className="text-[10px] font-bold opacity-40 uppercase">Histórico de atualizações do sistema</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 font-bold text-[9px] uppercase tracking-wider">
              {releaseHistory[0].version} Atual
            </span>
          </div>

          <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2">
            {releaseHistory.map((release) => (
              <div key={release.version} className={`p-5 rounded-xl border space-y-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-500">{release.version}</span>
                  <span className="text-[10px] font-bold opacity-40 uppercase">{release.date}</span>
                </div>
                <h3 className="text-sm font-bold uppercase tracking-tight">{release.title}</h3>
                <ul className="space-y-2">
                  {release.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest flex-shrink-0 mt-0.5 ${
                        item.type === 'novo' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                        item.type === 'melhoria' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                        'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}>
                        {item.type}
                      </span>
                      <span className="opacity-80 leading-relaxed">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Formulário de Sugestões de Melhorias */}
        <div className={`p-8 rounded-xl border space-y-6 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 border-b border-dashed border-current/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-tight">Sugerir Melhoria</h2>
              <p className="text-[10px] font-bold opacity-40 uppercase">Envie sua ideia diretamente para nossa equipe</p>
            </div>
          </div>

          <form onSubmit={handleSendSuggestion} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Módulo da Sugestão</label>
              <select
                value={suggestionModule}
                onChange={e => setSuggestionModule(e.target.value)}
                className={`w-full h-11 px-4 rounded-xl border outline-none text-xs ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-gray-50 border-gray-200'}`}
              >
                <option value="PDV / Vendas">PDV / Vendas</option>
                <option value="Mesas e Comandas">Mesas e Comandas</option>
                <option value="Cardápio / Produtos">Cardápio / Produtos</option>
                <option value="Estoque / Insumos">Estoque / Insumos</option>
                <option value="Financeiro / Caixa">Financeiro / Caixa</option>
                <option value="Configurações e Suporte">Configurações e Suporte</option>
                <option value="Outro assunto">Outro assunto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Título da Ideia</label>
              <input
                type="text"
                value={suggestionTitle}
                onChange={e => setSuggestionTitle(e.target.value)}
                placeholder="Ex: Botão rápido para imprimir 2ª via da comanda"
                required
                className={`w-full h-11 px-4 rounded-xl border outline-none text-xs ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-200 focus:border-[#475569]'}`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">O que facilitaria na sua operação?</label>
              <textarea
                value={suggestionDescription}
                onChange={e => setSuggestionDescription(e.target.value)}
                rows={3}
                placeholder="Descreva detalhadamente como essa funcionalidade ajudaria no dia a dia do restaurante..."
                required
                className={`w-full p-4 rounded-xl border outline-none text-xs resize-none ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-200 focus:border-[#475569]'}`}
              />
            </div>

            {suggestionSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Sugestão salva! Obrigado por ajudar a evoluir o sistema.
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-[#475569] text-white font-bold rounded-xl text-xs uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Registrar Sugestão
            </button>
          </form>

          {/* Minhas Sugestões Registradas */}
          {submittedSuggestions.length > 0 && (
            <div className="pt-4 border-t border-dashed border-current/10 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide opacity-60">Suas sugestões nesta máquina:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {submittedSuggestions.map(sug => (
                  <div key={sug.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                      <p className="text-xs font-bold truncate">{sug.title}</p>
                      <p className="text-[9px] font-bold opacity-40 uppercase">{sug.moduleName}</p>
                    </div>
                    <button
                      onClick={() => handleSendViaWhatsApp(sug)}
                      title="Enviar via WhatsApp para o Suporte"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-500/20"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Enviar Whats
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 3. Recursos Futuros e Upgrades */}
      <div className={`rounded-xl border p-8 relative overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#475569] rounded-full filter opacity-10 pointer-events-none" />

        <div className="relative z-10 text-center max-w-2xl mx-auto mb-10">
          <h3 className="text-2xl font-bold mb-3">Recursos em Expansão (Módulos Online/Premium)</h3>
          <p className="opacity-70 text-xs font-semibold uppercase tracking-wide">
            Conheça as ferramentas disponíveis para expandir a operação do seu restaurante.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {premiumFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.id} className={`rounded-xl p-6 border transition-all hover:translate-y-[-2px] ${isDark ? 'bg-[#2A2A2D] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'}`}>
                <div className={`w-12 h-12 rounded-lg ${feat.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${feat.color}`} />
                </div>
                <h4 className="text-lg font-bold mb-2">{feat.title}</h4>
                <p className="text-sm opacity-70 leading-relaxed mb-4">
                  {feat.description}
                </p>
                <button
                  onClick={() => handleCTA(feat.message)}
                  className="mt-auto text-xs font-bold uppercase tracking-wider text-[#475569] hover:opacity-70 transition-colors"
                >
                  {feat.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center relative z-10">
          <button
            onClick={() => handleCTA('Seu interesse foi registrado! Entraremos em contato com opções de upgrade.')}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-all active:scale-95 text-xs uppercase tracking-wider"
          >
            Solicitar Upgrade de Plano
          </button>
        </div>
      </div>
    </div>
  );
};
