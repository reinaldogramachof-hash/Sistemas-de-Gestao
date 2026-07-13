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

if (isComandaRoute) {
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
