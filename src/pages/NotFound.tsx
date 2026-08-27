import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-superficie-base">
      <h1 className="text-6xl font-extrabold text-sinal mb-4">404</h1>
      <p className="text-xl text-conteudo-suave mb-6">Página não encontrada.</p>
      <Link
        to="/dashboard"
        className="px-6 py-2 bg-sinal text-white dark:text-superficie-base font-semibold hover:brightness-110 transition-colors"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
