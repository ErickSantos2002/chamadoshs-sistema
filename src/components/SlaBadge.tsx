import React from 'react';
import { SLAInfo } from '../types/api';

interface SlaBadgeProps {
  sla?: SLAInfo;
  /** Versão compacta (sem percentual), para os cards do kanban */
  compacto?: boolean;
}

const ESTILOS: Record<string, string> = {
  'No prazo':
    'bg-sucesso/15 text-sucesso-forte dark:text-sucesso-suave',
  'Atenção':
    'bg-alerta/15 text-alerta-forte dark:text-alerta-suave',
  'Estourado':
    'bg-perigo/15 text-perigo-forte dark:text-perigo-suave',
};

const formatarPrazo = (prazo: string | null): string => {
  if (!prazo) return 'sem prazo definido';
  return new Date(prazo).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SlaBadge: React.FC<SlaBadgeProps> = ({ sla, compacto = false }) => {
  if (!sla) return null;

  const estilo = ESTILOS[sla.situacao] ?? ESTILOS['No prazo'];
  const titulo = `Prazo de resolução: ${formatarPrazo(sla.prazo_resolucao)} · ${sla.percentual_resolucao}% consumido${
    sla.minutos_pausados > 0 ? ` · ${sla.minutos_pausados} min pausados em Aguardando` : ''
  }`;

  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${estilo}`}
    >
      {sla.situacao}
      {!compacto && ` · ${sla.percentual_resolucao}%`}
    </span>
  );
};

export default SlaBadge;
