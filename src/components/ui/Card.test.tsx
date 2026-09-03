import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card, CardBody, CardHeader } from './Card';

/**
 * O respiro dobrado do `Card` + `CardBody`.
 *
 * ── Por que este arquivo existe ───────────────────────────────────────
 *
 * A Fase 3 deu padding próprio ao `Card` (`md` por padrão). O `CardBody` tem o
 * dele, e existe para o caso `padding="none"`. Somados, o conteúdo recebe 16px
 * do card mais 16/20px do bloco — encolhe sem ninguém ter pedido.
 *
 * Hoje isso é inerte: `Card`, `CardHeader` e `CardBody` não têm nenhum ponto de
 * uso fora deste arquivo e do `kit.test.tsx`. O risco é das Fases 11–16, que
 * vão migrar onze telas para esses componentes, uma por commit, e o único aviso
 * era um comentário no meio do `Card.tsx` — que ninguém relê antes de compor
 * duas peças de um kit.
 *
 * ── Por que console e não `throw` ─────────────────────────────────────
 *
 * Respiro dobrado é feio, não é quebra. Derrubar a tela de quem está migrando
 * seria punição maior que o defeito. O `console.error` aparece na hora, no
 * navegador de quem está compondo, e some do pacote publicado.
 */
const render = (elemento: React.ReactElement) => renderToStaticMarkup(elemento);

let erro: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  erro = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  erro.mockRestore();
});

describe('Card + CardBody — o respiro dobrado', () => {
  /**
   * A combinação que este arquivo existe para impedir. `md` é o PADRÃO do
   * Card, então quem escrever `<Card><CardBody>` sem pensar cai exatamente
   * aqui — é o caminho mais provável, não o mais exótico.
   */
  it('reclama no padrão, que é onde o erro vai acontecer', () => {
    render(
      <Card>
        <CardBody>conteúdo</CardBody>
      </Card>
    );

    expect(erro).toHaveBeenCalledTimes(1);
    expect(erro.mock.calls[0][0]).toContain('o respiro dobra');
    // A mensagem nomeia o padding encontrado: sem isso, quem lê o console não
    // sabe qual dos dois lados mexer.
    expect(erro.mock.calls[0][0]).toContain('padding="md"');
  });

  it.each(['sm', 'lg'] as const)('reclama também com padding="%s"', (padding) => {
    render(
      <Card padding={padding}>
        <CardBody>conteúdo</CardBody>
      </Card>
    );

    expect(erro).toHaveBeenCalledTimes(1);
    expect(erro.mock.calls[0][0]).toContain(`padding="${padding}"`);
  });

  /**
   * O par correto: o card não paga nada e cada bloco paga o seu. É para isto
   * que o `CardBody` existe, e é o caso que não pode dar ruído.
   */
  it('fica calado com padding="none", que é a composição certa', () => {
    render(
      <Card padding="none">
        <CardBody>conteúdo</CardBody>
      </Card>
    );

    expect(erro).not.toHaveBeenCalled();
  });

  it('fica calado quando o card paga o respiro e não há CardBody', () => {
    render(
      <Card>
        <CardHeader titulo="Título" />
        <p>conteúdo</p>
      </Card>
    );

    expect(erro).not.toHaveBeenCalled();
  });

  // Fora de qualquer card o contexto é `null`, e o bloco é dono do próprio
  // respiro — não há com o que dobrar.
  it('fica calado com CardBody solto, sem card em volta', () => {
    render(<CardBody>conteúdo</CardBody>);

    expect(erro).not.toHaveBeenCalled();
  });

  /**
   * O `CardBody` quase nunca é filho DIRETO do card: vem embrulhado por um
   * `<div>` de layout, por um `map`, ou por um componente da própria tela.
   * Uma checagem de `React.Children` não veria nada disso — o contexto vê.
   */
  it('enxerga o CardBody aninhado fundo, não só o filho direto', () => {
    render(
      <Card>
        <div>
          <section>
            <CardBody>conteúdo</CardBody>
          </section>
        </div>
      </Card>
    );

    expect(erro).toHaveBeenCalledTimes(1);
  });

  it('reclama uma vez por CardBody, não uma vez por card', () => {
    render(
      <Card>
        <CardBody>um</CardBody>
        <CardBody>dois</CardBody>
      </Card>
    );

    expect(erro).toHaveBeenCalledTimes(2);
  });

  // O aviso não pode custar a tela: ele diagnostica, não interrompe.
  it('avisa mas desenha o conteúdo assim mesmo', () => {
    const html = render(
      <Card>
        <CardBody>conteúdo</CardBody>
      </Card>
    );

    expect(html).toContain('conteúdo');
    expect(html).toContain('px-5 py-4');
  });
});

describe('Card — o padding continua chegando ao elemento', () => {
  it.each([
    ['none', 'p-0'],
    ['sm', 'p-3'],
    ['md', 'p-4'],
    ['lg', 'p-6'],
  ] as const)('padding="%s" vira %s', (padding, classe) => {
    const html = render(<Card padding={padding}>x</Card>);

    expect(html).toContain(classe);
  });

  // O provedor de contexto não pode ter trocado o elemento externo: card
  // clicável continua sendo <button>, e o resto continua <div>.
  it('clicável continua sendo <button>, e o comum, <div>', () => {
    expect(render(<Card onClick={() => {}}>x</Card>)).toContain('<button');
    expect(render(<Card>x</Card>)).toContain('<div');
  });
});
