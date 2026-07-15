import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  return {
    base: '/gestao-gastro/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-512x512.png', 'favicon.ico', 'robots.txt'],
        manifest: {
          name: 'Gestão Gastro',
          short_name: 'Gastro',
          lang: 'pt-BR',
          description: 'Sistema Profissional de Gestão para Bares e Restaurantes',
          theme_color: '#121214',
          background_color: '#121214',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        '/api_licenca_ml.php': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/api_admin_users.php': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
      hmr: {
        protocol: 'wss',
        clientPort: 443 // Vercel/Production uses 443 for wss
      }
    },
  };
});
