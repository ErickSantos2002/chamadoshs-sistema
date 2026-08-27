import React from 'react';
import { SLAInfo } from '../types/api';
import { Badge, VarianteBadge } from './ui';

interface SlaBadgeProps {
  sla?: SLAInfo;
  /** Versão compacta (sem percentual), para os cards do kanban */
  compacto?: boolean;
}

const VARIANTE: Record<string, VarianteBadge> = {
  'No prazo': 'sucesso',
  'Atenção': 'alerta',
  'Estourado': 'perigo',
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

  const variante = VARIANTE[sla.situacao] ?? VARIANTE['No prazo'];
  const titulo = `Prazo de resolução: ${formatarPrazo(sla.prazo_resolucao)} · ${sla.percentual_resolucao}% consumido${
    sla.minutos_pausados > 0 ? ` · ${sla.minutos_pausados} min pausados em Aguardando` : ''
  }`;

  return (
    <Badge variante={variante} title={titulo}>
      {sla.situacao}
      {!compacto && ` · ${sla.percentual_resolucao}%`}
    </Badge>
  );
};

export default SlaBadge;
