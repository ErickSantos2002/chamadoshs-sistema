import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '../context/ThemeContext';
import { KanbanColumn } from './KanbanColumn';
import { PrioridadeEnum, StatusEnum } from '../types/api';

/**
 * O cartão do quadro, e o nome que ele anunciava.
 *
 * ── O defeito ────────────────────────────────────────────────────────
 *
 * O cartão inteiro era um `<button>`. Um botão tem UM nome acessível: a
 * concatenação de tudo que há dentro dele. Envolvendo protocolo, título, três
 * selos, avatar e barra de SLA, o nome virava uma frase longa —
 *
 *   "HS-4187 Impressora não imprime Financeiro Alta Avaliar
 *    Responsável Lidisay 80 por cento, botão"
 *
 * — e quem percorre uma coluna cheia ouvia isso vinte vezes seguidas.
 *
 * Pior: sendo tudo um botão, **o título deixava de ser um título**. O quadro
 * não tinha cabeçalho nenhum, e a navegação por cabeçalhos — que é como se
 * percorre uma lista longa sem ler tudo — não tinha onde pegar.
 *
 * ── O que estes casos travam, e o que eles NÃO alcançam ──────────────
 *
 * Travam o RESULTADO: existe um cabeçalho por cartão, o alvo focável é só o
 * título, e o nome dele diz o que faz e sobre qual chamado.
 *
 * Não alcançam o clique no cartão inteiro. Ele funciona por
 * `after:absolute inset-0` — um pseudo-elemento que estica a área do botão até
 * as bordas do artigo —, e isso é CSS. O jsdom não computa layout nem
 * pseudo-elementos, então um teste aqui mediria o ambiente e não a regra. Fica
 * dito em vez de fingido; é o mesmo motivo pelo qual a §29 do quadro conferiu
 * "funciona no mobile" por leitura.
 */

const CHAMADO = {
  id: 1,
  protocolo: 'HS-4187',
  titulo: 'Impressora não imprime',
  descricao: 'x',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: PrioridadeEnum.ALTA,
  solicitante_id: 7,
  tecnico_responsavel_id: 3,
  categoria_id: 2,
  arquivado: false,
  cancelado: false,
  avaliacao: null,
  data_abertura: '2026-09-01T10:00:00',
};

const marcacao = () =>
  renderToStaticMarkup(
    <ThemeProvider>
      <KanbanColumn
        title="Em Andamento"
        descricao="Alguém está trabalhando nisto."
        colorDot="#3B82F6"
        items={[CHAMADO as never]}
        usuarios={{ 3: { id: 3, nome: 'Lidisay', role_id: 2 } as never }}
        categorias={[{ id: 2, nome: 'Financeiro' } as never]}
        aoAbrir={() => {}}
      />
    </ThemeProvider>
  );

describe('cartão do quadro', () => {
  it('o título do chamado é um cabeçalho', () => {
    // Sem isto não há como percorrer uma coluna longa a não ser lendo tudo.
    expect(marcacao()).toContain('<h4');
  });

  it('o cartão é um artigo, e não um botão gigante', () => {
    const html = marcacao();
    expect(html).toContain('<article');
    // Um só botão no cartão, e ele está DENTRO do cabeçalho.
    expect(html.match(/<button/g) ?? []).toHaveLength(1);
    expect(html).toMatch(/<h4[^>]*>\s*<button/);
  });

  it('o nome do alvo diz o que faz e sobre qual chamado', () => {
    const html = marcacao();
    expect(html).toContain('Abrir chamado');
    expect(html).toContain('HS-4187');
  });

  /**
   * O prefixo é `sr-only`, e não `aria-label`.
   *
   * `aria-label` substituiria o conteúdo do botão, e o título — que é o texto
   * que está na tela — sairia do nome. Foi exatamente o defeito que o
   * `Seletor` corrigiu nesta mesma passagem: o nome acessível precisa CONTER o
   * rótulo visível, que é o que a 2.5.3 pede.
   */
  it('o título continua dentro do nome, e não é substituído por um rótulo', () => {
    const html = marcacao();
    expect(html).toContain('Impressora não imprime');
    expect(html).not.toMatch(/<button[^>]*aria-label/);
  });

  /**
   * O que ficou FORA do nome do alvo é metade do conserto.
   *
   * Categoria, prioridade e responsável continuam no cartão e continuam sendo
   * lidos — como conteúdo do artigo, e não grudados no nome de um controle.
   */
  it('os selos continuam no cartão, fora do botão', () => {
    const html = marcacao();
    expect(html).toContain('Financeiro');
    expect(html).toContain('Alta');

    const botao = html.slice(html.indexOf('<button'), html.indexOf('</button>'));
    expect(botao).not.toContain('Financeiro');
    expect(botao).not.toContain('Alta');
  });
});

describe('cartão do quadro — o ponto de prioridade', () => {
  /**
   * O ponto tinha `title="Prioridade Alta"`, e o `title` nao dava conta.
   *
   * Num `<span>` sem papel nem foco, `title` e dica de MOUSE: nao aparece no
   * toque, nao aparece pelo teclado, e o suporte dos leitores de tela a ele em
   * elemento nao interativo e irregular. Informacao que depende disso nao esta
   * informada.
   *
   * A informacao nao sumiu porque nunca dependeu dali: o `PrioridadeBadge`
   * esta no mesmo cartao, com a palavra escrita. O `title` era a segunda fonte
   * -- a que podia divergir, e a que ninguem garante que e lida.
   */
  it('a prioridade continua escrita, e o ponto e so cor', () => {
    const html = marcacao();

    // A palavra, que e quem informa.
    expect(html).toContain('Alta');

    // E o ponto nao promete mais carregar a informacao sozinho.
    expect(html).not.toContain('title="Prioridade');
  });
});
