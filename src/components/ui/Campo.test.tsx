import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MensagemDeErro, RotuloDeCampo } from './Campo';

const html = (elemento: React.ReactElement) => renderToStaticMarkup(elemento);

describe('MensagemDeErro', () => {
  it('mostra o erro quando há erro', () => {
    expect(html(<MensagemDeErro texto="Nome muito curto" />)).toContain(
      'Nome muito curto'
    );
  });

  /**
   * Sem esta guarda o componente desenharia a linha vazia com o ícone de
   * alerta — um aviso de erro embaixo de todo campo, o tempo todo.
   */
  it('não desenha nada quando não há erro', () => {
    expect(html(<MensagemDeErro />)).toBe('');
    expect(html(<MensagemDeErro texto="" />)).toBe('');
  });
});

describe('RotuloDeCampo', () => {
  it('liga ao campo pelo htmlFor', () => {
    expect(html(<RotuloDeCampo htmlFor="nome">Nome</RotuloDeCampo>)).toContain(
      'for="nome"'
    );
  });

  it('só marca com asterisco quando é obrigatório', () => {
    expect(html(<RotuloDeCampo>Setor</RotuloDeCampo>)).not.toContain('*');
    expect(html(<RotuloDeCampo obrigatorio>Nome</RotuloDeCampo>)).toContain('*');
  });

  /**
   * A obrigatoriedade chega a quem usa leitor de tela pelo `required` do campo.
   * O asterisco é sinal visual — lido em voz alta, vira "Nome asterisco".
   */
  it('o asterisco fica fora da leitura de tela', () => {
    const saida = html(<RotuloDeCampo obrigatorio>Nome</RotuloDeCampo>);

    expect(saida).toMatch(/<span aria-hidden="true"[^>]*>\*<\/span>/);
  });
});
