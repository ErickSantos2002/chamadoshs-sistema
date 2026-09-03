import React from 'react';
import { Badge, type VarianteBadge } from './ui';
import { PrioridadeEnum, StatusEnum } from '../types/api';

/**
 * O mapa de status e prioridade do ChamadosHS, num lugar só.
 *
 * ── Por que existe ────────────────────────────────────────────────────
 *
 * A §16 exige o mapeamento explícito **status de domínio → variante
 * semântica**, e exige que ele seja apresentado para aprovação no Checkpoint 2.
 * Este é o mapa aprovado pelo operador em 03/09/2026.
 *
 * Antes dele havia **três cópias** do mapa de prioridade, escritas à mão em
 * `ChamadoModal`, `KanbanColumn` e `cadastros/SlaTab` — idênticas, e portanto
 * três chances de divergirem —, mais **sete selos** de "Cancelado" e
 * "Arquivado" escritos direto no ponto de uso, com a variante decidida ali.
 *
 * Um mapa copiado é uma decisão que vale até alguém mexer em uma das cópias. É
 * o mesmo defeito que `lib/navegacao.ts` existe para ter resolvido no menu.
 *
 * ── O mapa, e o que ele traduz ────────────────────────────────────────
 *
 * A API tem cinco status e dois booleanos (`cancelado`, `arquivado`), que não
 * são status: um chamado cancelado continua tendo o status em que estava. Por
 * isso "Cancelado" e "Arquivado" são selos SEPARADOS, mostrados ao lado, e não
 * valores do mesmo mapa.
 *
 * | Status da API  | Variante daqui | Pacote (§16) |
 * |----------------|----------------|--------------|
 * | Aberto         | `info`         | `info`       |
 * | Em Andamento   | `principal`    | `primary`    |
 * | Aguardando     | `alerta`       | `warning`    |
 * | Resolvido      | `sucesso`      | `success`    |
 * | Fechado        | `discreto`     | `muted`      |
 * | *(cancelado)*  | `perigo`       | `danger`     |
 * | *(arquivado)*  | `neutro`       | `secondary`  |
 *
 * | Prioridade | Variante    | Pacote (§16) |
 * |------------|-------------|--------------|
 * | Crítica    | `perigo`    | `danger`     |
 * | Alta       | `alerta`    | `warning`    |
 * | Média      | `info`      | `info`       |
 * | Baixa      | `discreto`  | `muted`      |
 *
 * **O que mudou em relação ao mapa antigo**, e é visível na tela:
 *
 * - `Em Andamento` era `info`, igual a `Aberto` — dois status na mesma cor.
 * - `Fechado` era `sucesso`, igual a `Resolvido` — idem.
 * - `Aguardando` era `neutro`; a §16 pede `warning`, porque aguardar é estado
 *   que pede ação de alguém, não estado neutro.
 * - `Baixa` era `neutro`, agora `discreto` — que hoje renderiza igual, mas diz
 *   outra coisa (ver a nota sobre a E6 no `Badge`).
 *
 * ── O rótulo vem da API, não daqui ────────────────────────────────────
 *
 * `StatusEnum.ABERTO` **é** a string `'Aberto'`. A §16 traz rótulos oficiais
 * ligeiramente diferentes ("Em andamento", "Baixo"), mas a §30 proíbe
 * reescrever rótulo que a tela já mostra, e trocá-los aqui mudaria o texto de
 * onze telas sem pedido de ninguém. O rótulo continua sendo o valor do enum.
 *
 * `src/types/api.ts` não muda: os valores são o contrato com a API.
 */
export const VARIANTE_DE_STATUS: Record<StatusEnum, VarianteBadge> = {
  [StatusEnum.ABERTO]: 'info',
  [StatusEnum.EM_ANDAMENTO]: 'principal',
  [StatusEnum.AGUARDANDO]: 'alerta',
  [StatusEnum.RESOLVIDO]: 'sucesso',
  [StatusEnum.FECHADO]: 'discreto',
};

export const VARIANTE_DE_PRIORIDADE: Record<PrioridadeEnum, VarianteBadge> = {
  [PrioridadeEnum.CRITICA]: 'perigo',
  [PrioridadeEnum.ALTA]: 'alerta',
  [PrioridadeEnum.MEDIA]: 'info',
  [PrioridadeEnum.BAIXA]: 'discreto',
};

/** As duas marcas que não são status: vêm de booleano, e aparecem ao lado. */
const MARCAS = {
  cancelado: { variante: 'perigo', rotulo: 'Cancelado' },
  arquivado: { variante: 'neutro', rotulo: 'Arquivado' },
} as const satisfies Record<string, { variante: VarianteBadge; rotulo: string }>;

export type Marca = keyof typeof MARCAS;

interface SeloProps {
  className?: string;
}

/** Estado do chamado — o rótulo e a cor saem do próprio status. */
export const StatusBadge: React.FC<SeloProps & { status: StatusEnum }> = ({
  status,
  className,
}) => (
  <Badge variante={VARIANTE_DE_STATUS[status]} className={className}>
    {status}
  </Badge>
);

/** Prioridade do chamado. */
export const PrioridadeBadge: React.FC<
  SeloProps & { prioridade: PrioridadeEnum }
> = ({ prioridade, className }) => (
  <Badge variante={VARIANTE_DE_PRIORIDADE[prioridade]} className={className}>
    {prioridade}
  </Badge>
);

/**
 * "Cancelado" ou "Arquivado".
 *
 * Existe para o rótulo e a cor pararem de ser decididos no ponto de uso —
 * eram sete lugares, e nada impedia o oitavo de escolher outra variante.
 */
export const MarcaBadge: React.FC<SeloProps & { marca: Marca }> = ({
  marca,
  className,
}) => (
  <Badge variante={MARCAS[marca].variante} className={className}>
    {MARCAS[marca].rotulo}
  </Badge>
);
