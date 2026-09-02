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
   *
   * O NOME da classe mudou na Fase 3, a asserção não. Era o par escrito à mão
   * `text-<tom>-forte dark:text-<tom>-suave`; virou o token `--on-tint-*` de
   * `DS/tokens/colors.css`, que já troca de degrau sozinho entre os temas —
   * 700 no claro, 400 no escuro. O que este caso trava continua sendo a HORA
   * em que a cor entra, e não o nome dela.
   */
  it('em repouso é neutro — a cor do tom só aparece no hover', () => {
    const html = renderizar(
      <BotaoDeAcao tom="perigo" titulo="Excluir" onClick={() => {}}>
        <IconeOlho />
      </BotaoDeAcao>
    );

    expect(html).toContain('text-conteudo-tenue');
    expect(html).toContain('hover:text-on-tint-danger');
    // Sem variante, `text-on-tint-danger` pintaria o ícone o tempo todo.
    expect(html).not.toMatch(/class="[^"]*(?<!hover:)text-on-tint-danger/);
  });

  it('cada tom traz a própria cor de hover', () => {
    const tomDe = (tom: React.ComponentProps<typeof BotaoDeAcao>['tom']) =>
      renderizar(
        <BotaoDeAcao tom={tom} titulo="Ação" onClick={() => {}}>
          <IconeOlho />
        </BotaoDeAcao>
      );

    expect(tomDe('info')).toContain('hover:text-on-tint-info');
    expect(tomDe('alerta')).toContain('hover:text-on-tint-warning');
    expect(tomDe('sucesso')).toContain('hover:text-on-tint-success');
    expect(tomDe('perigo')).toContain('hover:text-on-tint-danger');
    // Neutro não tem cor de significado: escurece para o conteúdo comum.
    expect(tomDe('neutro')).toContain('hover:text-conteudo');
  });
});
