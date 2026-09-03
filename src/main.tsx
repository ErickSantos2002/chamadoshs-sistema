// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChamadosProvider } from './context/ChamadosContext';
import './styles/index.css'; // Importa o Tailwind e estilos globais

/**
 * As páginas de `/dev/` recebem o tema pela URL, ANTES da primeira pintura.
 *
 * ── O defeito que isto conserta ───────────────────────────────────────
 *
 * As galerias aplicavam o tema por efeito, chamando `toggleDarkMode()` depois
 * de montar. Três consequências, todas observadas:
 *
 * 1. A primeira pintura saía no tema ERRADO e trocava um quadro depois. Um
 *    screenshot tirado nesse intervalo mostra a cor errada com a legenda
 *    certa — e foi o que aconteceu: o DOM dizia `dark`, a tela estava clara e
 *    o painel dizia "claro".
 * 2. `toggleDarkMode` INVERTE. Sob o `StrictMode`, que monta e remonta cada
 *    efeito, ele invertia duas vezes e voltava ao ponto de partida.
 * 3. A moldura e o iframe são duas instâncias do app na MESMA origem, e as
 *    duas escreviam `localStorage.theme`. Uma desfazia a outra.
 *
 * ── Como resolve ─────────────────────────────────────────────────────
 *
 * Aqui, antes do `createRoot`, a chave é ESCRITA a partir da URL. Quando o
 * `ThemeProvider` monta, o `useState` dele lê a mesma coisa e concorda — não
 * há o que alternar, e portanto não há o que disputar: moldura e iframe
 * recebem o mesmo `tema=` e escrevem o mesmo valor.
 *
 * A classe entra no `<html>` na mesma linha, então a primeira pintura já sai
 * certa.
 *
 * `data-tema-pronto` é o sinal para quem captura: existe quando o tema foi
 * aplicado, e diz qual. O script de captura não fotografa antes de lê-lo — e
 * confere também o `backgroundColor` computado, porque atributo é promessa e
 * pixel é fato.
 *
 * Fica inteiro dentro do `import.meta.env.DEV`, que o Vite troca por `false`
 * literal: em produção o bloco não existe. Escrito aqui, e não num módulo
 * importado, justamente para não deixar rastro no grafo de produção.
 */
if (import.meta.env.DEV && location.pathname.startsWith('/dev/')) {
  const tema = new URLSearchParams(location.search).get('tema');
  if (tema === 'claro' || tema === 'escuro') {
    const escuro = tema === 'escuro';
    try {
      localStorage.setItem('theme', escuro ? 'dark' : 'light');
    } catch {
      // Janela anônima ou storage bloqueado: a classe abaixo ainda vale para
      // esta pintura, e é o que a captura precisa.
    }
    document.documentElement.classList.toggle('dark', escuro);
    document.documentElement.dataset.temaPronto = tema;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <ChamadosProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ChamadosProvider>
        </AuthProvider>
      </ThemeProvider>
  </React.StrictMode>,
);
