import React from 'react';
import { SLAInfo, StatusEnum } from '../types/api';
import { formatarDuracao } from '../lib/formato';
import { cn } from '../lib/utils';
import { IconeAlerta, IconeConfereCirculo } from './ui/icones';

interface SlaProgressoProps {
  sla?: SLAInfo;
  status: StatusEnum;
}

const COR_DA_BARRA: Record<string, string> = {
  'No prazo': 'bg-sucesso',
  'Atenção': 'bg-alerta',
  'Estourado': 'bg-perigo',
};

/**
 * Barra de consumo do prazo, com a leitura em uma linha.
 *
 * Chamado em aberto mostra quanto do prazo já foi consumido. Chamado
 * encerrado troca a barra por um resumo do resultado — a barra de um chamado
 * fechado não informa nada que já não esteja dito.
 *
 * Sem SLA aplicável (prioridade sem configuração, chamado cancelado) o
 * componente não renderiza nada, em vez de mostrar uma barra vazia que se
 * parece com "no prazo".
 */
export const SlaProgresso: React.FC<SlaProgressoProps> = ({ sla, status }) => {
  if (!sla) return null;

  const encerrado = status === StatusEnum.RESOLVIDO || status === StatusEnum.FECHADO;
  const estourou = sla.situacao === 'Estourado';

  if (encerrado) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          estourou ? 'text-perigo' : 'text-sucesso'
        )}
      >
        {estourou ? (
          <IconeAlerta className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <IconeConfereCirculo className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        <span className="truncate">
          Concluído em {formatarDuracao(sla.minutos_resolucao_consumidos)}
          {' · '}
          {estourou ? 'SLA vencido' : 'no prazo'}
        </span>
      </div>
    );
  }

  // A barra satura em 100% para não vazar do card quando o prazo estourou —
  // o quanto passou já está dito no texto e no title.
  const largura = Math.min(100, Math.max(0, sla.percentual_resolucao));

  const detalhe =
    `${sla.percentual_resolucao}% do prazo consumido` +
    (sla.minutos_pausados > 0
      ? ` · ${formatarDuracao(sla.minutos_pausados)} pausados em Aguardando`
      : '');

  return (
    <div className="space-y-1" title={detalhe}>
      <div className="h-1 w-full overflow-hidden rounded-full bg-superficie-elevada">
        <div
          className={cn('h-full rounded-full transition-all', COR_DA_BARRA[sla.situacao])}
          style={{ width: `${largura}%` }}
        />
      </div>

      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          estourou ? 'text-perigo' : 'text-conteudo-tenue'
        )}
      >
        {estourou && <IconeAlerta className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        <span className="truncate">
          {estourou ? 'SLA vencido' : `${sla.percentual_resolucao}% do prazo`}
        </span>
      </div>
    </div>
  );
};

export default SlaProgresso;
