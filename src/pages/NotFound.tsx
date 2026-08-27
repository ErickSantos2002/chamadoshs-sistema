import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-borda bg-superficie px-8 py-10 text-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-sinal">404</h1>

        <p className="mt-3 text-sm text-conteudo-suave">Página não encontrada.</p>

        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-sinal px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110 dark:text-superficie-base"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
