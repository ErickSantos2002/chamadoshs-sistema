import React from 'react';
import { Chamado, Categoria, PrioridadeEnum, Usuario } from '../types/api';
import { precisaAvaliar } from '../utils/avaliacao';
import { cn } from '../lib/utils';
import { Avatar, Badge } from './ui';
import { MarcaBadge, PrioridadeBadge } from './SelosDeChamado';
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
const PONTO_PRIORIDADE: Record<PrioridadeEnum, string> = {
  [PrioridadeEnum.CRITICA]: 'bg-perigo',
  [PrioridadeEnum.ALTA]: 'bg-alerta',
  [PrioridadeEnum.MEDIA]: 'bg-info',
  [PrioridadeEnum.BAIXA]: 'bg-conteudo-tenue',
};

/**
 * A mesma prioridade, na borda esquerda do cartão.
 *
 * É a marca que o quadro do HelpHS usa, e ela resolve um problema real: num
 * quadro com vinte cartões, um ponto de 8px no canto superior direito não é
 * lido de relance. Uma faixa de 4px na lateral é.
 *
 * O ponto continua ali, ao lado do protocolo, como reforço visual da mesma
 * cor. Quem informa é o `PrioridadeBadge`, no corpo do cartão, com a palavra
 * escrita — a faixa e o ponto são cor, e cor sozinha não informa.
 *
 * A versão anterior desta nota dizia que o ponto carregava um `title` com o
 * nome da prioridade, e era nele que a §16 se apoiava. Não servia: `title` em
 * `<span>` sem papel nem foco é dica de mouse, não aparece no toque nem pelo
 * teclado, e o suporte dos leitores de tela a ele é irregular. O selo, que
 * entrou depois, resolveu de verdade — e o `title` virou uma segunda fonte
 * para o mesmo dado. Saiu; o ponto é `aria-hidden`.
 */
const BORDA_PRIORIDADE: Record<PrioridadeEnum, string> = {
  [PrioridadeEnum.CRITICA]: 'border-l-perigo',
  [PrioridadeEnum.ALTA]: 'border-l-alerta',
  [PrioridadeEnum.MEDIA]: 'border-l-info',
  [PrioridadeEnum.BAIXA]: 'border-l-borda',
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
    <div className="flex h-full min-w-[268px] flex-col overflow-hidden rounded-xl border border-borda bg-superficie-elevada">
      {/* Cabeçalho */}
      {/* A cor do status pinta a faixa de baixo, no lugar da régua cinza,
          e tinge o fundo do cabeçalho em 5%. São seis colunas lado a lado: sem
          nenhuma cor no topo, distinguir uma da outra exige ler o título. */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ backgroundColor: `${colorDot}0D` }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-conteudo">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: colorDot }}
            />
            {title}
          </h3>
          {/* O contador fica na superfície de card: a coluna já é a superfície
              recuada, e uma pastilha da mesma cor do fundo não seria pastilha. */}
          <span className="shrink-0 rounded-full bg-superficie px-2 py-0.5 text-xs font-semibold text-conteudo-suave">
            {items.length}
          </span>
        </div>
        <p className="mt-0.5 pl-4 text-xs text-conteudo-tenue">{descricao}</p>
      </div>

      {/* A régua da coluna, na cor cheia do status. Substitui o
          `border-b` cinza: é o que dá a faixa colorida no topo de cada
          coluna do quadro de referência. */}
      <div
        aria-hidden="true"
        className="h-0.5 shrink-0"
        style={{ backgroundColor: colorDot }}
      />

      {/* Cards */}
      {/* Teto proporcional à tela, não `calc(100vh - 400px)`.
          Aqueles 400px eram uma medida chutada do cabeçalho mais os filtros
          mais a barra de busca. Numa tela de 600px de altura sobravam 200px de
          coluna; abaixo de 400px o resultado é negativo, vira zero, e a coluna
          deixa de mostrar qualquer card — sem erro, sem aviso. O teto virou
          `max-h-[60vh]`, que acompanhava a tela e nunca chegava a zero.

          Agora não há teto nenhum: a coluna preenche a raia (`h-full`) e esta
          lista fica com `min-h-0 flex-1`, ou seja, ela ocupa o que sobrar da
          altura da coluna e rola por dentro. Some a conta e some junto o
          efeito colateral do teto — com o quadro já limitado em altura pela
          casca, `60vh` criava uma SEGUNDA barra de rolagem vertical dentro da
          primeira, e deixava as seis colunas com alturas diferentes.

          `min-h-0` não é enfeite: item de flex nasce com `min-height: auto` e
          se recusa a encolher abaixo do próprio conteúdo. Sem ele, uma coluna
          cheia empurra a altura da coluna inteira em vez de rolar. */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-borda py-10 text-sm text-conteudo-tenue">
            Nenhum chamado
          </div>
        ) : (
          items.map((chamado) => {
            const responsavel = chamado.tecnico_responsavel_id
              ? usuarios[chamado.tecnico_responsavel_id]?.nome
              : null;
            const categoria = nomeDaCategoria(chamado.categoria_id);

            return (
              /*
                ── O CARTÃO ERA UM BOTÃO INTEIRO, E ISSO CUSTAVA CARO ────

                Um `<button>` envolvendo protocolo, título, três selos, avatar
                e barra de SLA tem UM nome acessível: a concatenação de tudo
                que há dentro. Quem navega por leitor de tela ouvia, de uma vez
                só, algo como "HS-4187 Impressora não imprime Financeiro Alta
                Avaliar Responsável Lidisay 80 por cento, botão" — e ouvia
                isso vinte vezes seguidas ao percorrer uma coluna cheia.

                Pior: sendo tudo um botão, **o título deixava de ser um
                título**. Não havia cabeçalho nenhum no quadro, e a navegação
                por cabeçalhos — que é como se percorre uma lista longa sem
                ler tudo — não tinha onde pegar.

                Agora é `<article>` com `<h4>`, e o alvo focável é só o título,
                com nome curto: "Abrir chamado HS-4187: Impressora não
                imprime". O resto do cartão continua sendo lido, mas como
                CONTEÚDO do artigo, e não como parte do nome de um controle.

                ── O cartão inteiro continua clicável, e sem JavaScript ──

                Pelo `after:absolute after:inset-0` no botão: o pseudo-elemento
                dele cobre o cartão, então o clique em qualquer ponto atinge o
                PRÓPRIO botão. Não há reencaminhamento a manter, não há risco
                de disparo duplo, e o foco de teclado cai onde a ação está.

                ── Por que botão, e não link ────────────────────────────

                Porque `aoAbrir` é uma função de efeito desconhecido daqui: o
                quadro decide se abre modal ou navega, e hoje abre modal. Um
                `<a href>` prometeria endereço, nova aba e menu de contexto que
                não existem. Quando o quadro passar a navegar, o alvo troca
                junto — é o mesmo critério que fez o "Voltar" e o "Ver
                detalhes" virarem `Link` nesta migração.
              */
              <article
                key={chamado.id}
                className={cn(
                  'relative w-full space-y-2 rounded-lg border border-l-4 border-borda bg-superficie p-3 text-left',
                  'shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                  // O anel acende quando o foco está no título lá dentro: o
                  // cartão é a moldura, e o alvo é o botão.
                  'focus-within:ring-2 focus-within:ring-[var(--focus-ring)]',
                  BORDA_PRIORIDADE[chamado.prioridade]
                )}
              >
                {/* Protocolo e prioridade */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-conteudo-tenue">
                    {chamado.protocolo}
                  </span>
                  {/*
                    Decoração, e agora dito como tal.

                    O ponto tinha `title="Prioridade Alta"`, e o `title` estava
                    fazendo dois trabalhos que não são dele. Num `<span>` sem
                    papel nem foco, `title` é dica de mouse: não aparece no
                    toque, não aparece pelo teclado, e o suporte dos leitores
                    de tela a `title` em elemento não interativo é irregular —
                    alguns leem, outros ignoram, e a configuração de quem usa
                    decide. Informação que depende disso não está informada.

                    Só que a informação não sumiu: `PrioridadeBadge` está no
                    mesmo cartão, logo abaixo, com a palavra escrita. O `title`
                    era uma segunda fonte para o mesmo dado — a que podia
                    divergir e a que ninguém garante que é lida.

                    Some o `title` e entra `aria-hidden`: o ponto passa a ser o
                    que sempre foi, o reforço visual de cor de uma informação
                    que está escrita ao lado. É o mesmo tratamento do ícone
                    dentro do `Aviso` e da faixa lateral deste cartão.
                  */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      PONTO_PRIORIDADE[chamado.prioridade]
                    )}
                  />
                </div>

                {/* Título — e o único alvo focável do cartão. */}
                <h4 className="line-clamp-2 text-sm font-medium leading-snug text-conteudo">
                  <button
                    type="button"
                    onClick={() => aoAbrir(chamado)}
                    // `after:*` estica a área de clique até as bordas do
                    // `<article>` (que é `relative`). É o que faz o cartão
                    // inteiro continuar clicável sendo o botão pequeno.
                    //
                    // `outline-none` sem anel próprio: quem desenha o foco é o
                    // `focus-within` do cartão, senão apareceriam dois anéis,
                    // um deles rente ao texto.
                    className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                  >
                    {/*
                      O prefixo é só para quem ouve, e existe para o nome do
                      alvo dizer o que ele FAZ e sobre QUAL chamado.

                      É `sr-only` e não `aria-label` de propósito: `aria-label`
                      substituiria o conteúdo, e aí o título — que é o texto na
                      tela — sairia do nome. Foi exatamente o defeito que o
                      `Seletor` acabou de corrigir. Assim o nome CONTÉM o
                      rótulo visível, que é o que a 2.5.3 pede.
                    */}
                    <span className="sr-only">
                      Abrir chamado {chamado.protocolo}:{' '}
                    </span>
                    {chamado.titulo}
                  </button>
                </h4>

                {/* Categoria, prioridade e responsável */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {categoria && (
                    <Badge variante="neutro" className="font-normal">
                      {categoria}
                    </Badge>
                  )}
                  <PrioridadeBadge prioridade={chamado.prioridade} />

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
                    <MarcaBadge marca="arquivado" />
                  )}

                  {chamado.cancelado && (
                    <MarcaBadge marca="cancelado" />
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
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
