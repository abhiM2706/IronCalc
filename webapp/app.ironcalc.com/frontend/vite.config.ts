import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['../../../'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/models': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
  },
  optimizeDeps: {
    exclude: ['@ironcalc/wasm']
  },
  build: {
    rollupOptions: {
      external: ['@ironcalc/wasm']
    }
  }
})
