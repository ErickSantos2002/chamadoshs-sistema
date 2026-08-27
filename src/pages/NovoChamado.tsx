import React from 'react';
import { useNavigate } from 'react-router-dom';
import NovoChamadoForm from '../components/NovoChamadoForm';
import { IconeVoltar } from '../components/ui/icones';

/**
 * Abertura de chamado em página inteira.
 *
 * O caminho normal virou o modal do quadro, mas a rota continua: é o que
 * responde por link direto, por favorito e por celular, onde um formulário
 * dentro de modal fica espremido.
 */
const NovoChamado: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-borda bg-superficie px-5 py-4">
        <button
          onClick={() => navigate('/chamados')}
          className="mb-2 flex items-center gap-1.5 text-xs font-medium text-conteudo-tenue transition-colors hover:text-sinal"
        >
          <IconeVoltar className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar
        </button>
        <h1 className="text-xl font-extrabold tracking-tight text-conteudo">Novo Chamado</h1>
        <p className="mt-0.5 text-sm text-conteudo-tenue">
          Quanto mais claro o relato, menos idas e vindas até a solução.
        </p>
      </div>

      <div className="rounded-xl border border-borda bg-superficie p-5">
        <NovoChamadoForm
          aoCriar={(chamado) => navigate(`/chamados/${chamado.id}`)}
          aoCancelar={() => navigate('/chamados')}
        />
      </div>
    </div>
  );
};

export default NovoChamado;
