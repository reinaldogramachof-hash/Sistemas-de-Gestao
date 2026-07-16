import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { CANTINHO_DA_RESENHA_SLUG, getClientRouteFromPath } from './config/clientRoutes';

// Roteamento simples por pathname — sem dependência de react-router.
// /comanda  → Tela exclusiva do garçom mobile (sem Layout administrativo)
// /gestao-gastro/[slug]/comanda → Tela do garçom para o cliente específico
// qualquer outra rota → App administrativo normal

const pathname = window.location.pathname;
const clientRoute = getClientRouteFromPath(pathname);
const isGestaoGastroRoute =
  pathname === '/gestao-gastro' ||
  pathname === '/gestao-gastro/' ||
  pathname.startsWith('/gestao-gastro/');
const isMissingClientRoute = isGestaoGastroRoute && !clientRoute;

const isStandaloneComandaRoute =
  pathname === '/comanda' ||
  pathname.startsWith('/comanda/');

const isClientComandaRoute =
  clientRoute?.slug === CANTINHO_DA_RESENHA_SLUG &&
  (
    pathname === clientRoute.comandaPath ||
    pathname.startsWith(`${clientRoute.comandaPath}/`)
  );

const isComandaRoute = isStandaloneComandaRoute || isClientComandaRoute;

if (isMissingClientRoute) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div className="min-h-screen bg-[#121214] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Gestao Gastro</p>
          <h1 className="text-2xl font-black tracking-tight">Cliente nao identificado</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Acesse o sistema pelo caminho do cliente, como /gestao-gastro/cantinhodaresenha.
          </p>
        </div>
      </div>
    </StrictMode>,
  );
} else if (isComandaRoute) {
  // Importação dinâmica para não incluir o Bundle admin no chunk do garçom
  import('./components/ComandaMobileApp').then(({ ComandaMobileApp }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ComandaMobileApp />
      </StrictMode>,
    );
  });
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
