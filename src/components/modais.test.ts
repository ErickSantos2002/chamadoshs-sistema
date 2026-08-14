import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * As ações dos modais saíram de dentro do formulário e foram para o rodapé
 * fixo — o botão de salvar precisa estar visível sem rolar, e é a promessa que
 * o componente `Modal` faz no próprio cabeçalho.
 *
 * A troca criou um risco novo, e é um risco SILENCIOSO: um `<button
 * type="submit">` fora do `<form>` não envia nada. Não dá erro, não avisa, não
 * quebra teste de tipo. A pessoa clica em Salvar e a janela simplesmente não
 * faz nada. O que liga um ao outro é o atributo `form`, e é ele que este teste
 * vigia.
 *
 * Sem biblioteca de renderização não dá para clicar no botão e ver se salvou.
 * Dá para exigir que os dois lados do laço existam em cada arquivo.
 */

const SRC = join(__dirname, '..');

/** Os modais cujas ações vivem no rodapé, fora do formulário. */
const MODAIS = [
  'components/cadastros/CategoriaModal.tsx',
  'components/cadastros/SetorModal.tsx',
  'components/cadastros/UsuarioModal.tsx',
  'components/ModalTrocarSenha.tsx',
];

const ler = (caminho: string) => readFileSync(join(SRC, caminho), 'utf-8');

describe('ações dos modais', () => {
  it.each(MODAIS)('%s põe as ações no rodapé fixo', (arquivo) => {
    const conteudo = ler(arquivo);

    expect(conteudo, 'não usa a prop `rodape` do Modal').toContain('rodape=');
    // Um `justify-end` solto dentro do formulário é o padrão antigo voltando:
    // botões desenhados junto dos campos, rolando com eles.
    expect(conteudo, 'voltou a desenhar botões dentro do corpo').not.toMatch(
      /className="flex justify-end gap-2 pt-2"/
    );
  });

  it.each(MODAIS)('%s liga o botão de envio ao formulário', (arquivo) => {
    const conteudo = ler(arquivo);

    const declara = conteudo.match(/const ID_DO_FORM = '([^']+)'/);
    expect(declara, 'não declara ID_DO_FORM').not.toBeNull();

    // Os dois lados do laço: o formulário carrega o id, o botão aponta para ele.
    expect(conteudo, 'o <form> não recebe o id').toContain('id={ID_DO_FORM}');
    expect(conteudo, 'o botão de envio não aponta para o formulário').toContain(
      'form={ID_DO_FORM}'
    );
  });

  it('cada modal usa um id próprio', () => {
    // Dois formulários com o mesmo id na mesma página fazem o botão de um
    // enviar o outro. Hoje não abrem juntos, mas nada impede que passem a abrir.
    const ids = MODAIS.map(
      (arquivo) => ler(arquivo).match(/const ID_DO_FORM = '([^']+)'/)?.[1]
    );

    expect(new Set(ids).size).toBe(MODAIS.length);
  });
});
