import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import {
  BookOpen, MonitorPlay, LayoutDashboard, Utensils,
  LineChart, Settings, Database, Lightbulb,
  CheckCircle2, Star, Target, TrendingUp, UserCheck,
  ChevronRight, Info, AlertTriangle, ShieldCheck,
  Circle, CheckCircle, Award, Smartphone,
  List, Box, Users, Truck, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpTooltip } from './HelpTooltip';

export const UserManual: React.FC = () => {
  const { theme, readGuides, toggleGuideRead } = useApp();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'guides' | 'tips' | 'roteiro'>('guides');

  const moduleGuides = [
    {
      id: 'guide_pdv',
      title: 'PDV & Balcão',
      icon: MonitorPlay,
      color: 'rose',
      description: 'O coracao da sua Operação. Agilidade é a palavra-chave.',
      steps: [
        { t: 'Trocar Atendente', d: 'Selecione quem está operando o caixa no momento para rastrear vendas.' },
        { t: 'Adicionar Produto ou Avulso', d: 'Clique no item do cardápio ou digite valor/descrição de um item avulso.' },
        { t: 'Fechar Venda', d: 'Escolha a forma de pagamento (múltiplas permitidas) e confirme para gerar o cupom.' }
      ]
    },
    {
      id: 'guide_dashboard',
      title: 'Dashboard BI',
      icon: LayoutDashboard,
      color: 'blue',
      description: 'Acompanhe os principais indicadores da operacao.',
      steps: [
        { t: 'Ticket Medio', d: 'Veja quanto cada cliente gasta em media e use isso para melhorar combos e ofertas.' },
        { t: 'Horarios de Pico', d: 'Identifique os momentos de maior movimento para ajustar equipe e preparo.' },
        { t: 'Produtos Mais Vendidos', d: 'Use o ranking para saber o que manter em destaque no cardapio.' }
      ]
    },
    {
      id: 'guide_mesas',
      title: 'Gestão de Mesas',
      icon: LayoutDashboard,
      color: 'blue',
      description: 'Controle o salão com visualização instantânea de status.',
      steps: [
        { t: 'Status Visual', d: 'Livre (Verde), Ocupada (Laranja) ou Reservada (Azul). Saiba bater o olho e agir.' },
        { t: 'Abrir Pedido', d: 'Clique em uma mesa livre para ocupá-la e lançar itens na comanda associada.' },
        { t: 'Liberar Mesa', d: 'Após o pagamento ser finalizado, encerre a comanda para liberar a mesa para o próximo cliente.' }
      ]
    },
    {
      id: 'guide_cozinha',
      title: 'Cozinha (KDS)',
      icon: Utensils,
      color: 'amber',
      description: 'Onde a magia acontece. Fluxo digital sem papel.',
      steps: [
        { t: 'Modo de Operação', d: 'Escolha entre Modo Visualização (apenas tela) ou Interativo (clicar para dar andamento).' },
        { t: 'Interpretar Status', d: 'Novo Pedido, Em Preparo e Pronto. Tudo sincronizado com os garçons.' },
        { t: 'Fila de Pedidos', d: 'Os itens aparecem automaticamente assim que a comanda ou PDV confimar o pedido.' }
      ]
    },
    {
      id: 'guide_cardapio',
      title: 'Cardápio Digital',
      icon: List,
      color: 'emerald',
      description: 'A vitrine do seu negócio.',
      steps: [
        { t: 'Categorização', d: 'Separe itens por tipos (Bebidas, Pratos) para facilitar a busca no PDV.' },
        { t: 'Ficha Técnica', d: 'Vincule ingredientes ao produto para controle automático de estoque nas vendas.' },
        { t: 'Precificação', d: 'Ajuste preços rapidamente para proteger sua margem de lucro.' }
      ]
    },
    {
      id: 'guide_estoque',
      title: 'Estoque & Insumos',
      icon: Box,
      color: 'slate',
      description: 'Controle rígido para evitar desperdícios.',
      steps: [
        { t: 'Cadastro de Insumo', d: 'Registre matéria-prima com unidade correta (kg, g, L, ml).' },
        { t: 'Alerta de Faltas', d: 'Configure o estoque mínimo para ser avisado antes do produto acabar.' },
        { t: 'Baixa Automática', d: 'Quando atrelado à ficha técnica, o insumo diminui sozinho a cada venda.' }
      ]
    },
    {
      id: 'guide_caixa',
      title: 'Caixa & Financeiro',
      icon: LineChart,
      color: 'rose',
      description: 'Fechamento sem dor de cabeça.',
      steps: [
        { t: 'Abertura de Caixa', d: 'Informe o troco inicial do dia em gaveta.' },
        { t: 'Sangria e Suprimento', d: 'Registre retiradas de dinheiro ou adição de troco para bater o caixa final.' },
        { t: 'Fechamento e Divergência', d: 'Some o dinheiro físico e lance no sistema. O sistema acusa faltas ou sobras.' }
      ]
    },
    {
      id: 'guide_colaboradores',
      title: 'Colaboradores',
      icon: UserCheck,
      color: 'blue',
      description: 'Acessos e performance da equipe.',
      steps: [
        { t: 'Criação de Acesso', d: 'Crie e-mail e senha e defina o papel (Admin, Caixa, Garçom).' },
        { t: 'Ativação/Desativação', d: 'Desative ex-funcionários sem perder o histórico de vendas deles.' },
        { t: 'Garçons', d: 'Para que eles vendam, eles devem ser cadastrados como papel Garçom.' }
      ]
    },
    {
      id: 'guide_clientes',
      title: 'Clientes',
      icon: Users,
      color: 'amber',
      description: 'CRM e histórico de vendas.',
      steps: [
        { t: 'Cadastro Rápido', d: 'Registre nome e contato na hora da venda.' },
        { t: 'Preferências', d: 'Anote gostos do cliente (ex: sem cebola) para fidelizar o atendimento.' }
      ]
    },
    {
      id: 'guide_fornecedores',
      title: 'Fornecedores',
      icon: Truck,
      color: 'emerald',
      description: 'Parceiros de negócio.',
      steps: [
        { t: 'Contato Centralizado', d: 'Mantenha telefone e vendedor de cada fornecedor à mão.' },
        { t: 'Insumo Preferencial', d: 'No cadastro de insumo, marque qual o fornecedor preferencial dele.' }
      ]
    },
    {
      id: 'guide_config',
      title: 'Configurações',
      icon: Settings,
      color: 'slate',
      description: 'O cérebro do sistema.',
      steps: [
        { t: 'Dados do Salão', d: 'Altere nome, CNPJ (para recibos) e defina quantas mesas o salão possui.' },
        { t: 'Link de Comanda', d: 'Descubra a URL ou IP para conectar garçons no smartphone.' },
        { t: 'Impressão', d: 'Configure IPs de impressoras térmicas locais se utilizar.' }
      ]
    },
    {
      id: 'guide_seguranca',
      title: 'Segurança & Backup',
      icon: ShieldCheck,
      color: 'rose',
      description: 'Proteção total dos seus dados.',
      steps: [
        { t: 'Sincronização Nuvem', d: 'Seu sistema salva na nuvem (Supabase) e opera offline. Veja os status de sync.' },
        { t: 'Backup JSON', d: 'Para garantir, baixe um arquivo JSON com todas as vendas localmente.' }
      ]
    },
    {
      id: 'guide_suporte',
      title: 'Suporte Técnico',
      icon: MessageCircle,
      color: 'blue',
      description: 'Nós estamos aqui por você.',
      steps: [
        { t: 'Acionamento Rápido', d: 'Saiba os canais de contato da Plena Informática.' },
        { t: 'Dúvidas Frequentes', d: 'Sempre consulte este manual e os tooltips antes de abrir um chamado.' }
      ]
    },
    {
      id: 'guide_evolucao',
      title: 'Centro de Evolução',
      icon: Target,
      color: 'amber',
      description: 'O futuro do Gestão Gastro.',
      steps: [
        { t: 'Notas de Lançamento', d: 'Acompanhe as atualizações gratuitas do seu plano.' },
        { t: 'Novos Módulos', d: 'Descubra integrações avançadas disponíveis no Roadmap.' }
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
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      {/* Hero Header with Progress */}
      <div className={`p-10 md:p-12 rounded-xl border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10
        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20'}`}>

        <div className="absolute top-0 left-0 w-full h-1 bg-current opacity-5" />

        <div className="space-y-4 text-center md:text-left relative z-10 flex-1">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#475569]/10 text-[#475569] text-[10px] font-black uppercase tracking-widest">
            <Award className="w-4 h-4" /> Academia de Gestão Gastro
          </div>
          <h1 id="guide_manual" className="text-5xl font-black tracking-tighter uppercase italic leading-none flex items-center gap-3 scroll-mt-20">Manual de <span className="text-[#475569]">Alta Performance</span> <HelpTooltip moduleKey="manual" /></h1>
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
          <button
            onClick={() => setActiveTab('roteiro')}
            className={`px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.1em] transition-all
              ${activeTab === 'roteiro'
                ? 'bg-[#475569] text-white shadow-lg shadow-[#475569]/20'
                : 'opacity-40 hover:opacity-100'
              }
            `}
          >
            Roteiro Primeiro Dia
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
                  id={guide.id}
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
        ) : activeTab === 'dicas' ? (
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
        ) : (
          <motion.div
            key="roteiro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 gap-8 max-w-4xl mx-auto"
          >
            <div className={`p-10 rounded-xl border flex flex-col group transition-all duration-500
              ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'}
            `}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-accent/20">
                  <MonitorPlay className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter">O Roteiro de Primeiro Dia</h3>
                  <p className="text-sm font-bold opacity-60 leading-relaxed uppercase tracking-tight">Siga estas 8 etapas para iniciar sua operação com sucesso no Gestão Gastro.</p>
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { n: 1, title: 'Conferir Rota do Cliente', desc: 'Garanta que a rota de acesso está configurada (ex: localhost/resenha).' },
                  { n: 2, title: 'Ativar Licença', desc: 'Valide a licença do sistema usando o código fornecido pela Plena Informática.' },
                  { n: 3, title: 'Criar Acesso Admin', desc: 'No primeiro uso, cadastre o administrador principal.' },
                  { n: 4, title: 'Revisar Dados', desc: 'Em Configurações, preencha nome do local, telefone e CNPJ para o cupom.' },
                  { n: 5, title: 'Configurar Mesas', desc: 'Em Configurações > Salão, defina o número total de mesas operacionais.' },
                  { n: 6, title: 'Revisar Cardápio', desc: 'Edite produtos existentes ou adicione novos no Módulo Cardápio.' },
                  { n: 7, title: 'Cadastrar Equipe', desc: 'Em Colaboradores, crie senhas para Garçons e Caixas.' },
                  { n: 8, title: 'Testar Comanda Mobile', desc: 'Acesse o IP do servidor pelo celular do garçom para verificar o envio de pedidos.' },
                  { n: 9, title: 'Abrir o Caixa', desc: 'Em Caixa, inicie o dia declarando o troco que está na gaveta.' },
                  { n: 10, title: 'Fazer Venda Teste', desc: 'Faça um pedido no PDV ou Mesa e confirme o faturamento.' },
                  { n: 11, title: 'Fechar Caixa Teste', desc: 'Realize o fechamento simulando o fim do dia para ver as métricas de sobra/falta.' },
                  { n: 12, title: 'Validar Relatórios', desc: 'Confira se a venda teste apareceu no Dashboard.' },
                ].map(step => (
                  <div key={step.n} className="flex gap-5 items-center p-4 rounded-lg bg-current/[0.02]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 bg-accent/10 text-accent">
                      {step.n}
                    </div>
                    <div>
                      <h4 className="text-base font-black uppercase tracking-tight">{step.title}</h4>
                      <p className="text-xs font-bold opacity-50 uppercase tracking-tighter mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Procedimentos Operacionais Rápidos */}
      <div className="space-y-6">
        <h2 className="text-3xl font-black uppercase italic tracking-tighter">Procedimentos Operacionais Rápidos</h2>
        <div className="grid grid-cols-1 gap-6">

          {/* Seção Comanda Mobile */}
          <div id="comanda-mobile" className={`p-8 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'} scroll-mt-20`}>
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Como acessar a Comanda via Celular do Garçom</h3>
            </div>
            <p className="text-xs opacity-70 leading-relaxed font-semibold uppercase tracking-wide">
              1. No painel administrativo, vá em <strong>Configurações &gt; Acessos e QR Code</strong>.<br/>
              2. Caso esteja em ambiente de desenvolvimento local, configure o IP da sua rede local (ex: http://192.168.0.10:3000) para habilitar o acesso.<br/>
              3. Faça o garçom apontar a câmera do celular para o QR Code gerado, ou envie o link gerado diretamente para o dispositivo dele.<br/>
              4. O garçom deverá fazer login com o e-mail e senha criados por você na aba de equipe em Configurações.
            </p>
          </div>

          {/* Seção Fechamento de Caixa */}
          <div id="fechamento-caixa" className={`p-8 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'} scroll-mt-20`}>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Fluxo de Fechamento e Caixa Diário</h3>
            </div>
            <p className="text-xs opacity-70 leading-relaxed font-semibold uppercase tracking-wide">
              1. O caixa diário deve ser <strong>Aberto</strong> informando o valor de troco inicial em dinheiro.<br/>
              2. Durante o dia, todas as vendas do PDV e comandas fechadas alimentarão o caixa automaticamente.<br/>
              3. Sangrias (retirada de dinheiro para segurança) e suprimentos (adição de troco) devem ser registrados imediatamente.<br/>
              4. Ao final do expediente, clique em <strong>Fechar Caixa</strong>, confira os valores em dinheiro, cartão e PIX calculados pelo sistema, informe o valor real e confirme o encerramento da sessão diária.
            </p>
          </div>

          {/* Seção Estoque e Receitas */}
          <div id="estoque-receitas" className={`p-8 rounded-xl border ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/10'} scroll-mt-20`}>
            <div className="flex items-center gap-3 mb-4">
              <Utensils className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Regras de Validação de Estoque e Receitas</h3>
            </div>
            <p className="text-xs opacity-70 leading-relaxed font-semibold uppercase tracking-wide">
              1. <strong>Insumos</strong>: Cadastre a matéria-prima (ex: carne, queijo, pão, refrigerante) em Estoque com unidade e estoque mínimo.<br/>
              2. <strong>Ficha Técnica/Receitas</strong>: No cardápio, associe os insumos a cada produto informando a quantidade consumida por venda (ex: 0.150kg de carne para o hambúrguer).<br/>
              3. <strong>Validação</strong>: O sistema debita insumos automaticamente a cada venda no PDV ou comanda faturada. Se algum insumo da receita estiver zerado, o sistema alertará sobre o estoque insuficiente.
            </p>
          </div>

        </div>
      </div>

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
