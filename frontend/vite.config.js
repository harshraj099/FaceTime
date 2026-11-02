import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    // forward API calls to the Spring Boot backend during development
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: './src/test/setup.js',
    env: {
      VITE_STREAM_API_KEY: 'test-stream-key',
      VITE_BASE_URL: 'http://localhost:3000',
      VITE_API_URL: '',
    },
  },
});
