import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PieChart, Pie, Cell } from 'recharts';
import { classeDeStatus, corDoStatus } from './graficos';

/**
 * A tabela status → slot da E18, adotada em PARTE.
 *
 * ── O que está adotado, e o que não está ─────────────────────────────
 *
 * Três dos slots viram classe; `Resolvido` e `Fechado` seguem no tratamento
 * atual, porque dar-lhes cores distintas responderia por acidente a pergunta de
 * produto aberta desde o Checkpoint 3. Os slots 4 e 7 ficam vagos e declarados,
 * e não se renumera: a tabela é fixada para os dois repositórios.
 *
 * ── Por que estes casos existem em teste, e não no navegador ─────────
 *
 * A massa de produção só tem `Resolvido` — que é exatamente o status NÃO
 * adotado. No navegador as três séries adotadas ficam em zero, o Recharts não
 * desenha caminho para fatia de valor zero, e não há o que medir.
 *
 * O que o navegador CONFIRMOU foi o marcador da legenda: `serie-status-1/2/3`
 * com fundo `#4e86c6`, `#bc7638` e `#2ed0e5`, que são os `--chart-1/2/3` do
 * tema escuro. A fatia é o que fica aqui.
 */

const requerido = ['Abertos', 'Em Andamento', 'Aguardando'];

describe('a tabela status → slot', () => {
  it('os três adotados devolvem classe, na ordem da E18', () => {
    expect(classeDeStatus('Aberto')).toBe('serie-status-1');
    expect(classeDeStatus('Abertos')).toBe('serie-status-1');
    expect(classeDeStatus('Em Andamento')).toBe('serie-status-2');
    expect(classeDeStatus('Aguardando')).toBe('serie-status-3');
  });

  /**
   * O caso que impede a adoção de completar-se sozinha.
   *
   * Se alguém acrescentar `Resolvido` ou `Fechado` à tabela, este caso reprova —
   * e é o que garante que a pergunta de produto seja respondida por decisão, e
   * não por alguém "terminando" o mapeamento.
   */
  it('resolved e closed NÃO estão adotados, e a pergunta segue aberta', () => {
    expect(classeDeStatus('Resolvido')).toBeNull();
    expect(classeDeStatus('Resolvidos')).toBeNull();
    expect(classeDeStatus('Fechado')).toBeNull();
  });

  /** E os dois continuam com o mesmo tratamento — que é o estado de hoje. */
  it('resolved e closed seguem com a mesma cor entre si', () => {
    for (const escuro of [false, true]) {
      expect(corDoStatus('Resolvido', escuro)).toBe(corDoStatus('Fechado', escuro));
    }
  });

  /** Status desconhecido não inventa slot. */
  it('status fora da tabela devolve null', () => {
    expect(classeDeStatus('Cancelado')).toBeNull();
    expect(classeDeStatus('Arquivado')).toBeNull();
    expect(classeDeStatus('')).toBeNull();
  });
});

describe('a classe chega à fatia da rosca', () => {
  let raiz: Root | null = null;
  let alvo: HTMLElement | null = null;

  afterEach(() => {
    if (raiz) act(() => raiz!.unmount());
    alvo?.remove();
    raiz = null;
    alvo = null;
  });

  /**
   * Com valor ZERO o Recharts não desenha caminho, e foi isso que impediu a
   * verificação no navegador. Aqui os valores são não-nulos de propósito.
   */
  it('cada Cell adotado sai com a classe do slot', () => {
    alvo = document.createElement('div');
    document.body.appendChild(alvo);
    raiz = createRoot(alvo);
    const dados = requerido.map((name, i) => ({ name, value: i + 1 }));

    act(() => {
      raiz!.render(
        <PieChart width={200} height={200}>
          <Pie data={dados} dataKey="value" isAnimationActive={false}>
            {dados.map((d) => (
              <Cell key={d.name} className={classeDeStatus(d.name) ?? undefined} />
            ))}
          </Pie>
        </PieChart>
      );
    });

    for (let i = 1; i <= 3; i++) {
      expect(
        alvo!.querySelectorAll(`.serie-status-${i}`).length,
        `a fatia do slot ${i} não recebeu a classe`
      ).toBeGreaterThan(0);
    }
  });

  /**
   * O que o caso ANTERIOR desta linha afirmava, e estava errado.
   *
   * Escrevi que a fatia adotada não poderia levar atributo `fill`. Ela leva:
   * o Recharts escreve **`fill="#808080"`** por conta própria, o cinza padrão
   * do `Sector` quando nenhum `fill` é passado. Não é cópia de token nosso —
   * é valor DELE, e não há como suprimi-lo por `Cell`.
   *
   * O que precisa valer, então, não é a ausência do atributo: é que ele NÃO
   * seja nenhuma cor nossa, e que a regra CSS o vença. As duas coisas estão
   * aqui.
   *
   * ── E o que isso custa, dito em voz alta ─────────────────────────────
   *
   * Se a regra de `index.css` não chegar — arquivo não carregado, classe
   * renomeada por versão maior do Recharts —, a fatia **não some**: fica
   * CINZA. Degradação silenciosa, e nenhum destes casos a pegaria em
   * produção. O que a pega é o caso das classes, logo acima, que reprova alto
   * se o Recharts renomear.
   */
  it('o fill de atributo é do Recharts, não nosso, e a regra CSS o vence', () => {
    const estilo = document.createElement('style');
    estilo.textContent =
      '.serie-status-1 { fill: rgb(11, 22, 33); }' +
      '.serie-status-2 { fill: rgb(44, 55, 66); }' +
      '.serie-status-3 { fill: rgb(77, 88, 99); }';
    document.head.appendChild(estilo);

    alvo = document.createElement('div');
    document.body.appendChild(alvo);
    raiz = createRoot(alvo);
    const dados = requerido.map((name, i) => ({ name, value: i + 1 }));

    act(() => {
      raiz!.render(
        <PieChart width={200} height={200}>
          <Pie data={dados} dataKey="value" isAnimationActive={false}>
            {dados.map((d) => (
              <Cell key={d.name} className={classeDeStatus(d.name) ?? undefined} />
            ))}
          </Pie>
        </PieChart>
      );
    });

    const esperado = ['rgb(11, 22, 33)', 'rgb(44, 55, 66)', 'rgb(77, 88, 99)'];
    for (let i = 1; i <= 3; i++) {
      const fatia = alvo!.querySelector(`path.serie-status-${i}`);
      expect(fatia, `não há <path> com a classe do slot ${i}`).not.toBeNull();

      // O atributo existe, e não é cor nossa: é o cinza padrão do Recharts.
      expect(fatia!.getAttribute('fill')).toBe('#808080');

      // E perde para a regra, que é o que faz a adoção funcionar.
      expect(getComputedStyle(fatia!).fill).toBe(esperado[i - 1]);
    }

    estilo.remove();
  });
});
