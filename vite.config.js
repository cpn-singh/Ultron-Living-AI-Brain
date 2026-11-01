import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const enableHttps = process.env.VITE_HTTPS === 'true' || process.env.HTTPS === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(enableHttps ? [basicSsl()] : [])
  ],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/nvidia-api': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nvidia-api/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          lucide: ['lucide-react'],
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
