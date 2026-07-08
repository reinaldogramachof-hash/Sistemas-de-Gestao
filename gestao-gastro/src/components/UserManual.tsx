import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import {
  BookOpen, MonitorPlay, LayoutDashboard, Utensils,
  LineChart, Settings, Database, Lightbulb,
  CheckCircle2, Star, Target, TrendingUp, UserCheck,
  ChevronRight, Info, AlertTriangle, ShieldCheck,
  Circle, CheckCircle, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UserManual: React.FC = () => {
  const { theme, readGuides, toggleGuideRead } = useApp();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'guides' | 'tips'>('guides');

  const moduleGuides = [
    {
      id: 'guide_pdv',
      title: 'PDV & Balcão',
      icon: MonitorPlay,
      color: 'rose',
      description: 'O coracao da sua Operação. Agilidade é a palavra-chave.',
      steps: [
        { t: 'Abertura Rápida', d: 'Inicie vendas em segundos clicando diretamente nos itens do cardápio.' },
        { t: 'Gestão de Pagamentos', d: 'Suporta múltiplas formas de pagamento em uma única conta (Split).' },
        { t: 'Impressão de Comanda', d: 'Envie o pedido para a cozinha ou balcão automaticamente apos confirmar.' }
      ]
    },
    {
      id: 'guide_dashboard',
      title: 'Dashboard BI',
      icon: LayoutDashboard,
      color: 'blue',
      description: 'Sua bússola estratégica. Decisões baseadas em dados reais.',
      steps: [
        { t: 'Ticket Médio', d: 'Acompanhe quanto cada cliente gasta em média no seu estabelecimento.' },
        { t: 'Vendas por Hora', d: 'Identifique seus horários de pico e otimize sua equipe.' },
        { t: 'Produtos Top 10', d: 'Saiba quais itens mais saem e quais precisam de promoção.' }
      ]
    },
    {
      id: 'guide_cardapio',
      title: 'Cardápio Digital',
      icon: Utensils,
      color: 'amber',
      description: 'Organize sua oferta de forma atraente e lucrativa.',
      steps: [
        { t: 'Categorizacao', d: 'Separe itens por tipos (Bebidas, Pratos, Entradas) para facilitar a busca.' },
        { t: 'Ficha Tecnica', d: 'Vincule ingredientes ao produto para controle automático de estoque.' },
        { t: 'Precificacao', d: 'Ajuste preços rapidamente conforme a flutuacao dos custos de insumos.' }
      ]
    },
    {
      id: 'guide_financeiro',
      title: 'Gestão Financeira',
      icon: LineChart,
      color: 'emerald',
      description: 'Saúde financeira em dia. Controle cada centavo.',
      steps: [
        { t: 'Fluxo de Caixa', d: 'Registre todas as entradas e saídas (sangrias e suprimentos).' },
        { t: 'Relatórios Mensais', d: 'Compare o desempenho de diferentes meses para prever tendências.' },
        { t: 'Controle de Despesas', d: 'Categorize gastos fixos e variáveis para calcular o lucro líquido real.' }
      ]
    },
    {
      id: 'guide_config',
      title: 'Backup & Segurança',
      icon: Settings,
      color: 'slate',
      description: 'Proteja o patrimônio de dados da sua empresa.',
      steps: [
        { t: 'Dados do Cupom', d: 'Personalize o cabeçalho do recibo com CNPJ, Endereço e Telefone.' },
        { t: 'Backup Semanal', d: 'Exporte o arquivo JSON toda semana e guarde em local seguro (nuvem/HD).' },
        { t: 'Restauração', d: 'Em caso de troca de computador, importe o backup para continuar de onde parou.' }
      ]
    }
  ];

  const proTips = [
    { id: 'tip_1', title: 'Engenharia de Cardápio', icon: Target, content: 'Posicione os produtos com maior margem de lucro em locais de destaque visual no sistema. Use o Dashboard para identificar os "Estrelas" (muita saída, margem alta).' },
    { id: 'tip_2', title: 'Controle de CMV', icon: TrendingUp, content: 'Mantenha o seu Custo de Mercadoria Vendida (CMV) entre 25% e 35%. Use a ficha técnica rigorosamente para que o estoque reflita a realidade.' },
    { id: 'tip_3', title: 'Ticket Médio', icon: Star, content: 'Treine sua equipe para oferecer acompanhamentos ou bebidas premium. Um aumento de 10% no ticket médio pode representar até 30% de aumento no lucro líquido.' },
    { id: 'tip_4', title: 'Fidelização', icon: UserCheck, content: 'Use o cadastro de clientes para registrar preferências e datas especiais. Um cliente que se sente reconhecido volta 3x mais.' }
  ];

  const totalItems = moduleGuides.length + proTips.length;
  const completedItems = readGuides.length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
      {/* Hero Header with Progress */}
      <div className={`p-10 md:p-12 rounded-xl border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10
        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20'}`}>

        <div className="absolute top-0 left-0 w-full h-1 bg-current opacity-5" />

        <div className="space-y-4 text-center md:text-left relative z-10 flex-1">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#475569]/10 text-[#475569] text-[10px] font-black uppercase tracking-widest">
            <Award className="w-4 h-4" /> Academia de Gestão Gastro
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">Manual de <span className="text-[#475569]">Alta Performance</span></h1>
          <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em] max-w-lg">
            Domine as ferramentas do Gestão Gastro e transforme sua gestão.
          </p>
        </div>

        <div className="w-full md:w-80 space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Seu Progresso no Treinamento</span>
            <span className="text-xl font-black text-[#475569]">{progressPercent}%</span>
          </div>
          <div className={`h-4 w-full rounded-full overflow-hidden p-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-[#475569] rounded-full shadow-lg shadow-[#475569]/40"
            />
          </div>
          <p className="text-[9px] font-bold opacity-30 text-center md:text-right uppercase tracking-widest">
            {completedItems} de {totalItems} tópicos concluídos
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center">
        <div className={`p-1.5 rounded-lg flex gap-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
          <button
            onClick={() => setActiveTab('guides')}
            className={`px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.1em] transition-all
              ${activeTab === 'guides'
                ? 'bg-[#475569] text-white shadow-lg shadow-[#475569]/20'
                : 'opacity-40 hover:opacity-100'
              }
            `}
          >
            Módulos Contratados
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.1em] transition-all
              ${activeTab === 'tips'
                ? 'bg-[#475569] text-white shadow-lg shadow-[#475569]/20'
                : 'opacity-40 hover:opacity-100'
              }
            `}
          >
            Dicas Profissionais
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'guides' ? (
          <motion.div
            key="guides"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {moduleGuides.map((guide) => {
              const isRead = readGuides.includes(guide.id);
              const colorClass =
                guide.color === 'rose' ? 'bg-rose-500' :
                guide.color === 'blue' ? 'bg-blue-500' :
                guide.color === 'amber' ? 'bg-amber-500' :
                guide.color === 'emerald' ? 'bg-emerald-500' : 'bg-slate-500';

              return (
                <div
                  key={guide.id}
                  className={`p-10 rounded-xl border transition-all duration-500 group relative
                    ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'}
                    ${isRead ? 'opacity-60 grayscale-[0.5]' : 'opacity-100'}
                  `}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:rotate-12 ${colorClass}`}>
                      <guide.icon className="w-8 h-8" />
                    </div>
                    <button
                      onClick={() => toggleGuideRead(guide.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                        ${isRead
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : `${isDark ? 'bg-white/5 text-white/40 hover:bg-[#475569] hover:text-white' : 'bg-gray-100 text-gray-400 hover:bg-[#475569] hover:text-white'}`
                        }
                      `}
                    >
                      {isRead ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {isRead ? 'Lido' : 'Marcar como Lido'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{guide.title}</h3>
                    <p className="text-[12px] font-bold opacity-40 uppercase leading-relaxed tracking-wider mb-8">{guide.description}</p>

                    <div className="space-y-6 pt-8 border-t border-dashed border-current/10">
                      {guide.steps.map((step, sIdx) => (
                        <div key={sIdx} className="flex gap-5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0
                            ${isRead ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[#475569]/10 text-[#475569]'}`}>
                            {sIdx + 1}
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-black uppercase tracking-tight">{step.t}</h4>
                            <p className="text-[11px] font-bold opacity-50 leading-relaxed uppercase tracking-tighter">{step.d}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="tips"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {proTips.map((tip) => {
              const isRead = readGuides.includes(tip.id);
              return (
                <div
                  key={tip.id}
                  className={`p-10 rounded-xl border flex flex-col justify-between group transition-all duration-500
                    ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'}
                    ${isRead ? 'opacity-60' : 'opacity-100'}
                  `}
                >
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-16 rounded-xl bg-[#475569]/10 flex items-center justify-center flex-shrink-0 group- transition-transform">
                        <tip.icon className="w-8 h-8 text-[#475569]" />
                      </div>
                      <button
                        onClick={() => toggleGuideRead(tip.id)}
                        className={`p-2 rounded-full transition-all
                          ${isRead ? 'text-emerald-500' : 'text-gray-300 hover:text-[#475569]'}
                        `}
                      >
                        {isRead ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">{tip.title}</h3>
                      <p className="text-sm font-bold opacity-60 leading-relaxed uppercase tracking-tight">
                        "{tip.content}"
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 mt-8 border-t border-dashed border-current/10 flex items-center gap-3 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    <ShieldCheck className="w-5 h-5" /> Estratégia Recomendada
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Call to Action */}
      <div className={`p-10 rounded-xl border border-[#475569]/20 bg-[#475569]/5 text-center space-y-6`}>
        <div className="w-20 h-20 bg-[#475569] rounded-full mx-auto flex items-center justify-center text-white shadow-sm shadow-[#475569]/40 mb-4">
          <Lightbulb className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-black uppercase italic tracking-tighter">Pronto para o Próximo Nível?</h3>
        <p className="text-[11px] font-bold opacity-40 uppercase tracking-[0.3em] max-w-xl mx-auto">
          O domínio operacional é o primeiro passo para a expansão. Use o suporte da Plena Informática para qualquer dúvida técnica.
        </p>
      </div>
    </div>
  );
};
