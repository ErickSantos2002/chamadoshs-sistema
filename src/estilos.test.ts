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
        const disputa = fundos(classes);

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
