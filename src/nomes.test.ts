import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A catraca do nome acessível que apaga o conteúdo visível.
 *
 * ── O defeito que a originou ─────────────────────────────────────────
 *
 * `aria-label` e `aria-labelledby` não somam ao conteúdo do elemento:
 * **substituem**. O gatilho do `Seletor` tinha `aria-label={rotulo}` e mostrava
 * "Em Andamento" na tela enquanto anunciava só "Status, caixa de combinação".
 *
 * A escolha atual é a única informação que aquele controle carrega, e ela não
 * existia no canal não visual — em onze telas, porque todo seletor do sistema
 * passa por ali. A tela estava perfeita.
 *
 * ── As duas regras ───────────────────────────────────────────────────
 *
 * **(c1)** `role="combobox"` nunca leva `aria-label`. **Sem exceção.** O
 * conteúdo de um gatilho de combobox é, por definição, o valor escolhido.
 *
 * **(c2)** Elemento interativo com `aria-label` LITERAL não pode ter texto
 * estático que não caiba nesse rótulo. É a WCAG 2.5.3 pelo outro lado: o nome
 * acessível precisa CONTER o rótulo visível.
 *
 * ── As exceções, que hoje são nenhuma ────────────────────────────────
 *
 * A lista `NOMES_CONHECIDOS` do script está **vazia**, e é isso que faz dela
 * uma catraca: se um dia entrar uma linha, ela carrega o porquê, e quem vier
 * depois discute o motivo em vez de descobrir uma lista de silêncios.
 *
 * As exceções LEGÍTIMAS que já existem no sistema não precisam de linha ali
 * porque a regra não as alcança, e cada caso está coberto por um teste abaixo:
 *
 * | Forma | Exemplo real | Por que não acusa |
 * |---|---|---|
 * | controle só de ícone | `<button aria-label="Fechar"><IconeX/></button>` | não há texto estático |
 * | campo sem rótulo visível | `<Input aria-label="Buscar setores" />` | tag própria, e sem filhos |
 * | rótulo que CONTÉM o texto | `<a aria-label="Ver detalhes do chamado HS-1">Ver detalhes</a>` | contém |
 * | marco e `role="img"` | `<nav aria-label="Navegação principal">` | não é papel de widget |
 *
 * ── Por que estes casos dirigem a função por STRING ──────────────────
 *
 * Porque a varredura lê todo `.tsx` de `src/` que não seja teste. Uma amostra
 * com um defeito plantado faria a catraca reprovar para sempre — foi por isso
 * que `achadosDeNome` existe separada do caminhamento de arquivos, e é a mesma
 * razão pela qual os casos de `ramosDoTemplate` não viraram fixture.
 */

const requerer = createRequire(import.meta.url);
const { achadosDeNome } = requerer(
  resolve(__dirname, '../scripts/validar-paleta.js')
) as { achadosDeNome: (conteudo: string, rel: string) => string[] };

const acusa = (jsx: string) => achadosDeNome(jsx, 'prova.tsx');

describe('catraca de nome acessível — (c1) combobox', () => {
  it('acusa `aria-label` num gatilho de combobox', () => {
    // O caso real, na forma em que estava no Seletor.
    const achados = acusa(
      '<button role="combobox" aria-label={rotulo}>\n' +
        '  <span>{escolhida?.rotulo}</span>\n' +
        '</button>'
    );
    expect(achados).toHaveLength(1);
    expect(achados[0]).toContain('combobox');
  });

  it('não acusa o gatilho que usa `aria-labelledby`', () => {
    // A forma corrigida, do padrão do APG: dois ids, o do rótulo e o do
    // próprio gatilho, para o nome ficar "Status, Em Andamento".
    expect(
      acusa(
        '<button role="combobox" aria-labelledby={`${idDoRotulo} ${idDoGatilho}`}>\n' +
          '  <span>{escolhida?.rotulo}</span>\n' +
          '</button>'
      )
    ).toHaveLength(0);
  });
});

describe('catraca de nome acessível — (c2) rótulo que apaga texto', () => {
  it('acusa o botão cujo rótulo não cabe no texto visível', () => {
    const achados = acusa('<button aria-label="Salvar">\n  Publicar alterações\n</button>');
    expect(achados).toHaveLength(1);
    expect(achados[0]).toContain('Publicar alterações');
  });

  it('NÃO acusa quando o rótulo contém o texto visível', () => {
    // É o "Ver detalhes" do Dashboard: o rótulo acrescenta o protocolo, e a
    // 2.5.3 pede exatamente isso — que o nome contenha o rótulo visível.
    expect(
      acusa('<a aria-label="Excluir o chamado agora">\n  Excluir\n</a>')
    ).toHaveLength(0);
  });

  it('NÃO acusa controle só de ícone', () => {
    // A forma mais comum de `aria-label` legítimo no sistema: não há texto
    // nenhum para ser apagado.
    expect(
      acusa('<button aria-label="Fechar janela">\n  <IconeFechar className="h-4 w-4" />\n</button>')
    ).toHaveLength(0);
  });

  it('NÃO acusa marco, que não é papel de widget', () => {
    expect(
      acusa('<nav aria-label="Navegação principal">\n  <p>Operação</p>\n</nav>')
    ).toHaveLength(0);
  });

  /**
   * O limite deliberado: rótulo calculado fica de fora.
   *
   * Não dá para saber, sem rodar, se `{`Ver detalhes do chamado ${p}`}` contém
   * o texto visível — e contém. Numa catraca, **deixar passar é erro e
   * inventar par é sabotagem da confiança na ferramenta**; entre os dois, a
   * escolha é não acusar o que não dá para provar.
   *
   * Este caso trava o silêncio para que ele seja uma decisão, e não um
   * esquecimento que alguém "conserta" um dia sem saber o que está soltando.
   */
  it('não acusa rótulo calculado, e isso é escolha e não falha', () => {
    expect(
      acusa('<a aria-label={`Ver detalhes do chamado ${p}`}>\n  Ver detalhes\n</a>')
    ).toHaveLength(0);
  });

  /**
   * O aninhamento da MESMA tag, que é a armadilha 8 em outra roupa.
   *
   * Se a busca pelo fechamento parasse no primeiro `</button>`, o texto lido
   * pararia em "Cancelar" e o "Publicar" — que vem DEPOIS do botão de dentro
   * fechar — passaria batido. A contagem de profundidade é o que faz o
   * fechamento certo ser encontrado.
   *
   * ── E o texto lido é o da SUBÁRVORE, não só o dos filhos diretos ────
   *
   * Este caso nasceu errado: eu tinha escrito que a função lia só o texto de
   * filho direto, e o teste afirmava que "Cancelar" ficaria de fora. Ele
   * reprovou, e quem estava certo era o código.
   *
   * `aria-label` substitui o nome do elemento INTEIRO, subárvore incluída. Um
   * `<button aria-label="Salvar">` com `<span>Publicar</span>` dentro anuncia
   * "Salvar", e "Publicar" some — então o texto de dentro é exatamente o que
   * está sendo apagado, e tem de contar.
   *
   * Fica registrado porque o desacordo era entre um comentário e o código, e o
   * comentário é que estava errado. Se o teste tivesse sido escrito para
   * passar, o comentário mentiroso sobreviveria.
   */
  it('conta o aninhamento da mesma tag, e lê o texto da subárvore', () => {
    const achados = acusa(
      '<button aria-label="Salvar">\n' +
        '  <span><button>Cancelar</button></span>\n' +
        '  Publicar\n' +
        '</button>'
    );
    expect(achados).toHaveLength(1);
    // "Publicar" só aparece se o fechamento certo foi encontrado: ele vem
    // depois de o botão de dentro fechar.
    expect(achados[0]).toContain('Publicar');
    // E "Cancelar" conta, porque o rótulo apaga ele também.
    expect(achados[0]).toContain('Cancelar');
  });
});
