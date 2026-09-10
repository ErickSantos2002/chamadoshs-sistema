import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A ponte do D3-a contra o pacote.
 *
 * ── O defeito que a catraca existe para pegar ────────────────────────
 *
 * `src/styles/index.css` declara os tokens em português em canais `R G B`,
 * porque o Tailwind exige isso para o modificador de opacidade —
 * `rgb(#2a4463 / 0.3)` não é CSS válido. É o desvio D3-a, aprovado.
 *
 * O preço é que **o valor existe duas vezes**. E o modo de falha é o pior
 * possível: os dois arquivos ficam sintaticamente perfeitos, o
 * `Compare-Object` dos seis arquivos de token dá "sem diferença", e a tela
 * pinta o valor antigo.
 *
 * Aconteceu em 04/09/2026, na recópia da E14: os seis hashes bateram com o
 * pacote e **nada mudaria de cor**. A ponte esteve dois valores atrás por uma
 * tarde. Já tinha acontecido na E5, e a lição foi anotada e não instrumentada.
 *
 * ── O que este arquivo testa, e o que a catraca testa ────────────────
 *
 * A conferência dos 32 pares reais roda no script, e o `paleta.test.ts` já a
 * executa. O que fica aqui é a parte **sutil** da leitura, que é onde uma
 * regressão passaria despercebida: a resolução de `var()` em cadeia e a queda
 * do `.dark` para o `:root`.
 *
 * Os casos dirigem as funções por STRING, e não por arquivo: um CSS de amostra
 * dentro de `src/` seria varrido pelas outras regras da catraca.
 */

const requerer = createRequire(import.meta.url);
const { pacoteDeTokens, resolverDoPacote } = requerer(
  resolve(__dirname, '../scripts/validar-paleta.js')
) as {
  pacoteDeTokens: (css: string) => Record<string, Record<string, string>>;
  resolverDoPacote: (
    pacote: Record<string, Record<string, string>>,
    nome: string,
    tema: string
  ) => number[] | null;
};

const CSS = `
:root {
  --color-slate-200: #e2e8f0;
  --color-danger-500: #ef4444;
  --border-color: var(--color-slate-200);
  --apelido: var(--border-color);
  --circular-a: var(--circular-b);
  --circular-b: var(--circular-a);
  --nao-e-cor: 2px solid red;
}

.dark {
  --border-color: #2a4463;
}
`;

const pacote = pacoteDeTokens(CSS);
const resolver = (nome: string, tema: string) =>
  resolverDoPacote(pacote, nome, tema);

describe('leitura do pacote — resolução de token', () => {
  it('segue um `var()` até o hexadecimal', () => {
    expect(resolver('--border-color', ':root')).toEqual([226, 232, 240]);
  });

  it('segue uma CADEIA de `var()`', () => {
    // `--apelido` → `--border-color` → `--color-slate-200` → hex.
    expect(resolver('--apelido', ':root')).toEqual([226, 232, 240]);
  });

  it('o `.dark` vence o `:root` quando redefine', () => {
    expect(resolver('--border-color', '.dark')).toEqual([42, 68, 99]);
  });

  /**
   * A queda para o `:root` NÃO é conveniência: é o que a cascata do CSS faz.
   *
   * Os degraus da rampa e as cores de significado vivem só no `:root` de
   * propósito — rampa não tem tema, e o `.dark` troca qual degrau um alias
   * aponta, nunca o valor do degrau. Sem a queda, metade dos pares do tema
   * escuro seria acusada de "não resolve", e a catraca reprovaria a verdade.
   */
  it('cai no `:root` quando o `.dark` não redefine', () => {
    expect(resolver('--color-danger-500', '.dark')).toEqual([239, 68, 68]);
  });

  it('devolve nulo, e não um palpite, para o que não é cor', () => {
    // Uma catraca que chuta um valor aqui acusaria divergência inventada.
    expect(resolver('--nao-e-cor', ':root')).toBeNull();
    expect(resolver('--inexistente', ':root')).toBeNull();
  });

  /**
   * Referência circular não pode travar a varredura.
   *
   * Um `var()` que aponta para si mesmo é CSS inválido, mas o arquivo continua
   * sendo lido — e uma recursão sem teto derrubaria o processo com pilha
   * estourada, que na saída aparece como "a catraca quebrou" e não como "o CSS
   * está errado".
   */
  it('não entra em laço com referência circular', () => {
    expect(resolver('--circular-a', ':root')).toBeNull();
  });
});
