import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          injectRegister: 'auto',
          registerType: 'autoUpdate',
          manifest: {
            name: 'FutScore — Manager',
            short_name: 'FutScore',
            description: 'Organize peladas, monte times e compartilhe partidas com facilidade.',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            theme_color: '#05080f',
            background_color: '#05080f',
            icons: [
              {
                src: '/logo.svg',
                sizes: 'any',
                type: 'image/svg+xml',
              },
            ],
          },
          workbox: {
            navigateFallback: '/index.html',
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
