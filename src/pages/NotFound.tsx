import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

/**
 * Rota inexistente.
 *
 * ── O cartão passou a ser o primitivo ────────────────────────────────
 *
 * Era um `<div>` com `rounded-xl border border-borda bg-superficie` — as mesmas
 * classes que o `Card` produz — e `px-8 py-10` de respiro, que **a escala do
 * primitivo não sabe produzir** (`p-0 / p-3 / p-4 / p-6`).
 *
 * Um cartão montado à mão é uma cópia das DECISÕES do primitivo, e esta tinha
 * derivado: 32px na horizontal e 40 na vertical, assimétrico e fora de qualquer
 * degrau. Ninguém veria, porque a tela sozinha parece certa.
 *
 * Vai a `lg`, e **o enquadramento da página vem do layout** — o `py-10` do
 * contêiner de fora. O cartão não deve carregar a moldura da página; carregar
 * era exatamente o que produzia o `py-10` dentro dele.
 *
 * ── O `<Link>` fica como está, e o motivo ────────────────────────────
 *
 * Ele parece um botão primário e não é: `Button` estende
 * `ButtonHTMLAttributes` e renderiza `<button>`, sem variante de link. Trocar
 * custaria clique do meio, `ctrl+clique` e "abrir em nova aba" — **regressão
 * funcional**, e das que nenhuma captura mostraria.
 *
 * É a única ocorrência no projeto de link vestido de botão cheio. Fica anotada
 * em vez de contornada.
 */
const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card padding="lg" className="w-full max-w-md text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-sinal">404</h1>

        <p className="mt-3 text-sm text-conteudo-suave">Página não encontrada.</p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-sinal px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] transition-colors hover:brightness-110"
        >
          Voltar ao Dashboard
        </Link>
      </Card>
    </div>
  );
};

export default NotFound;
