import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A catraca da cópia de token, depois de 09/09/2026.
 *
 * ── O defeito que estes casos existem para não ter de volta ──────────
 *
 * A versão anterior só sabia ler COMENTÁRIO: acusava uma linha quando ela tinha
 * hexadecimal **e** um `--token` anotado ao lado. E o texto dela afirmava, por
 * escrito, que `CATEGORICA_*` "não é cópia de token nenhum", porque "o que as
 * distingue é justamente não nomearem token de origem".
 *
 * `CATEGORICA_CLARA` e `CATEGORICA_ESCURA` são cópia literal de `--chart-1` a
 * `--chart-5`, nos dois temas. Dez valores idênticos, no arquivo que a catraca
 * lia, e ela imprimia `0 linha(s)`.
 *
 * Não era trava fraca. Era **trava que afirmava o contrário do que media**, e o
 * nome dela — "a cópia de token não voltou" — era asserção forte sobre algo que
 * ela nunca chegou a verificar. Não nomear o token de origem nunca foi prova de
 * não ser cópia; é só a cópia sem etiqueta.
 *
 * ── Por que são DOIS detectores, e por que nenhum sai ────────────────
 *
 * O caso `derivada` abaixo é o que impede alguém de "simplificar" isto para um
 * detector só. Uma cópia que DERIVOU não bate mais por valor — foi exatamente o
 * que a E14 fez com a moldura —, e a partir daquele instante só o comentário
 * denuncia. Um pega a cópia fiel, o outro a infiel.
 *
 * ── Por que não é fixture em arquivo ─────────────────────────────────
 *
 * Pelo mesmo motivo do `ramos.test.ts`: a varredura lê todo `.ts`/`.tsx` que
 * não seja teste, então um arquivo de amostra com uma cópia dentro faria a
 * catraca reprovar para sempre.
 */

const requerer = createRequire(import.meta.url);
const { achadosDeCopiaDeToken, indiceDoPacote } = requerer(
  resolve(__dirname, '../scripts/validar-paleta.js')
) as {
  achadosDeCopiaDeToken: (
    conteudo: string,
    rel: string,
    indice: Map<string, string[]>
  ) => { identidade: string; texto: string }[];
  indiceDoPacote: () => Map<string, string[]>;
};

const indice = indiceDoPacote();
const achar = (fonte: string) => achadosDeCopiaDeToken(fonte, 'amostra.ts', indice);

/** Um valor que o índice do pacote realmente conhece, lido dele mesmo. */
const [umHexDoPacote] = [...indice.keys()];

describe('o índice do pacote', () => {
  it('indexa por valor, e conhece os --chart-*', () => {
    expect(indice.get('#174e8c')).toContain('claro:--chart-1');
    expect(indice.get('#4e86c6')).toContain('escuro:--chart-1');
  });

  /**
   * Resolve `var()` antes de indexar: cópia de alias tem de contar igual a
   * cópia de degrau, senão bastaria copiar o alias para escapar.
   */
  it('resolve o alias até o valor', () => {
    expect(indice.get('#ef4444')).toEqual(
      expect.arrayContaining(['claro:--color-danger-500', 'claro:--fill-danger'])
    );
  });
});

describe('detector por VALOR — a cópia fiel', () => {
  it('acusa o hexadecimal idêntico ao token, sem comentário nenhum', () => {
    const achados = achar("export const P = ['#174E8C'];");

    expect(achados).toHaveLength(1);
    expect(achados[0].texto).toContain('claro:--chart-1');
  });

  it('não se importa com a caixa do hexadecimal', () => {
    expect(achar("const a = '#174e8c';")).toHaveLength(1);
    expect(achar("const a = '#174E8C';")).toHaveLength(1);
  });

  /**
   * O caso que separa medição de uso. `SlaProgresso.tsx` documenta contrastes
   * citando `--fill-success` (#059669) em prosa; acusá-lo seria a catraca
   * cobrando de quem se deu ao trabalho de registrar a medida.
   */
  it('IGNORA hexadecimal citado em comentário de prosa', () => {
    expect(achar('// --fill-danger (#ef4444) sobe para 3,77\nconst a = 1;')).toHaveLength(0);
    expect(achar('/**\n * O #174E8C do pacote.\n */\nconst a = 1;')).toHaveLength(0);
  });

  it('não acusa cor que não é de token nenhum', () => {
    expect(achar("const a = '#123456';")).toHaveLength(0);
  });
});

describe('detector por COMENTÁRIO — a cópia que derivou', () => {
  /**
   * O caso que impede a fusão dos dois detectores. O valor NÃO está no índice —
   * derivou — e mesmo assim é cópia, porque a intenção ficou escrita ao lado.
   */
  it('acusa valor fora do índice quando o comentário nomeia o token', () => {
    const achados = achar("const a = '#174E8D'; // --chart-1 do pacote");

    expect(achados).toHaveLength(1);
    expect(achados[0].texto).toContain('anotado no comentário');
  });

  it('e o valor sozinho, sem token no comentário, não basta', () => {
    expect(achar("const a = '#174E8D'; // azul profundo")).toHaveLength(0);
  });
});

describe('as duas razões na mesma linha', () => {
  /**
   * Uma linha que caia nos dois detectores sai UMA vez, com as duas razões.
   * Sair duas vezes se leria como dois defeitos, e a contagem da catraca é o
   * que decide se ela reprova.
   */
  it('a linha aparece uma vez só, com as duas razões juntas', () => {
    const achados = achar("const a = '#174E8C'; // --chart-1");

    expect(achados).toHaveLength(1);
    expect(achados[0].texto).toContain('é o valor de');
    expect(achados[0].texto).toContain('anotado no comentário');
  });
});

describe('a identidade, que é o que a linha de base congela', () => {
  /**
   * Sem número de linha, de propósito: a primeira reformatação moveria todas as
   * dez e a linha de base viraria dez falsos alarmes de uma vez.
   */
  it('não muda quando a linha se move', () => {
    const [a] = achar("const a = '#174E8C';");
    const [b] = achar("\n\n\nconst a = '#174E8C';");

    expect(a.identidade).toBe(b.identidade);
    expect(a.texto).not.toBe(b.texto);
  });

  /** E ainda distingue cópias diferentes no mesmo arquivo. */
  it('muda quando é outra cópia', () => {
    const [a] = achar("const a = '#174E8C';");
    const [b] = achar("const b = '#91633B';");

    expect(a.identidade).not.toBe(b.identidade);
  });
});

describe('a varredura enxerga o repositório, e não um arquivo', () => {
  /**
   * A versão anterior lia SÓ `src/lib/graficos.ts`. Uma cópia em qualquer outro
   * arquivo passava — e o nome da catraca não dizia isso.
   */
  it('o nome do arquivo entra na identidade, venha de onde vier', () => {
    const achados = achadosDeCopiaDeToken(
      "const a = '#174E8C';",
      'src/pages/QualquerUma.tsx',
      indice
    );

    expect(achados[0].identidade).toContain('src/pages/QualquerUma.tsx');
  });

  /** E o índice não está vazio — catraca com índice vazio nunca acusa nada. */
  it('o índice do pacote não nasce vazio', () => {
    expect(indice.size).toBeGreaterThan(20);
    expect(umHexDoPacote).toMatch(/^#[0-9a-f]{6}$/);
  });
});
