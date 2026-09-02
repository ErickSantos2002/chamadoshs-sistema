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

    /**
     * O piso de navegador do projeto, declarado — regra (c) do D8-a.
     *
     * O `tailwind.config.js` declara as cores do pacote com `color-mix`, que
     * exige Chrome/Edge 111, Firefox 113 e Safari 16.2. Antes desta linha o
     * padrão que o Vite 7 resolvia aqui era
     * `["chrome107","edge107","firefox104","safari16"]` — ABAIXO do piso, em
     * toda linha, e nada avisava.
     *
     * Isto NÃO conserta nada por si: o esbuild não sabe rebaixar `color-mix`
     * (nem tenta, nem avisa; quem saberia é o `lightningcss`, que não está
     * instalado). O que a linha faz é parar de MENTIR sobre o alvo, e servir
     * de único lugar a mexer se o piso mudar. `build.cssTarget` segue o
     * `target` quando não é declarado à parte.
     *
     * O que roda abaixo do piso está na regra (d) do D8-a: os três elementos
     * que quebrariam de forma visível — véu da gaveta, item ativo da barra e
     * trilho do interruptor — usam o token direto e não dependem disto.
     */
    target: ['chrome111', 'edge111', 'firefox113', 'safari16.2'],
  },
  test: {
    // jsdom porque os testes dos interceptors dependem de localStorage e
    // window.location, que não existem no ambiente node.
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
  },
})
