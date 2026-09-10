import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * A catraca de contraste, dentro da suíte.
 *
 * ── Por que ela precisava entrar aqui ────────────────────────────────
 *
 * `npm run validar:paleta` era um comando à parte, e por isso alguém precisava
 * lembrar de rodá-lo. Em 03/09/2026 ninguém lembrou: a catraca ficou
 * **vermelha por três commits** depois de um par ter sido consertado, porque a
 * linha de base precisava descer e eu rodei `typecheck` e `test` e não ela.
 *
 * O detalhe que torna o caso instrutivo é que ela estava avisando de um
 * ACERTO. A catraca falha nos dois sentidos de propósito — em par novo e em
 * par removido —, para a linha de base só poder encolher e nunca crescer em
 * silêncio. Uma verificação que só é confiável quando alguém lembra dela não é
 * uma verificação; é um lembrete.
 *
 * ── Por que um processo, e não importar o script ─────────────────────
 *
 * `scripts/validar-paleta.js` é CommonJS, lê arquivos por caminho relativo à
 * raiz e termina com `process.exit(1)`. Importá-lo dentro do vitest derrubaria
 * o processo do teste inteiro na primeira falha, e o relatório mostraria um
 * crash em vez de um caso reprovado.
 *
 * Rodando em processo filho, a falha vira um teste vermelho com a saída do
 * script anexada — que é exatamente o que a catraca precisa mostrar, porque
 * ela imprime a lista corrigida pronta para colar.
 *
 * ── O que este teste NÃO faz ─────────────────────────────────────────
 *
 * Não repete a medição de contraste. Ela vive no script, e duplicá-la aqui
 * criaria a segunda fonte de verdade que a §5.4 proíbe — com o agravante de
 * que as duas poderiam divergir e ninguém saberia qual acreditar.
 *
 * Este arquivo tem uma responsabilidade só: garantir que a catraca **corra**.
 */

const RAIZ = resolve(__dirname, '..');

describe('catraca de contraste', () => {
  it('a paleta valida, e a linha de base não subiu', () => {
    const r = spawnSync(process.execPath, ['scripts/validar-paleta.js'], {
      cwd: RAIZ,
      encoding: 'utf-8',
    });

    if (r.status !== 0) {
      // A saída do script vai junto: ela traz o motivo e, quando a linha de
      // base precisa descer, a lista inteira pronta para colar em
      // `PARES_CONHECIDOS`. Sem isto o teste diria "falhou" e faria a pessoa
      // rodar o comando de novo à mão para descobrir o quê.
      throw new Error(
        'npm run validar:paleta reprovou.\n\n' +
          (r.stdout ?? '') +
          '\n' +
          (r.stderr ?? '')
      );
    }

    expect(r.status).toBe(0);
  }, 30000);
});
