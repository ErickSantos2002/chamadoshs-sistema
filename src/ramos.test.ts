import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

/**
 * A expansão em ramos da varredura de paleta.
 *
 * ── As duas armadilhas que ela precisa fechar ao mesmo tempo ─────────
 *
 * **Armadilha 4 — o falso positivo.** Um `${a ? 'X' : 'Y'}` põe dois ramos de
 * ternário no mesmo literal. Parear entre eles conta um par que não existe em
 * pixel nenhum: os dois nunca estão na tela juntos. Foi o defeito da Fase 7,
 * que acusou `Dashboard.tsx:494` com 2,18:1 — um número que nenhuma pessoa
 * jamais viu.
 *
 * **O falso negativo que o conserto dela criou.** A correção da Fase 7 foi
 * descartar o conteúdo das interpolações. Isso fecha a armadilha 4 e abre um
 * buraco: uma classe de texto no trecho ESTÁTICO nunca encontra a classe de
 * fundo que está dentro de um ramo.
 *
 * O caso real, achado por LEITURA e não por esta varredura, no botão de
 * arquivar de `ChamadoDetalhes`:
 *
 *     `... text-white ... ${arquivado ? 'bg-sucesso ...' : 'bg-alerta-forte ...'}`
 *
 * `bg-sucesso` com branco dá **2,54:1**. A catraca chegou a ZERO com esse
 * defeito vivo, e teria continuado a passar.
 *
 * ── Por que este arquivo existe ──────────────────────────────────────
 *
 * As duas armadilhas puxam para lados opostos: fechar uma abre a outra, e foi
 * exatamente o que aconteceu entre a Fase 7 e a 15. Uma correção que só resolva
 * a que está doendo hoje volta a quebrar a outra na próxima passagem.
 *
 * Estes casos travam as duas juntas. Não podem virar fixture em `src/`: a
 * varredura lê todo `.tsx` que não seja teste, então um arquivo de amostra com
 * um par ruim faria a catraca reprovar para sempre.
 */

const requerer = createRequire(import.meta.url);
const { ramosDoTemplate } = requerer(
  resolve(__dirname, '../scripts/validar-paleta.js')
) as { ramosDoTemplate: (t: string) => string[] };

/** Um ramo que contenha todas as classes pedidas. */
const algumRamoCom = (ramos: string[], ...classes: string[]) =>
  ramos.some((r) => classes.every((c) => new RegExp(`(^|\\s)${c}(\\s|$)`).test(r)));

describe('ramosDoTemplate', () => {
  it('junta o estático com cada ramo — o botão de arquivar', () => {
    const literal =
      'flex items-center gap-2 rounded-lg px-4 py-2\n' +
      'text-sm font-semibold text-white transition-colors\n' +
      'disabled:opacity-50 ${\n' +
      "  arquivado\n    ? 'bg-sucesso hover:bg-sucesso-forte'\n" +
      "    : 'bg-alerta-forte hover:brightness-110'\n}";

    const ramos = ramosDoTemplate(literal);

    // O par que a versão anterior não via.
    expect(algumRamoCom(ramos, 'text-white', 'bg-sucesso')).toBe(true);
    expect(algumRamoCom(ramos, 'text-white', 'bg-alerta-forte')).toBe(true);
  });

  it('NUNCA junta dois ramos do mesmo ternário — a armadilha 4', () => {
    const ramos = ramosDoTemplate("px-2 ${ativo ? 'bg-perigo' : 'text-white'}");

    // Cada um aparece sozinho...
    expect(algumRamoCom(ramos, 'bg-perigo')).toBe(true);
    expect(algumRamoCom(ramos, 'text-white')).toBe(true);
    // ...e nunca no mesmo ramo, porque são alternativas excludentes.
    expect(algumRamoCom(ramos, 'bg-perigo', 'text-white')).toBe(false);
  });

  it('a classe de um `&&` pode não aparecer, e o ramo sem ela existe', () => {
    const ramos = ramosDoTemplate("bg-perigo ${erro && 'text-white'}");

    expect(algumRamoCom(ramos, 'bg-perigo', 'text-white')).toBe(true);
    // O ramo em que a condição é falsa também precisa existir: é ele que
    // descreve a tela quando não há erro.
    expect(ramos.some((r) => !/text-white/.test(r) && /bg-perigo/.test(r))).toBe(true);
  });

  it('interpolações DIFERENTES podem valer juntas', () => {
    // `cn(a && 'bg-x', b && 'text-white')` aplica as duas quando as duas
    // condições valem — elas não são ramos uma da outra.
    const ramos = ramosDoTemplate("${a && 'bg-perigo'} ${b && 'text-white'}");
    expect(algumRamoCom(ramos, 'bg-perigo', 'text-white')).toBe(true);
  });

  it('conta chaves, e não corta no primeiro fecha-chaves', () => {
    // Armadilha 8: `cn({ ativo }, '...')` tem chaves DENTRO da interpolação.
    // Cortar no primeiro `}` misturaria pedaços de ramos diferentes.
    const ramos = ramosDoTemplate("px-2 ${cn({ ativo }, 'bg-perigo')} text-white");
    expect(algumRamoCom(ramos, 'bg-perigo', 'text-white')).toBe(true);
  });

  it('um literal sem interpolação nenhuma volta inteiro', () => {
    const ramos = ramosDoTemplate('bg-perigo text-white px-2');
    expect(ramos).toHaveLength(1);
    expect(algumRamoCom(ramos, 'bg-perigo', 'text-white')).toBe(true);
  });
});
