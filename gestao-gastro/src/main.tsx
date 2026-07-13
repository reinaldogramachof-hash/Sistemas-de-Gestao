import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Roteamento simples por pathname — sem dependência de react-router.
// /comanda  → Tela exclusiva do garçom mobile (sem Layout administrativo)
// qualquer outra rota → App administrativo normal

const pathname = window.location.pathname;
const isComandaRoute = pathname === '/comanda' || pathname.startsWith('/comanda/');

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
