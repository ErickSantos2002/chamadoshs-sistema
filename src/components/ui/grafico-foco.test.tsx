import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PieChart, Pie, Cell } from 'recharts';

/**
 * Gráfico `aria-hidden` tem de sair TAMBÉM da ordem de tabulação.
 *
 * ── O defeito, medido no navegador em 09/09/2026 ─────────────────────
 *
 * A rosca do painel é `aria-hidden="true"` de propósito: os nomes e os números
 * dela já estão na lista abaixo, em texto, e anunciá-la leria a mesma
 * distribuição duas vezes.
 *
 * Só que **`aria-hidden` não tira da ordem de tabulação** — tira da árvore de
 * acessibilidade. E o Recharts 3 liga a camada de acessibilidade por padrão,
 * pondo `tabIndex={0}` na superfície:
 *
 *     RootSurface.js:47   tabIndex = hasAccessibilityLayer ? 0 : undefined
 *
 * Somados, os dois produzem o pior arranjo possível: **uma parada de foco que
 * não anuncia nada.** Quem navega por teclado para no gráfico, o leitor de tela
 * fica calado, e não há como saber que ali havia algo.
 *
 * A varredura de tab order da Fase 18 achou exatamente dois elementos assim, e
 * só no `/dashboard` — nas outras três telas o número foi zero.
 *
 * ── Por que `tabIndex={-1}` e não `inert` ────────────────────────────
 *
 * `inert` no `<div>` resolveria árvore e ordem de uma vez, e **está errado
 * aqui**: ele desliga o ponteiro junto, e a rosca tem `<Tooltip>` no passar do
 * mouse. O conserto certo é o que mexe só no que está errado.
 */

let raiz: Root | null = null;
let alvo: HTMLElement | null = null;

afterEach(() => {
  if (raiz) act(() => raiz!.unmount());
  alvo?.remove();
  raiz = null;
  alvo = null;
});

const montar = (no: React.ReactElement) => {
  alvo = document.createElement('div');
  document.body.appendChild(alvo);
  raiz = createRoot(alvo);
  act(() => raiz!.render(no));
  return alvo;
};

const DADOS = [
  { name: 'Abertos', value: 3 },
  { name: 'Em Andamento', value: 2 },
];

describe('gráfico decorativo sai da ordem de tabulação', () => {
  /**
   * O caso que prova o defeito: sem `tabIndex`, o Recharts põe zero, e o
   * elemento fica alcançável por Tab mesmo dentro de `aria-hidden`.
   */
  it('SEM tabIndex, a superfície fica tabulável — é o defeito', () => {
    const c = montar(
      <div aria-hidden="true">
        <PieChart width={200} height={200}>
          <Pie data={DADOS} dataKey="value" isAnimationActive={false}>
            {DADOS.map((d) => (
              <Cell key={d.name} />
            ))}
          </Pie>
        </PieChart>
      </div>
    );

    const superficie = c.querySelector('.recharts-surface');
    expect(superficie).not.toBeNull();
    expect(superficie!.getAttribute('tabindex')).toBe('0');
  });

  /**
   * E o conserto, que é nos DOIS.
   *
   * `tabIndex={-1}` só no `PieChart` arruma a superfície e **deixa o
   * `g.recharts-pie` para trás** — o `<Pie>` recebe o seu próprio. Este caso
   * pegou isso antes de o conserto pela metade ser empurrado, e é por isso que
   * ele afirma sobre o CONJUNTO e não sobre um elemento.
   */
  it('COM tabIndex={-1}, nada dentro do aria-hidden fica na ordem', () => {
    const c = montar(
      <div aria-hidden="true">
        <PieChart width={200} height={200} tabIndex={-1}>
          <Pie data={DADOS} dataKey="value" isAnimationActive={false} rootTabIndex={-1}>
            {DADOS.map((d) => (
              <Cell key={d.name} />
            ))}
          </Pie>
        </PieChart>
      </div>
    );

    const naOrdem = Array.from(c.querySelectorAll('[tabindex]')).filter(
      (e) => Number(e.getAttribute('tabindex')) >= 0
    );

    expect(
      naOrdem.map((e) => e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || '')),
      'sobrou elemento tabulável dentro do aria-hidden'
    ).toHaveLength(0);
  });

  /**
   * O acoplamento que este conserto compra, declarado: ele depende de o
   * Recharts respeitar um `tabIndex` numérico vindo de fora. Se uma versão
   * maior parar de respeitar, este caso reprova alto — em vez de a parada de
   * foco silenciosa voltar sem ninguém ver.
   */
  it('o Recharts respeita tabIndex numérico vindo de fora', () => {
    const c = montar(
      <PieChart width={200} height={200} tabIndex={-1}>
        <Pie data={DADOS} dataKey="value" isAnimationActive={false} />
      </PieChart>
    );

    expect(c.querySelector('.recharts-surface')!.getAttribute('tabindex')).toBe('-1');
  });
});
