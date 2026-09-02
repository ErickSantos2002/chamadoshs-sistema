import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BotaoDeAcao } from './BotaoDeAcao';
import { IconeOlho } from './icones';

/**
 * O que este arquivo trava é o tooltip e a hora em que a cor entra.
 *
 * O defeito de origem: os onze botões de ação das abas de Cadastros eram
 * blocos copiados entre três arquivos. Seis deles tinham `aria-label` e
 * nenhum `title` — leitor de tela lia, mouse não via nada —, e o de editar
 * declarava azul no botão e âmbar no ícone, com o ícone vencendo. As três
 * abas renderizavam uma fileira de ícones da mesma cor, sem explicação.
 *
 * A garantia principal não está aqui: `titulo` é prop obrigatória, então o
 * compilador recusa um botão de ação sem tooltip. Isto aqui cobre o resto.
 */
const renderizar = (elemento: React.ReactElement) =>
  renderToStaticMarkup(elemento);

describe('BotaoDeAcao', () => {
  it('põe o título no `title`, que é o tooltip do mouse', () => {
    const html = renderizar(
      <BotaoDeAcao titulo="Editar" onClick={() => {}}>
        <IconeOlho />
      </BotaoDeAcao>
    );

    expect(html).toContain('title="Editar"');
  });

  it('sem descrição, o leitor de tela recebe o próprio título', () => {
    const html = renderizar(
      <BotaoDeAcao titulo="Editar" onClick={() => {}}>
        <IconeOlho />
      </BotaoDeAcao>
    );

    expect(html).toContain('aria-label="Editar"');
  });

  /**
   * "Desativar" numa tabela de vinte linhas não diz desativar quem. O tooltip
   * fica curto porque cabe pouco ao lado do cursor; o leitor de tela recebe a
   * frase inteira.
   */
  it('com descrição, tooltip e leitor de tela dizem coisas diferentes', () => {
    const html = renderizar(
      <BotaoDeAcao
        titulo="Desativar"
        descricao="Desativar Maria"
        onClick={() => {}}
      >
        <IconeOlho />
      </BotaoDeAcao>
    );

    expect(html).toContain('title="Desativar"');
    expect(html).toContain('aria-label="Desativar Maria"');
  });

  /**
   * A regressão que este caso impede: alguém devolver a cor ao repouso e a
   * tabela voltar a ser uma fileira de glifos coloridos. Em repouso o botão é
   * cinza discreto; a cor do tom só existe atrás de `hover:`.
   */
  it('em repouso é neutro — a cor do tom só aparece no hover', () => {
    const html = renderizar(
      <BotaoDeAcao tom="perigo" titulo="Excluir" onClick={() => {}}>
        <IconeOlho />
      </BotaoDeAcao>
    );

    expect(html).toContain('text-conteudo-tenue');
    expect(html).toContain('hover:text-perigo-forte');
    // Sem variante, `text-perigo-forte` pintaria o ícone o tempo todo.
    expect(html).not.toMatch(/class="[^"]*(?<!hover:)text-perigo-forte/);
  });

  it('cada tom traz a própria cor de hover', () => {
    const tomDe = (tom: React.ComponentProps<typeof BotaoDeAcao>['tom']) =>
      renderizar(
        <BotaoDeAcao tom={tom} titulo="Ação" onClick={() => {}}>
          <IconeOlho />
        </BotaoDeAcao>
      );

    expect(tomDe('info')).toContain('hover:text-info-forte');
    expect(tomDe('alerta')).toContain('hover:text-alerta-forte');
    expect(tomDe('sucesso')).toContain('hover:text-sucesso-forte');
    expect(tomDe('perigo')).toContain('hover:text-perigo-forte');
    // Neutro não tem cor de significado: escurece para o conteúdo comum.
    expect(tomDe('neutro')).toContain('hover:text-conteudo');
  });
});
