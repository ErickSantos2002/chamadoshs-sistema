import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  IconeSeta,
  IconeSetaCima,
  IconeSetaDireita,
  IconeVoltar,
} from './icones';

/**
 * Os quatro ícones direcionais apontam para onde o NOME diz.
 *
 * ── Por que este caso existe ─────────────────────────────────────────
 *
 * A sessão do HelpHS gravou a E21 com `thumbsUp` e `thumbsDown` **trocados de
 * nome**, e nada acusou. O caso de teste deles prendia três coisas — contagem,
 * unicidade e hash — e as três passaram verdes:
 *
 *   - a contagem estava certa: eram mesmo 16 nomes novos;
 *   - a unicidade estava certa: os traçados eram mesmo distintos;
 *   - o hash estava certo, **calculado sobre a tabela errada**.
 *
 * Foi achado por quem USOU os dois lado a lado, num "Sim" e num "Não" — o único
 * lugar do sistema onde a troca produzia sintoma.
 *
 * > **Contagem, unicidade e hash provam INTEGRIDADE, nunca CORREÇÃO.** Um hash
 * > confirma que ninguém mexeu DEPOIS; não confirma que estava certo ANTES.
 *
 * Nome e desenho não têm relação que o `tsc`, o ESLint ou uma revisão de diff
 * consigam conferir: um `d` é texto, e todo texto cabe.
 *
 * ── E aqui a troca não seria decorativa ──────────────────────────────
 *
 * `IconeSeta` e `IconeSetaCima` são o indicador de ordenação da `Tabela`. Uma
 * troca inverteria o sentido de "crescente" em **toda listagem do sistema**,
 * calada — a seta continuaria bonita, apontando para o lado errado.
 *
 * ── O que este caso afirma ───────────────────────────────────────────
 *
 * Não o literal do `d`, que muda por motivo cosmético: a **geometria**. O
 * vértice do galão tem de ser o ponto extremo no eixo que o nome promete, e
 * cada ícone tem de satisfazer **exatamente uma** das quatro direções.
 */

/**
 * Os SUBCAMINHOS de um `d`, cada um como lista de pontos.
 *
 * Separar em subcaminhos é o que faz o `IconeVoltar` ser lido certo: ele tem
 * dois — a haste (`M20 12H4`, dois pontos) e o galão (`M10 6l-6 6 6 6`, três).
 * Lendo o `d` como uma sequência só, o ponto do meio cai na haste e o ícone
 * "aponta para cima".
 *
 * O leitor entende apenas retas — `M m L l H h V v Z z`. Diante de curva
 * (`C`, `S`, `Q`, `A`) ele devolve VAZIO em vez de chutar: um leitor que
 * inventa a geometria de um arco aprovaria qualquer coisa, e a checagem
 * passaria a medir a imaginação dele.
 */
function subcaminhosDe(d: string): Array<Array<[number, number]>> {
  if (/[CcSsQqTtAa]/.test(d)) return [];

  const fora: Array<Array<[number, number]>> = [];
  let atual: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  let comando = '';
  const pedacos = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];

  for (let i = 0; i < pedacos.length; ) {
    const p = pedacos[i];
    if (/[a-zA-Z]/.test(p)) {
      comando = p;
      i += 1;
      if (comando === 'M' || comando === 'm') {
        if (atual.length) fora.push(atual);
        atual = [];
      }
      continue;
    }
    const rel = comando === comando.toLowerCase();
    switch (comando.toUpperCase()) {
      case 'M':
      case 'L': {
        const dx = Number(pedacos[i]);
        const dy = Number(pedacos[i + 1]);
        x = rel ? x + dx : dx;
        y = rel ? y + dy : dy;
        i += 2;
        // Depois de um moveto, as coordenadas seguintes são lineto implícito.
        if (comando === 'm') comando = 'l';
        if (comando === 'M') comando = 'L';
        break;
      }
      case 'H': {
        x = rel ? x + Number(pedacos[i]) : Number(pedacos[i]);
        i += 1;
        break;
      }
      case 'V': {
        y = rel ? y + Number(pedacos[i]) : Number(pedacos[i]);
        i += 1;
        break;
      }
      default:
        i += 1;
        continue;
    }
    atual.push([x, y]);
  }
  if (atual.length) fora.push(atual);
  return fora;
}

/** Todos os `d` que um ícone renderiza. */
function tracos(Icone: React.FC): string[] {
  const html = renderToStaticMarkup(React.createElement(Icone));
  return [...html.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
}

type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';

/**
 * A direção que o desenho aponta, lida da geometria.
 *
 * O vértice é o ponto extremo, e a direção é o eixo em que ele é extremo por
 * uma margem folgada — pelo menos 3 unidades das 24 do `viewBox`. A margem
 * evita chamar de "direcional" um desenho que só tem ruído de meio pixel num
 * dos eixos.
 *
 * Devolve `null` quando o desenho não é claramente direcional, o que é
 * informação e não falha: um caso que espera `null` distingue "aponta para
 * outro lado" de "não aponta para lado nenhum".
 */
function direcaoDe(ds: string[]): Direcao | null {
  // O galão é o subcaminho de TRÊS pontos. A haste do `Voltar` tem dois, e é
  // por isso que ela não pode entrar na conta.
  const galoes = ds.flatMap(subcaminhosDe).filter((s) => s.length === 3);
  if (galoes.length !== 1) return null;
  const pontos = galoes[0];

  const xs = pontos.map((p) => p[0]);
  const ys = pontos.map((p) => p[1]);
  const meio = pontos[1];

  const folga = 3;
  const candidatos: Array<[Direcao, boolean]> = [
    ['baixo', meio[1] === Math.max(...ys) && meio[1] - Math.min(...ys) >= folga],
    ['cima', meio[1] === Math.min(...ys) && Math.max(...ys) - meio[1] >= folga],
    ['direita', meio[0] === Math.max(...xs) && meio[0] - Math.min(...xs) >= folga],
    ['esquerda', meio[0] === Math.min(...xs) && Math.max(...xs) - meio[0] >= folga],
  ];
  const achados = candidatos.filter(([, ok]) => ok).map(([dir]) => dir);
  return achados.length === 1 ? achados[0] : null;
}

const ICONES: Record<string, React.FC> = {
  IconeSeta,
  IconeSetaCima,
  IconeSetaDireita,
  IconeVoltar,
};

const ESPERADO: Record<string, Direcao> = {
  IconeSeta: 'baixo',
  IconeSetaCima: 'cima',
  IconeSetaDireita: 'direita',
  IconeVoltar: 'esquerda',
};

/** O mapa nome → direção, a partir de uma atribuição de traçados a nomes. */
function mapaDe(porNome: Record<string, string[]>): Record<string, Direcao | null> {
  const fora: Record<string, Direcao | null> = {};
  for (const nome of Object.keys(porNome)) fora[nome] = direcaoDe(porNome[nome]);
  return fora;
}

const TRACOS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ICONES).map(([nome, Icone]) => [nome, tracos(Icone)])
);

describe('ícones direcionais — o desenho aponta para onde o nome diz', () => {
  it('os quatro apontam para a direção do próprio nome', () => {
    expect(mapaDe(TRACOS)).toEqual(ESPERADO);
  });

  /**
   * A prova por mutação, EXAUSTIVA em vez de exemplar.
   *
   * Seis pares possíveis entre quatro ícones. Trocar **quaisquer dois** tem de
   * quebrar o mapa — senão a asserção acima passaria com nomes trocados, que é
   * exatamente o defeito que este arquivo existe para pegar.
   *
   * Feito aqui e não à mão porque uma mutação manual prova um par; esta prova
   * os seis, e continua provando quando alguém acrescentar um quinto ícone.
   */
  it('trocar QUAISQUER dois quebra o mapa — os seis pares', () => {
    const nomes = Object.keys(ICONES);
    const pares: Array<[string, string]> = [];
    for (let i = 0; i < nomes.length; i++)
      for (let j = i + 1; j < nomes.length; j++) pares.push([nomes[i], nomes[j]]);

    expect(pares).toHaveLength(6);

    for (const [a, b] of pares) {
      const trocado = { ...TRACOS, [a]: TRACOS[b], [b]: TRACOS[a] };
      expect(mapaDe(trocado), `trocar ${a} com ${b} passou despercebido`).not.toEqual(
        ESPERADO
      );
    }
  });

  /**
   * O leitor de geometria não aprova qualquer coisa.
   *
   * Sem este caso, um `direcaoDe` que devolvesse sempre a direção esperada
   * passaria nos dois de cima. Aqui um desenho sem direção tem de dar `null`.
   */
  it('desenho sem direção clara devolve null, e não um palpite', () => {
    expect(direcaoDe(['M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z'])).toBeNull();
    expect(direcaoDe(['M12 2v20'])).toBeNull();
    expect(direcaoDe([])).toBeNull();
  });
});
