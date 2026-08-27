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
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Helmet>
        <title>{titulo} | ChamadosHS</title>
      </Helmet>

      <div className="w-full max-w-md rounded-xl border border-borda bg-superficie px-8 py-10 text-center">
        <h1 className="text-xl font-bold text-conteudo">Em construção</h1>

        <p className="mt-3 text-sm text-conteudo-suave">
          Em breve teremos gráficos e análises aqui para ajudar na sua tomada de
          decisão.
        </p>
      </div>
    </div>
  );
};

export default EmConstrucao;
