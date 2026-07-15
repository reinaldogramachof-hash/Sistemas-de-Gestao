import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../store/AppContext';

interface HelpTooltipProps {
  moduleKey?: 'dashboard' | 'pdv' | 'tables' | 'waiters' | 'kitchen' | 'menu' | 'finance' | 'stock' | 'settings';
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
    title: "Mesas e Comandas",
    content: "O painel de mesas gerencia o estado operacional do salão (mesas livres, ocupadas ou reservadas) e pedidos de comanda em tempo real.",
    anchorId: "guide_pdv"
  },
  waiters: {
    title: "Garçons",
    content: "Aqui você acompanha o faturamento gerado por cada garçom e a produtividade operacional em tempo real.",
    anchorId: "guide_pdv"
  },
  kitchen: {
    title: "Cozinha (KDS)",
    content: "O KDS (Kitchen Display System) exibe os pedidos em andamento na cozinha com atualização instantânea para os preparadores.",
    anchorId: "guide_pdv"
  },
  menu: {
    title: "Cardápio",
    content: "Cadastre, edite e organize os pratos, bebidas e categorias do seu cardápio que ficarão disponíveis para PDV e garçons.",
    anchorId: "guide_cardapio"
  },
  finance: {
    title: "Financeiro",
    content: "Módulo financeiro para acompanhamento do faturamento diário, sangrias, suprimentos de caixa e fluxo de despesas.",
    anchorId: "guide_financeiro"
  },
  stock: {
    title: "Estoque",
    content: "Controle o estoque de insumos e produtos, cadastre fornecedores e configure alertas de estoque mínimo.",
    anchorId: "guide_cardapio"
  },
  settings: {
    title: "Configurações",
    content: "Configurações gerais do restaurante: dados da empresa, mesas do salão, IP local de desenvolvimento e impressoras térmicas.",
    anchorId: "guide_config"
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
