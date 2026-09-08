import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A checagem 2 da sonda — o canvas — e as provas que a fazem valer.
 *
 * ── O defeito que estas provas existem para não deixar voltar ────────
 *
 * A checagem 2 media o `backgroundColor` do `<body>` e **não comparava com
 * nada**. A palavra `fundo` aparecia quatro vezes no `sonda-captura.js`: um
 * comentário prometendo "o fundo esperado por tema, para conferir o PIXEL",
 * outro dizendo "atributo é promessa, pixel é fato", a linha que calculava, e o
 * campo do relatório. Nenhum `if`. O mapa de valores esperados que o JSDoc
 * documentava nunca foi escrito.
 *
 * Ela sobreviveu a oito provas negativas porque a prova que existia bloqueia
 * com **três** motivos — marcador, classe `.dark` e canário —, todos de
 * atributo. As três disparam juntas, e a saída fica idêntica com ou sem a
 * quarta. Uma checagem que nunca foi vista falhando **sozinha** não está
 * provada: está acompanhada.
 *
 * ── Por que estes casos são DIFERENCIAIS ─────────────────────────────
 *
 * Em jsdom não há layout nem CSS servido, então o canário e o marcador
 * reprovam de qualquer jeito. Neutralizá-los um a um seria frágil e ainda
 * deixaria dúvida.
 *
 * Em vez disso cada caso roda a sonda **duas vezes**, com tudo idêntico exceto
 * **uma** variável, e compara os conjuntos de problemas. O que muda entre as
 * duas execuções só pode ter vindo daquela variável — é a forma mais forte de
 * "a checagem dispara sozinha", e cumpre o critério do `DECISOES.md`: *um caso
 * que reprova por vários motivos não prova nada sobre nenhum deles.*
 */

const requerer = createRequire(import.meta.url);
const { montarSonda } = requerer(
  resolve(__dirname, '../scripts/sonda-captura.js')
) as {
  montarSonda: (
    tema: string,
    exigirTabela: boolean,
    excecao?: string | null,
    viewport?: [number, number] | null
  ) => string;
};

/** As superfícies do tema claro, como o gerador as embute. */
const CLARO = {
  base: 'rgb(248, 250, 252)',
  superficie: 'rgb(255, 255, 255)',
  elevada: 'rgb(241, 245, 249)',
};

const LARGURA = 1366;
const ALTURA = 768;

type Cenario = {
  /** Cor do elemento que cobre o viewport inteiro. `null` = não existe. */
  canvas?: string | null;
  /** Cor do `<body>`, que fica coberto e não deveria ser medido. */
  body?: string;
  /** Um elemento que cobre 90% mas NÃO o viewport inteiro. */
  quase?: string;
  /** Tabelas: `[linhas, visível]`. */
  tabelas?: Array<[number, boolean]>;
  /** Sequência de leituras do canvas, para o laço de assentamento. */
  sequencia?: string[];
};

const estiloOriginal = window.getComputedStyle;
const rectOriginal = Element.prototype.getBoundingClientRect;

function montarDom(c: Cenario) {
  document.documentElement.dataset.app = 'chamadoshs';
  document.documentElement.dataset.temaPronto = 'claro';
  document.body.innerHTML = '';

  const cores = new Map<Element, string>();
  const rects = new Map<Element, { l: number; t: number; r: number; b: number }>();

  cores.set(document.body, c.body ?? CLARO.base);

  if (c.canvas !== null) {
    const el = document.createElement('div');
    el.className = 'casca';
    document.body.appendChild(el);
    cores.set(el, c.canvas ?? CLARO.base);
    rects.set(el, { l: 0, t: 0, r: LARGURA, b: ALTURA });
  }

  if (c.quase) {
    const el = document.createElement('main');
    document.body.appendChild(el);
    cores.set(el, c.quase);
    // 95% de largura e 92% de altura: passa de 90%, e NÃO cobre o viewport.
    rects.set(el, { l: 64, t: 64, r: LARGURA, b: ALTURA });
  }

  for (const [linhas, visivel] of c.tabelas ?? []) {
    const tabela = document.createElement('table');
    const corpo = document.createElement('tbody');
    for (let i = 0; i < linhas; i++) corpo.appendChild(document.createElement('tr'));
    tabela.appendChild(corpo);
    tabela.dataset.visivel = visivel ? 'sim' : 'nao';
    document.body.appendChild(tabela);
    rects.set(tabela, visivel ? { l: 0, t: 0, r: 100, b: 100 } : { l: 0, t: 0, r: 0, b: 0 });
  }

  // A sequência do laço de assentamento: cada leitura do canvas devolve o
  // próximo valor da lista, e o último se repete.
  let passo = 0;
  const sequencia = c.sequencia;

  (window as unknown as { getComputedStyle: unknown }).getComputedStyle = ((
    el: Element
  ) => {
    let bg = cores.get(el) ?? 'rgba(0, 0, 0, 0)';
    if (sequencia && el.className === 'casca') {
      bg = sequencia[Math.min(passo, sequencia.length - 1)];
      passo += 1;
    }
    return {
      backgroundColor: bg,
      display: 'block',
      visibility: (el as HTMLElement).dataset?.visivel === 'nao' ? 'hidden' : 'visible',
      position: 'static',
      getPropertyValue: () => '',
    };
  }) as unknown as typeof window.getComputedStyle;

  Element.prototype.getBoundingClientRect = function () {
    const r = rects.get(this) ?? { l: 0, t: 0, r: 0, b: 0 };
    return {
      left: r.l, top: r.t, right: r.r, bottom: r.b,
      width: r.r - r.l, height: r.b - r.t, x: r.l, y: r.t,
      toJSON: () => ({}),
    } as DOMRect;
  };
}

/** Roda a sonda no DOM montado e devolve os problemas. */
function problemas(c: Cenario, exigirTabela = false): string[] {
  montarDom(c);
  const texto = montarSonda('claro', exigirTabela, 'teste', [LARGURA, ALTURA]);
  // eslint-disable-next-line no-eval
  const r = (0, eval)(texto) as { problemas: string[] };
  return r.problemas;
}

/** O que MUDOU entre dois cenários — o resto é ruído constante do jsdom. */
function diferenca(a: Cenario, b: Cenario, exigirTabela = false) {
  const pa = problemas(a, exigirTabela);
  const pb = problemas(b, exigirTabela);
  return {
    soEmA: pa.filter((p) => !pb.includes(p)),
    soEmB: pb.filter((p) => !pa.includes(p)),
  };
}

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { value: LARGURA, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: ALTURA, configurable: true });
  if (!performance.getEntriesByType) {
    (performance as unknown as { getEntriesByType: () => unknown[] }).getEntriesByType =
      () => [];
  }
});

afterEach(() => {
  window.getComputedStyle = estiloOriginal;
  Element.prototype.getBoundingClientRect = rectOriginal;
});

describe('canvas — a linha do pixel dispara SOZINHA', () => {
  /**
   * O caso que faltava havia oito provas.
   *
   * Tudo idêntico entre as duas execuções menos a cor do canvas. Se a diferença
   * de saída for exatamente um problema, e for o do canvas, então ele disparou
   * sozinho — sem depender de marcador, de `.dark` nem do canário, que reprovam
   * igual nas duas e se cancelam na comparação.
   */
  it('trocar SÓ a cor do canvas muda exatamente um problema', () => {
    const d = diferenca(
      { canvas: CLARO.base },                 // certo
      { canvas: 'rgb(13, 27, 42)' }           // o canvas do tema ESCURO
    );

    expect(d.soEmA).toEqual([]);
    expect(d.soEmB).toHaveLength(1);
    expect(d.soEmB[0]).toContain('canvas');
    expect(d.soEmB[0]).toContain('--superficie-base');
  });

  /**
   * `rgb(240, 240, 240)`: claro, plausível, e token de coisa nenhuma.
   *
   * Separa "compara com o TOKEN" de "casa uma FAIXA de cor clara". Veio da
   * sessão do HelpHS, que descobriu por mutação que a bateria dela não
   * distinguia as duas — a mutação que trocava token por faixa passava em todos
   * os casos.
   */
  it('bloqueia cor clara e plausível que não é token nenhum', () => {
    const d = diferenca({ canvas: CLARO.base }, { canvas: 'rgb(240, 240, 240)' });

    expect(d.soEmB).toHaveLength(1);
    expect(d.soEmB[0]).toContain('rgb(240, 240, 240)');
    expect(d.soEmB[0]).toContain('nao e token de superficie');
  });

  /**
   * Token VÁLIDO do tema certo, no lugar errado.
   *
   * `--superficie` é branco e legítimo, e não é o canvas. A mensagem tem de
   * NOMEAR o que encontrou — "está em X, que é --superficie, e o tema pede
   * --superficie-base" —, senão quem lê vai procurar uma cor inválida que não
   * existe.
   */
  it('bloqueia token válido na faixa errada, e diz qual token encontrou', () => {
    const d = diferenca({ canvas: CLARO.base }, { canvas: CLARO.superficie });

    expect(d.soEmB).toHaveLength(1);
    expect(d.soEmB[0]).toContain('--superficie,');
    expect(d.soEmB[0]).toContain('--superficie-base');
  });
});

describe('canvas — qual elemento é medido', () => {
  /**
   * O caso que mata uma sonda que lê o `body`.
   *
   * O `body` fica com a cor CERTA e o elemento que cobre fica com a errada. Uma
   * sonda que medisse o `body` liberaria. Este é o irmão local do caso do
   * HelpHS (pintar o `html` de vermelho deixando o `body` certo): lá o defeito
   * estava acima, aqui está abaixo, porque neste app uma div cobre o viewport.
   */
  it('mede o elemento que cobre, e não o body — body certo, canvas errado', () => {
    const p = problemas({ body: CLARO.base, canvas: 'rgb(13, 27, 42)' });

    expect(p.some((x) => x.includes('canvas'))).toBe(true);
  });

  /**
   * Cobertura TOTAL, e não 90%.
   *
   * O `<main>` cobre 95% da largura e 92% da altura — passa de qualquer limiar
   * de 90% — e não é o canvas: ele exclui barra lateral e cabeçalho. Foi
   * exatamente o que aconteceu em 1366 durante as capturas.
   *
   * Aqui o `main` está com a cor ERRADA e o canvas com a certa. Uma sonda com
   * limiar de 90% escolheria o `main` e bloquearia; esta escolhe o canvas e
   * libera.
   */
  it('ignora quem cobre 90% sem cobrir o viewport inteiro', () => {
    const d = diferenca(
      { canvas: CLARO.base },
      { canvas: CLARO.base, quase: 'rgb(13, 27, 42)' }
    );

    expect(d.soEmB).toEqual([]);
  });

  /**
   * Sem elemento que cubra, BLOQUEIA — e não cai no `body`.
   *
   * O recuo é o que escondeu o defeito da normalização no HelpHS: o caso
   * passava sem a normalização porque a sonda caía no `body`, que estava certo.
   * Recuo mascara a perda.
   */
  it('bloqueia quando nada cobre o viewport, sem recuar para o body', () => {
    const p = problemas({ canvas: null, body: CLARO.base });

    expect(p.some((x) => x.includes('nenhum elemento opaco cobre'))).toBe(true);
  });

  /** A proveniência entra no relatório: quem lê precisa saber o que foi medido. */
  it('relata de onde veio a medição', () => {
    montarDom({ canvas: CLARO.base });
    const texto = montarSonda('claro', false, 'teste', [LARGURA, ALTURA]);
    // eslint-disable-next-line no-eval
    const r = (0, eval)(texto) as { canvas_elemento: string | null; canvas: string | null };

    expect(r.canvas_elemento).toBe('DIV.casca');
    expect(r.canvas).toBe(CLARO.base);
  });
});

describe('canvas — formato e assentamento', () => {
  /**
   * `color(srgb ...)` é o que o Chromium devolve para tudo que sai de
   * `color-mix()`, e o `tailwind.config.js` declara as cores do pacote assim.
   * Sem normalizar, a comparação de string NUNCA casaria — e o modo de falha
   * seria bloquear captura boa, que é a forma de trava que ensina a ser
   * ignorada.
   *
   * `color(srgb 0.973 0.980 0.988)` é o mesmo `rgb(248, 250, 252)`.
   */
  it('aceita color(srgb ...) equivalente ao token', () => {
    const d = diferenca(
      { canvas: CLARO.base },
      { canvas: 'color(srgb 0.973 0.980 0.988)' }
    );

    expect(d.soEmB).toEqual([]);
  });

  /**
   * O valor computado é INTERMITENTE. Duas leituras seguidas na mesma página
   * chegaram a discordar durante as capturas.
   *
   * Se elas não param de discordar, a sonda BLOQUEIA em vez de escolher uma —
   * escolher seria inventar um valor que a página não tem.
   */
  it('bloqueia quando as leituras não param de mudar', () => {
    const p = problemas({
      sequencia: ['rgb(248, 250, 252)', 'rgb(13, 27, 42)', 'rgb(248, 250, 252)',
                  'rgb(13, 27, 42)', 'rgb(248, 250, 252)', 'rgb(13, 27, 42)'],
    });

    expect(p.some((x) => x.includes('nao parou de mudar'))).toBe(true);
  });

  /** E assenta quando a segunda leitura confirma a primeira. */
  it('assenta quando duas leituras seguidas concordam', () => {
    const d = diferenca(
      { canvas: CLARO.base },
      { sequencia: ['rgb(13, 27, 42)', CLARO.base, CLARO.base] }
    );

    expect(d.soEmB).toEqual([]);
  });
});

describe('tabela — conta a VISÍVEL, não a maior', () => {
  /**
   * Em `/cadastros` as três abas montam tabela ao mesmo tempo: `[6, 11, 33]`, e
   * só a primeira está em cena. Decidindo por `Math.max` sobre todas, a sonda
   * aprovaria uma captura cuja tabela visível tivesse UMA linha — e o divisor
   * entre linhas, única coisa que esta checagem existe para garantir, não
   * apareceria na foto.
   */
  it('bloqueia com a visível em 1 linha, mesmo com uma oculta de 33', () => {
    const p = problemas({ canvas: CLARO.base, tabelas: [[1, true], [33, false]] }, true);

    expect(p.some((x) => x.includes('VISIVEL') && x.includes('1 linha'))).toBe(true);
  });

  /** E libera quando a visível tem duas, mesmo com ocultas maiores. */
  it('libera com a visível em 2 linhas', () => {
    const p = problemas({ canvas: CLARO.base, tabelas: [[2, true], [33, false]] }, true);

    expect(p.some((x) => x.includes('linha(s)'))).toBe(false);
  });
});
