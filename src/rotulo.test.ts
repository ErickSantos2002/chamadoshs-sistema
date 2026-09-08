import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A catraca do rótulo que some no breakpoint.
 *
 * ── O defeito, achado por uma FOTO ───────────────────────────────────
 *
 * A captura 3 do Checkpoint 3, em 390 de largura, mostrou o botão reduzido ao
 * ícone. `hidden sm:inline` é `display: none` abaixo de `sm`, e `display: none`
 * **exclui o texto do cálculo do nome acessível**. O ícone é `aria-hidden` por
 * padrão. Não sobra nada: o leitor de tela anuncia "botão", e mais nada.
 *
 * Três sítios estavam assim — `CategoriasTab`, `SetoresTab` e `UsuariosTab` — e
 * o `Dashboard` tinha resolvido o MESMO problema, com `title` e um comentário
 * explicando o porquê. A solução não se propagou. A catraca é o que faz o
 * conhecimento parar de ser local.
 *
 * ── Um caso aqui é regressão de um bug DA PRÓPRIA CATRACA ────────────
 *
 * A primeira versão delimitava a tag com `[^>]*?` e acusava o `Dashboard`, que
 * tem `title`: atributo de JSX carrega `=>` o tempo todo, e
 * `onClick={() => setX(!x)}` fazia a regra parar no primeiro `>` e devolver
 * meia tag, sem os atributos seguintes.
 *
 * É a terceira aparição do mesmo mecanismo nesta semana — `\b` casando
 * `bg-alerta/10`, `[^;]+` engolindo a declaração CSS seguinte, e `[^>]*?`
 * cortando a tag. Nos três, **o delimitador aparece dentro do conteúdo**, e
 * regex não conta aninhamento.
 */

const requerer = createRequire(import.meta.url);
const { achadosDeRotuloSumido } = requerer(
  resolve(__dirname, '../scripts/validar-paleta.js')
) as { achadosDeRotuloSumido: (conteudo: string, rel: string) => string[] };

const achar = (jsx: string) => achadosDeRotuloSumido(jsx, 'x.tsx');

describe('rótulo escondido por breakpoint', () => {
  it('acusa o botão que fica só com o ícone e sem nome', () => {
    const r = achar(`
      <Button onClick={abrir}>
        <IconeMais className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Nova Categoria</span>
      </Button>`);

    expect(r).toHaveLength(1);
    expect(r[0]).toContain('Nova Categoria');
    expect(r[0]).toContain('hidden sm:inline');
  });

  it('não acusa quando há title na tag', () => {
    expect(
      achar(`
      <button title="Criar categoria">
        <IconeMais />
        <span className="hidden sm:inline">Nova Categoria</span>
      </button>`)
    ).toEqual([]);
  });

  it('não acusa quando há aria-label na tag', () => {
    expect(
      achar(`
      <Button aria-label="Nova categoria">
        <IconeMais />
        <span className="hidden sm:inline">Nova Categoria</span>
      </Button>`)
    ).toEqual([]);
  });

  /**
   * A saída preferida, e a que os três sítios adotaram.
   *
   * `sr-only sm:not-sr-only` mantém o texto no nome acessível em TODA largura,
   * sem duplicar a string num atributo que pode divergir do rótulo visível
   * depois — que é justamente o defeito da catraca vizinha, o nome acessível
   * que apaga o conteúdo.
   */
  it('não acusa sr-only sm:not-sr-only, que é a saída preferida', () => {
    expect(
      achar(`
      <Button onClick={abrir}>
        <IconeMais aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Nova Categoria</span>
      </Button>`)
    ).toEqual([]);
  });

  it('não acusa quando há sr-only no corpo, junto do rótulo escondido', () => {
    expect(
      achar(`
      <Button>
        <span className="sr-only">Criar categoria</span>
        <IconeMais />
        <span className="hidden sm:inline">Nova Categoria</span>
      </Button>`)
    ).toEqual([]);
  });
});

describe('a tag é delimitada contando, e não por regex', () => {
  /**
   * REGRESSÃO. Com `[^>]*?` esta tag era cortada no `=>` do `onClick`, o
   * `title` ficava de fora, e a catraca acusava um botão correto.
   *
   * Alarme falso é o lado seguro de errar — mas alarme falso repetido ensina a
   * ignorar a catraca, e aí ela deixa de valer para o dia em que estiver certa.
   */
  it('enxerga o title mesmo com => nos atributos', () => {
    expect(
      achar(`
      <button
        onClick={() => setIncluirCancelados(!incluirCancelados)}
        aria-pressed={incluirCancelados}
        title={incluirCancelados ? 'Ocultar cancelados' : 'Mostrar cancelados'}
      >
        <IconeOlhoFechado className="w-4 h-4" />
        <span className="hidden sm:inline">Cancelados ocultos</span>
      </button>`)
    ).toEqual([]);
  });

  /** E enxerga o rótulo mesmo com chaves aninhadas na className. */
  it('atravessa className com template literal e ${} aninhado', () => {
    const r = achar(
      '<button\n' +
        '  className={`flex ${ativo ? \'bg-sinal\' : \'bg-superficie\'} rounded`}\n' +
        '>\n' +
        '  <IconeMais />\n' +
        '  <span className="hidden sm:inline">Novo Setor</span>\n' +
        '</button>'
    );

    expect(r).toHaveLength(1);
    expect(r[0]).toContain('Novo Setor');
  });

  /** Tag sem corpo não tem rótulo escondido para procurar. */
  it('ignora tag que se fecha sozinha', () => {
    expect(achar('<Button onClick={x} aria-label="Criar" />')).toEqual([]);
  });
});
