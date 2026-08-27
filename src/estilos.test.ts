import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Um elemento com DUAS classes de fundo não tem cor definida — tem sorte.
 *
 * Quando duas classes `bg-*` disputam o mesmo elemento, quem vence é a ordem
 * das regras no CSS que o Tailwind gera, não a ordem no atributo. Foi assim
 * que o cartão de comentário ficou claro no tema escuro: a migração da paleta
 * escreveu `bg-superficie/80` ao lado do `bg-white/80` antigo em vez de no
 * lugar dele, o branco venceu o sorteio, e o nome do autor — em cor de tema
 * escuro — ficou ilegível em cima.
 *
 * O olho não pega isso em revisão: as duas classes parecem uma correção
 * aplicada. Este teste varre todos os `className` estáticos e recusa qualquer
 * um com mais de um preenchimento.
 */

const RAIZ = join(__dirname);

/** Só o código que vai para o bundle — teste não é servido a ninguém. */
function arquivosDeCodigo(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeCodigo(caminho);
    if (/\.test\.tsx?$/.test(nome)) return [];
    return /\.tsx$/.test(nome) ? [caminho] : [];
  });
}

/** Pega o conteúdo de `className="…"` e de `className={\`…\`}`, com quebras. */
const CLASSNAMES = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;

/**
 * Fundo de verdade: pinta o elemento inteiro, sem condição.
 *
 * Fica de fora o que não disputa a mesma tinta — `bg-gradient-*` e as
 * direções `from/via/to` (véu por cima do fundo, como no botão primário),
 * `bg-opacity-*` (modificador, não cor), `bg-no-repeat`/`bg-[length:…]`
 * (posicionamento de imagem) — e qualquer classe com variante (`dark:`,
 * `hover:`, `peer-checked:`): trocar o fundo em outro estado é intenção,
 * não disputa.
 */
function fundos(classes: string): string[] {
  return classes
    .split(/\s+/)
    .filter((c) => /^bg-[a-z]/.test(c))
    .filter(
      (c) =>
        !/^bg-(gradient|opacity|no-repeat|cover|contain|center|repeat)/.test(c)
    );
}

/**
 * Separa o que é INCONDICIONAL do que são ALTERNATIVAS.
 *
 * Um `className` de template pode conter os dois lados de um ternário, cada
 * lado numa string entre aspas:
 *
 *   className={`border px-3 ${ativo ? 'bg-sinal' : 'bg-superficie-elevada'}`}
 *
 * Ali há dois `bg-*` no mesmo texto e nenhuma disputa: eles nunca chegam
 * juntos ao elemento. Contar tudo num monte só acusava esse caso.
 *
 * Ele passou despercebido por muito tempo por acidente: a varredura quebra o
 * texto por espaço, e o primeiro token de cada lado do ternário vem colado na
 * aspa (`'bg-sinal`), o que não casa com `^bg-`. Enquanto o fundo fosse a
 * primeira classe de cada lado, o teste não via nenhum dos dois. Bastou uma
 * refatoração pôr `border-*` antes do `bg-*` para os dois aparecerem — e o
 * teste acusar um defeito que não existe.
 *
 * A separação abaixo é o que o teste sempre quis dizer: o primeiro grupo é o
 * que se aplica sempre; cada grupo seguinte é uma alternativa.
 */
function grupos(conteudo: string): string[] {
  const alternativas = [...conteudo.matchAll(/'([^']*)'|"([^"]*)"/g)].map(
    (m) => m[1] ?? m[2] ?? ''
  );
  const incondicional = conteudo.replace(/'[^']*'|"[^"]*"/g, ' ');

  return [incondicional, ...alternativas];
}

describe('classes de fundo', () => {
  const arquivos = arquivosDeCodigo(RAIZ);

  it('encontra os arquivos de código para varrer', () => {
    // Sem esta checagem, um erro de caminho faria a suíte passar varrendo nada.
    expect(arquivos.length).toBeGreaterThan(20);
  });

  it('nenhum elemento tem dois fundos disputando', () => {
    const infratores: string[] = [];

    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, 'utf-8');

      for (const casamento of conteudo.matchAll(CLASSNAMES)) {
        const classes = casamento[1] ?? casamento[2] ?? '';
        const [sempre, ...alternativas] = grupos(classes).map(fundos);

        // Disputa de verdade é uma destas três:
        //  - dois fundos aplicados sempre;
        //  - um fundo fixo e outro condicional por cima dele;
        //  - dois fundos dentro do MESMO lado de um ternário.
        const disputa =
          sempre.length > 1
            ? sempre
            : sempre.length === 1 && alternativas.some((a) => a.length > 0)
              ? [...sempre, ...alternativas.flat()]
              : (alternativas.find((a) => a.length > 1) ?? []);

        if (disputa.length > 1) {
          infratores.push(
            `${arquivo.replace(RAIZ, 'src')}: ${disputa.join(' + ')}`
          );
        }
      }
    }

    expect(infratores).toEqual([]);
  });
});

/**
 * O mesmo defeito dos dois fundos, noutra propriedade.
 *
 * O quadro de chamados saiu do redesenho com `min-h-[26rem] min-h-0` no mesmo
 * elemento. As duas escrevem `min-height`, e quem vencia era a ordem das
 * regras no CSS gerado — não a ordem no atributo. Ninguém pega isso em revisão
 * pelo mesmo motivo do caso anterior: as duas parecem uma correção aplicada.
 *
 * A varredura fica nas famílias que mapeiam para UMA propriedade só e sem
 * ambiguidade. `border-l-4 border-borda` é par legítimo (largura e cor), e
 * `p-2 px-4` é sobrescrita deliberada — nenhum dos dois entra aqui.
 */
const FAMILIAS_EXCLUSIVAS = ['min-h', 'min-w', 'max-h', 'max-w'];

/**
 * Classes de uma família, ignorando as que têm variante.
 *
 * Variante (`sm:`, `dark:`, `hover:`) é intenção: mudar a medida noutro
 * tamanho de tela ou noutro estado é o uso normal do Tailwind, não disputa.
 */
function daFamilia(classes: string, familia: string): string[] {
  return classes
    .split(/\s+/)
    .filter((c) => !c.includes(':'))
    .filter((c) => new RegExp(`^${familia}-`).test(c));
}

describe('medidas duplicadas', () => {
  const arquivos = arquivosDeCodigo(RAIZ);

  it.each(FAMILIAS_EXCLUSIVAS)(
    'nenhum elemento tem dois %s- disputando',
    (familia) => {
      const infratores: string[] = [];

      for (const arquivo of arquivos) {
        const conteudo = readFileSync(arquivo, 'utf-8');

        for (const casamento of conteudo.matchAll(CLASSNAMES)) {
          const classes = casamento[1] ?? casamento[2] ?? '';
          const disputa = daFamilia(classes, familia);

          if (disputa.length > 1) {
            infratores.push(
              `${arquivo.replace(RAIZ, 'src')}: ${disputa.join(' + ')}`
            );
          }
        }
      }

      expect(infratores).toEqual([]);
    }
  );
});
