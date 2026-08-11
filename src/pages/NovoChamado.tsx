import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NovoChamadoForm from '../components/NovoChamadoForm';

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
    <div className="min-h-full bg-superficie-base transition-colors">
      <div className="mx-auto max-w-3xl p-6">
        <button
          onClick={() => navigate('/chamados')}
          className="mb-4 flex items-center gap-1 text-sm text-conteudo-suave transition-colors hover:text-info"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </button>

        <div className="rounded-xl border border-borda bg-superficie p-6 shadow-sm">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-conteudo">Novo Chamado</h1>
          <p className="mb-6 text-sm text-conteudo-tenue">
            Quanto mais claro o relato, menos idas e vindas até a solução.
          </p>

          <NovoChamadoForm
            aoCriar={(chamado) => navigate(`/chamados/${chamado.id}`)}
            aoCancelar={() => navigate('/chamados')}
          />
        </div>
      </div>
    </div>
  );
};

export default NovoChamado;
