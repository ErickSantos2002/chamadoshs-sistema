import React from 'react';
import { Badge, type VarianteBadge } from './ui';
import { PrioridadeEnum, StatusEnum } from '../types/api';
import { getRoleName } from '../utils/roleMapper';

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

/**
 * O papel de quem aparece na tela: Administrador, Técnico ou Usuário.
 *
 * ── Papel não é estado, e mesmo assim vinha do mesmo lugar errado ─────
 *
 * Status e prioridade descrevem o chamado; papel descreve a PESSOA, e não muda
 * quando o chamado anda. Por isso não entra no mapa da §16 — mas entrava no
 * mesmo defeito que ele existe para resolver: a cor era decidida em três
 * pontos de uso do `ChamadoDetalhes`, por um `getRoleBadgeColor` local.
 *
 * ── O que aquele `switch` estava fazendo, e não dava para ver ─────────
 *
 * ```
 * Administrador  bg-info/15 text-on-tint-info
 * Tecnico        bg-info/20 text-on-tint-info
 * ```
 *
 * A ÚNICA diferença entre os dois papéis eram **5% de alfa** sobre o mesmo
 * azul. Não é distinção discreta; é distinção que não existe — a §16 já manda
 * nunca separar por cor sozinha, e aqui nem por cor sozinha separava. Quem
 * distingue Administrador de Técnico é o rótulo, que sempre esteve escrito.
 *
 * Por isso os dois caem em `info`: é o que a tela já mostrava. `Administrador`
 * era exatamente `bg-tint-info` (a mesma cor, aos mesmos 15%); `Tecnico` era
 * 5% mais forte, e desce a esses mesmos 15%.
 *
 * O terceiro caso, `Usuario`, era `bg-superficie-elevada text-conteudo-suave`,
 * e vira `neutro` — cujo fundo `bg-tint-neutral` é o MESMO valor de
 * `--surface-elevated` (renomear, não repintar, como diz a nota do `Badge`).
 * Só o texto troca, de `--text-body` para `--on-tint-neutral`: 6,92:1, medido
 * na mesma nota, com folga sobre o piso de 4,5:1.
 *
 * ── O `default` tinha duas cores de texto na mesma string ─────────────
 *
 * ```
 * 'bg-superficie-elevada text-conteudo bg-superficie-elevada text-conteudo-suave'
 * ```
 *
 * `text-conteudo` e `text-conteudo-suave` juntas, e a classe de fundo repetida.
 * Quem vence não é a última escrita: é a que vier depois na FOLHA de estilo,
 * que nenhuma das duas controla. O resultado era "o que o Tailwind decidir" —
 * e por isso ninguém percebeu, porque uma das duas sempre aparecia.
 *
 * Aqui o desconhecido cai em `neutro`, o mesmo de `Usuario`. É deliberado e
 * casa com o `getRoleName`, que devolve `'Usuario'` para id que não conhece:
 * assim rótulo e cor não podem divergir. (O `nomeCanonicoDaRole`, ao lado
 * dele, escolheu o oposto — devolve `null` para não rebaixar em silêncio um
 * perfil novo da API. As duas decisões convivem no `roleMapper` desde antes
 * desta migração, e mudar isso é mudança funcional: fica como está.)
 */
export const VARIANTE_DE_PAPEL: Record<number, VarianteBadge> = {
  1: 'info', // Administrador
  2: 'info', // Tecnico
  3: 'neutro', // Usuario
};

export const PapelBadge: React.FC<SeloProps & { roleId: number }> = ({
  roleId,
  className,
}) => (
  <Badge variante={VARIANTE_DE_PAPEL[roleId] ?? 'neutro'} className={className}>
    {getRoleName(roleId)}
  </Badge>
);
