import React from 'react';
import { Chamado, Categoria, PrioridadeEnum, Usuario } from '../types/api';
import { precisaAvaliar } from '../utils/avaliacao';
import { cn } from '../lib/utils';
import { Avatar, Badge, VarianteBadge } from './ui';
import SlaProgresso from './SlaProgresso';
import { IconeEstrela } from './ui/icones';

interface KanbanColumnProps {
  title: string;
  /** Uma linha explicando o que o status significa na prática. */
  descricao: string;
  /** Cor do ponto, em hexadecimal. Vem de `corDoStatus`, para o quadro e o
   *  painel não poderem divergir sobre a cor do mesmo status. */
  colorDot: string;
  items: Chamado[];
  usuarios: Record<number, Usuario>;
  categorias: Categoria[];
  /** Abre o chamado. O quadro decide se é modal ou navegação. */
  aoAbrir: (chamado: Chamado) => void;
  /** Quem está logado, para saber de quem pedir avaliação. */
  usuarioLogadoId?: number;
}

/**
 * A prioridade usa a cor de significado, não uma escala própria: crítica é
 * vermelho porque é perigo, alta é âmbar porque é alerta. Assim o card inteiro
 * fala a mesma língua do resto da interface.
 */
const VARIANTE_PRIORIDADE: Record<PrioridadeEnum, VarianteBadge> = {
  [PrioridadeEnum.CRITICA]: 'perigo',
  [PrioridadeEnum.ALTA]: 'alerta',
  [PrioridadeEnum.MEDIA]: 'info',
  [PrioridadeEnum.BAIXA]: 'neutro',
};

const PONTO_PRIORIDADE: Record<PrioridadeEnum, string> = {
  [PrioridadeEnum.CRITICA]: 'bg-perigo',
  [PrioridadeEnum.ALTA]: 'bg-alerta',
  [PrioridadeEnum.MEDIA]: 'bg-info',
  [PrioridadeEnum.BAIXA]: 'bg-conteudo-tenue',
};

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  descricao,
  colorDot,
  items,
  usuarios,
  categorias,
  aoAbrir,
  usuarioLogadoId,
}) => {
  const nomeDaCategoria = (id?: number): string | null => {
    if (id === undefined) return null;
    return categorias.find((c) => c.id === id)?.nome ?? null;
  };

  return (
    <div className="flex flex-col rounded-xl border border-borda bg-superficie-base/60">
      {/* Cabeçalho */}
      <div className="border-b border-borda px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-conteudo">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: colorDot }}
            />
            {title}
          </h3>
          <span className="rounded-full bg-superficie-elevada px-2 py-0.5 text-xs font-semibold text-conteudo-suave">
            {items.length}
          </span>
        </div>
        <p className="mt-0.5 pl-4 text-xs text-conteudo-tenue">{descricao}</p>
      </div>

      {/* Cards */}
      {/* Teto proporcional à tela, não `calc(100vh - 400px)`.
          Aqueles 400px eram uma medida chutada do cabeçalho mais os filtros
          mais a barra de busca. Numa tela de 600px de altura sobravam 200px de
          coluna; abaixo de 400px o resultado é negativo, vira zero, e a coluna
          deixa de mostrar qualquer card — sem erro, sem aviso.
          Com `vh` o valor acompanha a tela e nunca chega a zero. O `main` já
          rola por fora, então este teto serve só para manter o cabeçalho da
          coluna à vista. */}
      <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-conteudo-tenue">Nenhum chamado</p>
        ) : (
          items.map((chamado) => {
            const responsavel = chamado.tecnico_responsavel_id
              ? usuarios[chamado.tecnico_responsavel_id]?.nome
              : null;
            const categoria = nomeDaCategoria(chamado.categoria_id);

            return (
              <button
                key={chamado.id}
                type="button"
                onClick={() => aoAbrir(chamado)}
                className="w-full space-y-2 rounded-lg border border-borda bg-superficie p-3 text-left
                           transition-all hover:border-info/50 hover:shadow-md
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info"
              >
                {/* Protocolo e prioridade */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-conteudo-tenue">
                    {chamado.protocolo}
                  </span>
                  <span
                    title={`Prioridade ${chamado.prioridade}`}
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      PONTO_PRIORIDADE[chamado.prioridade]
                    )}
                  />
                </div>

                {/* Título */}
                <h4 className="line-clamp-2 font-semibold leading-snug text-conteudo">
                  {chamado.titulo}
                </h4>

                {/* Categoria, prioridade e responsável */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {categoria && (
                    <Badge variante="neutro" className="font-normal">
                      {categoria}
                    </Badge>
                  )}
                  <Badge variante={VARIANTE_PRIORIDADE[chamado.prioridade]}>
                    {chamado.prioridade}
                  </Badge>

                  {/* Mesmas palavras e mesmas variantes que a janela do chamado
                      usa. Dentro das colunas "Arquivado" e "Cancelado" o selo é
                      redundante, e tudo bem: ele existe para quando o card
                      aparece numa busca, onde a coluna não está à vista como
                      contexto.

                      Os dois aparecem juntos quando as duas marcas estão
                      ligadas. O card fica no arquivo, mas o cancelamento não
                      pode sumir junto — é o que explica por que aquele chamado
                      nunca foi atendido. */}
                  {chamado.arquivado && (
                    <Badge variante="neutro">Arquivado</Badge>
                  )}

                  {chamado.cancelado && (
                    <Badge variante="perigo">Cancelado</Badge>
                  )}

                  {precisaAvaliar(chamado, usuarioLogadoId) && (
                    <Badge variante="alerta">
                      <IconeEstrela className="h-3 w-3" aria-hidden="true" />
                      Avaliar
                    </Badge>
                  )}

                  <span className="ml-auto">
                    <Avatar
                      nome={responsavel}
                      title={responsavel ? `Responsável: ${responsavel}` : 'Sem responsável'}
                    />
                  </span>
                </div>

                <SlaProgresso sla={chamado.sla} status={chamado.status} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
