/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    // jsdom porque os testes dos interceptors dependem de localStorage e
    // window.location, que não existem no ambiente node.
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
  },
})
