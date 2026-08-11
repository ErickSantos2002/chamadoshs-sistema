import React from 'react';
import { Helmet } from 'react-helmet';

interface EmConstrucaoProps {
  titulo: string;
}

const EmConstrucao: React.FC<EmConstrucaoProps> = ({ titulo }) => {
  return (
    <div
      className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4 
                bg-superficie-base transition-colors"
    >
      <Helmet>
        <title>{titulo} | ChamadosHS</title>
      </Helmet>

      <h1 className="text-4xl font-bold text-info mb-4 transition-colors">
        Em construção
      </h1>

      <p className="text-lg text-conteudo-suave max-w-md transition-colors">
        Em breve teremos gráficos e análises aqui para ajudar na sua tomada de
        decisão.
      </p>
    </div>
  );
};

export default EmConstrucao;
