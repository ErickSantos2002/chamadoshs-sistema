import React from 'react';
import { Helmet } from 'react-helmet';

interface EmConstrucaoProps {
  titulo: string;
}

const EmConstrucao: React.FC<EmConstrucaoProps> = ({ titulo }) => {
  return (
    // `min-h-full` em vez de `calc(100vh - 80px)`: aqueles 80px eram a altura
    // presumida do cabeçalho, que muda quando ele quebra em duas linhas em
    // tela estreita. Como o `main` já define a área disponível, preencher o
    // pai dispensa saber quanto o cabeçalho ocupa.
    <div
      className="flex min-h-full flex-col items-center justify-center text-center
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
