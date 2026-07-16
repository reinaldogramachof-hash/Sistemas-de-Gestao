import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../store/AppContext';

interface HelpTooltipProps {
  moduleKey?: 'dashboard' | 'pdv' | 'tables' | 'waiters' | 'kitchen' | 'menu' | 'finance' | 'stock' | 'settings' | 'customers' | 'suppliers' | 'security' | 'support' | 'evolution' | 'manual' | 'reports' | 'collaborators';
  id?: string;
  content?: string;
  anchorId?: string;
  title?: string;
}

const HELP_CONTENTS: Record<string, { title: string; content: string; anchorId: string }> = {
  dashboard: {
    title: "Dashboard",
    content: "O Dashboard exibe as principais métricas de faturamento, ticket médio, horários de pico e estatísticas dos garçons do seu restaurante.",
    anchorId: "guide_dashboard"
  },
  pdv: {
    title: "Ponto de Venda (PDV)",
    content: "O PDV permite registrar novos pedidos rápidos de balcão, gerenciar mesas operacionais, fechar contas e receber pagamentos.",
    anchorId: "guide_pdv"
  },
  tables: {
    title: "Gestão de Mesas",
    content: "O painel de mesas gerencia o estado operacional do salão (livre, ocupada, reservada) e os pedidos abertos em cada comanda.",
    anchorId: "guide_mesas"
  },
  waiters: {
    title: "Desempenho de Garçons",
    content: "Acompanhe o faturamento gerado por cada garçom e a produtividade operacional.",
    anchorId: "guide_colaboradores"
  },
  collaborators: {
    title: "Equipe e Acessos",
    content: "Cadastre garçons, atendentes e administradores. Controle quem pode acessar cada área do sistema e acompanhe status.",
    anchorId: "guide_colaboradores"
  },
  kitchen: {
    title: "Cozinha (KDS)",
    content: "O KDS (Kitchen Display System) exibe pedidos para preparo. No modo interativo, clique no item para avançar seu status.",
    anchorId: "guide_cozinha"
  },
  menu: {
    title: "Cardápio Digital",
    content: "Organize seus produtos e categorias. Vincule insumos via ficha técnica para baixa automática no estoque ao realizar vendas.",
    anchorId: "guide_cardapio"
  },
  finance: {
    title: "Caixa Diário",
    content: "Abertura e fechamento de caixa, registro de troco inicial, sangrias (retiradas) e suprimentos (reforços).",
    anchorId: "guide_caixa"
  },
  reports: {
    title: "Relatórios Financeiros",
    content: "Histórico consolidado de faturamento, vendas por categoria e fluxo detalhado de pagamentos para conferência contábil.",
    anchorId: "guide_caixa"
  },
  stock: {
    title: "Estoque e Insumos",
    content: "Controle de insumos com alertas de quantidade mínima. Registre entradas e perdas, e vincule aos produtos do cardápio.",
    anchorId: "guide_estoque"
  },
  settings: {
    title: "Configurações",
    content: "Central de ajustes: defina as mesas do salão, cadastre impressoras térmicas, acesse o link de comandas e gerencie o backup.",
    anchorId: "guide_config"
  },
  customers: {
    title: "Gestão de Clientes",
    content: "Use este módulo para cadastrar clientes fiéis, acompanhar histórico de consumo e registrar preferências para melhorar o atendimento.",
    anchorId: "guide_clientes"
  },
  suppliers: {
    title: "Parceiros e Fornecedores",
    content: "Centralize o contato dos seus fornecedores. Acompanhe termos de pagamento e defina fornecedores preferenciais por insumo.",
    anchorId: "guide_fornecedores"
  },
  security: {
    title: "Segurança e Auditoria",
    content: "Histórico imutável de logs. Monitore acessos, exclusões críticas e alterações de configurações para garantir a segurança da operação.",
    anchorId: "guide_seguranca"
  },
  support: {
    title: "Suporte e Relatos",
    content: "Canal de comunicação para dúvidas e avisos de melhorias. Envie logs diretamente para a equipe técnica em caso de falha.",
    anchorId: "guide_suporte"
  },
  evolution: {
    title: "Centro de Evolução",
    content: "Acompanhe as atualizações do Gestão Gastro. Veja as notas de versão, novos recursos lançados e o roadmap futuro do sistema.",
    anchorId: "guide_evolucao"
  },
  manual: {
    title: "Academia e Manual",
    content: "Documentação completa de uso. Explore o Roteiro do Primeiro Dia, dicas profissionais e guias detalhados de cada módulo.",
    anchorId: "guide_manual"
  }
};

interface PanelPosition {
  top: number;
  left: number;
  openAbove: boolean;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = (props) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [visible, setVisible] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPosition>({ top: 0, left: 0, openAbove: true });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const helpData = {
    title: props.title || (props.moduleKey && HELP_CONTENTS[props.moduleKey] ? HELP_CONTENTS[props.moduleKey].title : "Ajuda"),
    content: props.content || (props.moduleKey && HELP_CONTENTS[props.moduleKey] ? HELP_CONTENTS[props.moduleKey].content : 'Ajuda do módulo.'),
    anchorId: props.anchorId || (props.moduleKey && HELP_CONTENTS[props.moduleKey] ? HELP_CONTENTS[props.moduleKey].anchorId : 'guide_pdv')
  };

  const openTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  /** Calcula a posição do painel com base no botão, abrindo acima ou abaixo conforme espaço. */
  const computePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = 224; // 14rem = w-56
    const panelHeight = 120; // estimativa
    const GAP = 8;
    const VIEWPORT_PADDING = 12;

    const openAbove = rect.top > panelHeight + GAP;
    const top = openAbove
      ? rect.top - panelHeight - GAP
      : rect.bottom + GAP;

    // Centralizar horizontalmente no botão, com clamp nos limites da viewport
    const idealLeft = rect.left + rect.width / 2 - panelWidth / 2;
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(idealLeft, window.innerWidth - panelWidth - VIEWPORT_PADDING)
    );

    setPanelPos({ top, left, openAbove });
  }, []);

  const open = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      computePosition();
      setVisible(true);
    }, 150);
  }, [computePosition]);

  const close = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 200);
  }, []);

  const closeImmediately = useCallback(() => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setVisible(false);
  }, []);

  const toggle = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

    if (visible) {
      setVisible(false);
    } else {
      computePosition();
      setVisible(true);
    }
  }, [visible, computePosition]);

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Fecha ao pressionar Escape
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeImmediately(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, closeImmediately]);

  // Fecha ao clicar fora do painel e do botão
  useEffect(() => {
    if (!visible) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        closeImmediately();
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [visible, closeImmediately]);

  // Recalcula posição ao rolar ou redimensionar
  useEffect(() => {
    if (!visible) return;
    const update = () => computePosition();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [visible, computePosition]);

  const handleNavigateToManual = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeImmediately();
    window.location.hash = helpData.anchorId;
    if ((window as any).setCurrentGastroView) {
      (window as any).setCurrentGastroView('manual');
      setTimeout(() => {
        const element = document.getElementById(helpData.anchorId);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handlePanelMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  };

  const handlePanelMouseLeave = () => {
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  const panel = visible
    ? createPortal(
        <div
          ref={panelRef}
          role="tooltip"
          onMouseEnter={handlePanelMouseEnter}
          onMouseLeave={handlePanelMouseLeave}
          style={{
            position: 'fixed',
            top: panelPos.top,
            left: panelPos.left,
            zIndex: 9999,
            width: '14rem',
          }}
          className={`p-3 rounded-lg border shadow-2xl text-[11px] font-medium leading-relaxed
            animate-in fade-in zoom-in-95 duration-150
            ${isDark
              ? 'bg-[#1C1C1E] border-[#3A3A3C] text-white/90'
              : 'bg-white border-gray-200 text-gray-800'
            }`}
        >
          <h4 className="font-bold uppercase tracking-widest text-[9px] text-accent mb-1.5 opacity-80">{helpData.title}</h4>
          <p className="whitespace-normal text-left opacity-90">{helpData.content}</p>
          <div className="mt-3 pt-3 border-t border-current/5 flex justify-end">
            <button
              type="button"
              onClick={handleNavigateToManual}
              className="flex items-center justify-center w-full sm:w-auto gap-1.5 px-3 py-2 bg-accent text-white rounded font-bold uppercase tracking-wider text-[9px] hover:bg-accent/90 transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
            >
              Ver no Manual
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Ajuda e explicações do sistema"
        aria-expanded={visible}
        className="inline-flex items-center text-[#475569]/60 hover:text-accent focus:outline-none transition-colors cursor-help p-0.5 ml-1.5 shrink-0 align-middle"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onKeyDown={handleKeyDown}
        onClick={() => toggle()}
        onTouchEnd={e => { e.preventDefault(); toggle(); }}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {panel}
    </>
  );
};
