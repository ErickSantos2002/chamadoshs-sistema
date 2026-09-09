import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DicaDoGrafico } from './DicaDoGrafico';

/**
 * A dica do gráfico, e o defeito que ela existe para não deixar voltar.
 *
 * A dica padrão do Recharts pinta cada item **na cor da série** —
 * `DefaultTooltipContent.js` linha 70, `color: entry.color || '#000'`. A paleta
 * é certificada como FORMA a 3:1 contra o card, e ali ela vira TEXTO, onde o
 * piso é 4,5:1. **Doze das treze reprovavam**, a pior a 2,93.
 *
 * A saída não foi mexer na paleta — ela está certificada para o papel dela, com
 * ΔE em quatro visões, e mudar cor por causa da dica desfaria o que a E16-b
 * pagou. A saída foi separar os dois papéis: **texto em `--conteudo`, cor da
 * série no marcador**.
 */

const marcacao = (props: Parameters<typeof DicaDoGrafico>[0]) =>
  renderToStaticMarkup(<DicaDoGrafico {...props} />);

const CARGA = [
  { name: 'Abertos', value: 12, color: '#E2126D', dataKey: 'abertos' },
  { name: 'Resolvidos', value: 30, color: '#15D56F', dataKey: 'resolvidos' },
];

describe('DicaDoGrafico', () => {
  it('não desenha nada quando a dica não está ativa', () => {
    expect(marcacao({ active: false, payload: CARGA })).toBe('');
    expect(marcacao({ active: true, payload: [] })).toBe('');
    expect(marcacao({ active: true })).toBe('');
  });

  it('desenha um item por série, com nome e valor', () => {
    const html = marcacao({ active: true, payload: CARGA, label: 'Setembro' });

    expect(html).toContain('Setembro');
    expect(html).toContain('Abertos');
    expect(html).toContain('12');
    expect(html).toContain('Resolvidos');
    expect(html).toContain('30');
  });

  /**
   * A REGRESSÃO do defeito.
   *
   * A cor da série tem de aparecer **como fundo de um marcador**, e nunca como
   * cor de texto. Se alguém trocar o marcador por `style={{ color }}` no item —
   * que é exatamente o que o Recharts faz —, este caso reprova.
   */
  it('a cor da série vai no FUNDO do marcador, nunca no texto', () => {
    const html = marcacao({ active: true, payload: CARGA });

    for (const item of CARGA) {
      expect(html).toContain(`background-color:${item.color}`);
    }
    expect(html).not.toMatch(/[^-]color:#[0-9a-fA-F]{6}/);
  });

  /** E o marcador é reforço: quem carrega a informação é o nome escrito. */
  it('o marcador é aria-hidden, porque o nome já diz de qual série se trata', () => {
    const html = marcacao({ active: true, payload: CARGA });
    const marcadores = [...html.matchAll(/<span[^>]*background-color:[^>]*>/g)];

    expect(marcadores).toHaveLength(2);
    for (const [tag] of marcadores) expect(tag).toContain('aria-hidden="true"');
  });

  /**
   * O texto vem de TOKEN, por classe — não de hexadecimal copiado.
   *
   * É o que permitiu apagar três cópias de token do `estiloDoGrafico`: a dica
   * não é SVG, é um `div` sobreposto, e HTML lê token por classe.
   */
  it('o texto usa classe de token, e não cor inline', () => {
    const html = marcacao({ active: true, payload: CARGA, label: 'x' });

    expect(html).toContain('text-conteudo');
    expect(html).toContain('bg-superficie');
    expect(html).toContain('border-borda');
  });
});
