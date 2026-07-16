import React, { useState } from 'react';
import { Rocket, Cloud, Users, MessageSquare, Globe, BarChart3, ShoppingBag, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useModules } from '../hooks/useModules';
import { planMatrix, getCommercialModuleName, AppModule } from '../config/modulesConfig';
import { useApp } from '../store/AppContext';
import { HelpTooltip } from './HelpTooltip';

export const EvolutionCenter: React.FC = () => {
  const { currentPlan } = useModules();
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [toastMsg, setToastMsg] = useState('');
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
      description: 'Sincronização automática e segura de todos os dados do seu restaurante para a nuvem. Nunca perca uma informacao.',
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
      description: 'Um site profissional gerado automaticamente com seu cardápio, horário de funcionamento e localizacao.',
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 relative">
      {toastMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#475569] text-white px-6 py-3 rounded-full shadow-lg shadow-[#475569]/20 animate-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Rocket className="w-8 h-8 text-[#475569]" />
            Central de Evolução <HelpTooltip moduleKey="evolution" />
          </h2>
          <p className="opacity-50 font-bold uppercase tracking-wide text-[10px] mt-1">Descubra novos módulos e leve seu restaurante para o Próximo Nível.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#475569]/10 border border-[#475569]/30 rounded-full">
          <ShieldCheck className="w-5 h-5 text-[#475569]" />
          <span className="text-[#475569] font-bold uppercase tracking-wider text-[10px]">Licença Ativa</span>
        </div>
      </div>

      <div className={`rounded-lg border p-8 relative overflow-hidden ${isDark ? 'bg-[#1C1C1E] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
        {/* Efeito de brilho de fundo */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-[#475569] rounded-full filter opacity-10 pointer-events-none" />

        <div className="relative z-10 text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-2xl font-bold mb-4 break-words">Seu Plano Atual: <span className="uppercase text-[#475569]">{currentPlan}</span></h3>
          <p className="opacity-70 mb-6">
            Módulos liberados no seu plano atual:
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {planMatrix[currentPlan].allowedModules.map(m => (
              <span key={m} className="max-w-full break-words px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                {getCommercialModuleName(m)}
              </span>
            ))}
          </div>

          <h3 className="text-2xl font-bold mb-4">Evoluções Disponíveis (Premium/Master)</h3>
          <p className="opacity-70">
            Descubra recursos avançados para levar sua gestão ao próximo nível.
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

        <div className="mt-12 text-center relative z-10">
          <button
            onClick={() => handleCTA('Seu interesse foi registrado! Entraremos em contato com opções de upgrade.')}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg transition-all active:scale-95"
          >
            Solicitar Upgrade de Plano
          </button>
          <p className="text-xs opacity-50 mt-4">
            * O upgrade adicionará novos módulos ao seu painel. Você não perderá os dados atuais.
          </p>
        </div>
      </div>
    </div>
  );
};
