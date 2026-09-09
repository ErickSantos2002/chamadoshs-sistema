import React from 'react';
import { useNavigate } from 'react-router-dom';
import NovoChamadoForm from '../components/NovoChamadoForm';
import { IconeVoltar } from '../components/ui/icones';
import { Card } from '../components/ui';

/**
 * Abertura de chamado em página inteira.
 *
 * O caminho normal virou o modal do quadro, mas a rota continua: é o que
 * responde por link direto, por favorito e por celular, onde um formulário
 * dentro de modal fica espremido.
 *
 * ── O cartão do formulário virou primitivo ───────────────────
 *
 * Era `p-5` — 20px, **fora da escala do `Card`** (`p-0 / p-3 / p-4 / p-6`). Vai a
 * `lg` e não a `md`: é formulário de página inteira, um por tela, e 16px
 * apertariam campos que já ocupam a largura toda.
 *
 * O bloco de cima **não virou `Card`**: contém "Voltar", título e subtítulo, e
 * pelo critério do operador é barra que organiza a página, e não cartão que
 * carrega um item.
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

      <Card padding="lg">
        <NovoChamadoForm
          aoCriar={(chamado) => navigate(`/chamados/${chamado.id}`)}
          aoCancelar={() => navigate('/chamados')}
        />
      </Card>
    </div>
  );
};

export default NovoChamado;
