import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { getClientRouteFromPath, getClientSlugFromPath, getStoredClientSlug } from './config/clientRoutes';

const pathname = window.location.pathname;
const clientRoute = getClientRouteFromPath(pathname);
const clientSlug = getClientSlugFromPath(pathname);
const isGestaoGastroRoute =
  pathname === '/gestao-gastro' ||
  pathname === '/gestao-gastro/' ||
  pathname.startsWith('/gestao-gastro/');
const isMissingClientRoute = isGestaoGastroRoute && !clientSlug;
const storedClientSlug = isMissingClientRoute ? getStoredClientSlug() : null;

const isStandaloneComandaRoute =
  pathname === '/comanda' ||
  pathname.startsWith('/comanda/');

const isClientComandaRoute =
  !!clientRoute &&
  (
    pathname === clientRoute.comandaPath ||
    pathname.startsWith(`${clientRoute.comandaPath}/`)
  );

const isComandaRoute = isStandaloneComandaRoute || isClientComandaRoute;
const rootElement = document.getElementById('root');

const renderRoot = (children: ReactNode) => {
  if (!rootElement) {
    console.error('Elemento #root nao encontrado para inicializar o Gestao Gastro.');
    return;
  }

  createRoot(rootElement).render(
    <StrictMode>
      {children}
    </StrictMode>,
  );
};

if (isMissingClientRoute && storedClientSlug) {
  window.location.replace(`/gestao-gastro/${storedClientSlug}`);
} else if (isMissingClientRoute) {
  renderRoot(
    <div className="min-h-screen bg-[#121214] text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Gestao Gastro</p>
        <h1 className="text-2xl font-black tracking-tight">Cliente nao identificado</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Acesse o sistema pelo caminho do cliente, como /gestao-gastro/cantinhodaresenha.
        </p>
      </div>
    </div>,
  );
} else if (isComandaRoute) {
  import('./components/ComandaMobileApp').then(({ ComandaMobileApp }) => {
    renderRoot(<ComandaMobileApp />);
  });
} else {
  renderRoot(<App />);
}
