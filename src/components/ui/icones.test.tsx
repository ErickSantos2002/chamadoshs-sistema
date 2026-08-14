import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import * as icones from './icones';

/**
 * O compilador não olha para dentro de um `d=""`.
 *
 * Um ícone com o caminho vazio, ou com um caractere a menos numa coordenada,
 * passa por `tsc`, passa pelo build e chega à tela como um retângulo em branco.
 * Aqui cada um é desenhado de verdade e conferido.
 *
 * O teste também trava a linguagem: ponta quadrada e junção viva foram uma
 * decisão — o sistema tem canto reto em tudo, e os ícones de pacote chegavam
 * com ponta redonda. Um ícone novo copiado de outro lugar traria o padrão de
 * lá, e ninguém notaria por olhar.
 */

const TODOS = Object.entries(icones).filter(
  ([nome, valor]) => nome.startsWith('Icone') && typeof valor === 'function'
) as Array<[string, React.FC<icones.PropsDeIcone>]>;

describe('ícones', () => {
  it('existem, e são mais que um punhado', () => {
    // Sem esta checagem, um erro no filtro faria a suíte passar sem desenhar
    // ícone nenhum.
    expect(TODOS.length).toBeGreaterThan(40);
  });

  it.each(TODOS)('%s desenha alguma coisa', (_nome, Icone) => {
    const html = renderToStaticMarkup(createElement(Icone));

    expect(html).toContain('<svg');
    // Um `<svg>` sem forma dentro é um quadrado invisível na tela.
    expect(html).toMatch(/<(path|circle|rect|line|polyline|polygon)\b/);
  });

  it.each(TODOS)('%s segue a linguagem do console', (_nome, Icone) => {
    const html = renderToStaticMarkup(createElement(Icone));

    expect(html).toContain('stroke-linecap="square"');
    expect(html).toContain('stroke-linejoin="miter"');
    // 1.5 e não 2: o traço fica ao lado de texto pequeno o tempo todo.
    expect(html).toContain('stroke-width="1.5"');
  });

  it('o tamanho vem de fora, e a cor vem do texto', () => {
    const html = renderToStaticMarkup(
      createElement(icones.IconeBusca, { className: 'h-4 w-4' })
    );

    expect(html).toContain('class="h-4 w-4"');
    expect(html).toContain('stroke="currentColor"');
    // Sem largura fixa no SVG: quem manda no tamanho é a classe. O espaço
    // antes de `width` é o que separa o atributo de `stroke-width`, que existe
    // e deve continuar existindo.
    expect(html).not.toMatch(/\swidth="/);
  });

  it('quem chama pode sobrescrever um padrão', () => {
    // Os KPIs do painel passam a cor por `style`, porque ela é calculada.
    const html = renderToStaticMarkup(
      createElement(icones.IconeAlerta, { style: { color: 'red' } })
    );

    expect(html).toContain('style="color:red"');
  });

  it('todos ficam fora da leitura de tela', () => {
    // Ícone aqui acompanha palavra. Quando for o único conteúdo de um botão, o
    // rótulo vai no `aria-label` do botão — não no ícone.
    for (const [nome, Icone] of TODOS) {
      expect(renderToStaticMarkup(createElement(Icone)), nome).toContain(
        'aria-hidden="true"'
      );
    }
  });
});
