import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';

/**
 * A moldura do gráfico lê TOKEN por CSS, e as duas coisas que isso exige.
 *
 * ── O que substituiu, e por que ──────────────────────────────────────
 *
 * O `estiloDoGrafico` copiava tokens em hexadecimal porque o Recharts escreve
 * cor em ATRIBUTO de apresentação, e `var()` não resolve em atributo. A cópia
 * divergiu **duas vezes**; a última na E14, que subiu o `--border-color` do
 * escuro — a recópia do token entrou, a cópia da moldura não, e **nada acusou
 * por três emendas**.
 *
 * A troca foi por três regras em `src/styles/index.css`, mirando as classes que
 * o Recharts já emite. A cópia foi a **zero**.
 *
 * ── As duas coisas que a troca exige, e estão aqui ───────────────────
 *
 * **1. Que atributo de apresentação realmente perca para a regra CSS** — não na
 * especificação, no ambiente. Medido também no Chrome 153, sem `!important`:
 * `fill="#ff0000"` computou `rgb(1, 2, 3)` e `stroke="#00ff00"` computou
 * `rgb(4, 5, 6)`.
 *
 * **2. Que as classes do Recharts existam.** Este é o acoplamento que a troca
 * comprou, e ele é DECLARADO: se uma versão maior renomear, estes casos
 * reprovam em voz alta, em vez de a cor sumir calada. Era esse o defeito do
 * arranjo anterior — acoplamento invisível, que dependia de alguém lembrar.
 */

describe('atributo de apresentação perde para a regra CSS', () => {
  it('o computado vem da regra, e não do atributo', () => {
    const estilo = document.createElement('style');
    estilo.textContent = '.prova-css { fill: rgb(1, 2, 3); stroke: rgb(4, 5, 6); }';
    document.head.appendChild(estilo);

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const texto = document.createElementNS(ns, 'text');
    texto.setAttribute('class', 'prova-css');
    texto.setAttribute('fill', '#ff0000');
    const linha = document.createElementNS(ns, 'line');
    linha.setAttribute('class', 'prova-css');
    linha.setAttribute('stroke', '#00ff00');
    svg.append(texto, linha);
    document.body.appendChild(svg);

    expect(texto.getAttribute('fill')).toBe('#ff0000');
    expect(getComputedStyle(texto).fill).toBe('rgb(1, 2, 3)');
    expect(linha.getAttribute('stroke')).toBe('#00ff00');
    expect(getComputedStyle(linha).stroke).toBe('rgb(4, 5, 6)');

    svg.remove();
    estilo.remove();
  });
});

describe('as classes do Recharts que as regras miram', () => {
  /**
   * Monta de VERDADE, e não por `renderToStaticMarkup`.
   *
   * O Recharts 3 devolve só o invólucro no servidor — 127 bytes, sem uma classe
   * de conteúdo. O gráfico nasce no cliente, então prender as classes exige
   * montagem real, com `createRoot` e `act`. Sem isso o caso passaria a
   * afirmar sobre uma marcação que o usuário nunca vê.
   */
  let raiz: Root | null = null;
  let alvo: HTMLElement | null = null;

  const grafico = () => {
    alvo = document.createElement('div');
    document.body.appendChild(alvo);
    raiz = createRoot(alvo);
    act(() => {
      raiz!.render(
        <BarChart width={300} height={200} data={[{ name: 'a', v: 1 }, { name: 'b', v: 2 }]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Bar dataKey="v" />
        </BarChart>
      );
    });
    return { container: alvo };
  };

  afterEach(() => {
    if (raiz) act(() => raiz!.unmount());
    alvo?.remove();
    raiz = null;
    alvo = null;
  });

  /**
   * As três classes que `index.css` mira. Se o Recharts renomear qualquer uma,
   * este caso reprova — e é essa a diferença entre acoplamento declarado e
   * acoplamento que ninguém vê.
   */
  it('a grade sai com .recharts-cartesian-grid e linhas dentro', () => {
    const { container } = grafico();

    expect(container.querySelector('.recharts-cartesian-grid')).not.toBeNull();
    expect(container.querySelectorAll('.recharts-cartesian-grid line').length).toBeGreaterThan(0);
  });

  it('o rótulo das marcas sai com .recharts-cartesian-axis-tick-value', () => {
    const { container } = grafico();

    expect(
      container.querySelectorAll('.recharts-cartesian-axis-tick-value').length
    ).toBeGreaterThan(0);
  });

  /**
   * E o que a regra mira tem de ser o que de fato pinta: o rótulo é `<text>`,
   * onde a cor vem de `fill`, e a grade é `<line>`, onde vem de `stroke`.
   * Mirar a classe certa no elemento errado passaria despercebido.
   */
  it('rótulo é <text> e linha de grade é <line> — o alvo das duas regras', () => {
    const { container } = grafico();

    const rotulo = container.querySelector('.recharts-cartesian-axis-tick-value');
    const linha = container.querySelector('.recharts-cartesian-grid line');

    expect(rotulo?.tagName.toLowerCase()).toBe('text');
    expect(linha?.tagName.toLowerCase()).toBe('line');
  });
});
