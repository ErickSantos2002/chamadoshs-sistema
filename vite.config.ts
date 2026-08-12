/// <reference types="vitest" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// A versão vem do package.json e é embutida no bundle. É o que permite o aviso
// de novidades saber o que está rodando — antes o número existia só no arquivo
// e nada no sistema o consultava.
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __VERSAO_APP__: JSON.stringify(version),
  },
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
