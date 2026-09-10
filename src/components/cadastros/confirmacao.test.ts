import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A guarda de confirmação, nas TRÊS abas de cadastro.
 *
 * ── Por que um teste sobre os arquivos, e não sobre o comportamento ──
 *
 * O comportamento está travado em `CategoriasTab.test.tsx`, que monta a aba e
 * prova que armar numa linha não apaga a outra. Este arquivo responde uma
 * pergunta diferente, e que aquele não alcança: **as outras duas abas ainda
 * têm a mesma linha?**
 *
 * `SetoresTab` e `UsuariosTab` são cópias estruturais da `CategoriasTab`, e o
 * defeito estava nas três, idêntico. Montar as duas com dublê de contexto só
 * para reverificar uma linha custaria dois arquivos de teste e provaria menos:
 * o risco real não é alguém quebrar o comportamento de uma delas, é alguém
 * corrigir uma e esquecer as outras — que foi como o defeito nasceu.
 *
 * ── A linha é literal de propósito ───────────────────────────────────
 *
 * O mesmo `if (confirmDelete !== id) {` vai para a `main` como hotfix, por
 * outra sessão, em worktree. Escrever a comparação de outro jeito em qualquer
 * um dos três — `id !== confirmDelete`, ou com o `id` guardado numa variável —
 * faria o merge conflitar sem necessidade. O teste trava a forma, não só o
 * efeito.
 */

const RAIZ = resolve(__dirname, '.');

const ABAS = ['CategoriasTab.tsx', 'SetoresTab.tsx', 'UsuariosTab.tsx'];

const LINHA = 'if (confirmDelete !== id) {';

/** A forma antiga, que apagava a linha errada. */
const LINHA_ANTIGA = 'if (!confirmDelete) {';

describe('guarda de confirmação nas abas de cadastro', () => {
  it('as três usam a mesma linha, literal', () => {
    const semAGuarda: string[] = [];

    for (const aba of ABAS) {
      const fonte = readFileSync(resolve(RAIZ, aba), 'utf-8');
      if (!fonte.includes(LINHA)) semAGuarda.push(aba);
    }

    expect(semAGuarda).toEqual([]);
  });

  it('nenhuma voltou à guarda global', () => {
    const comAFormaAntiga: string[] = [];

    for (const aba of ABAS) {
      const fonte = readFileSync(resolve(RAIZ, aba), 'utf-8');
      if (fonte.includes(LINHA_ANTIGA)) comAFormaAntiga.push(aba);
    }

    // `if (!confirmDelete)` é verdadeiro para QUALQUER confirmação aberta, não
    // só a desta linha — e também para o id 0, que nenhuma tabela usa hoje mas
    // que travaria a confirmação para sempre se um dia usasse.
    expect(comAFormaAntiga).toEqual([]);
  });
});
