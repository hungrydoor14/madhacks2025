import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend'),
      '@/lib': path.resolve(__dirname, './frontend/lib'),
      '@/components': path.resolve(__dirname, './frontend/components'),
      '@/ui': path.resolve(__dirname, './frontend/ui'),
    },
  },
  server: {
  host: "0.0.0.0",
  port: 5173,
  allowedHosts: [
    "10.140.209.0",   // your LAN IP
    "localhost",
    "127.0.0.1"
  ],
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
    },
    '/ocr': {
      target: 'http://localhost:5001',
      changeOrigin: true,
    },
    '/uploads': {
      target: 'http://localhost:5001',
      changeOrigin: true,
    },
  },
},

});

