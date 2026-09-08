import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

/**
 * A sonda recusa medir uma página que não é do ChamadosHS.
 *
 * ── O incidente, que já aconteceu e me nomeia ────────────────────────
 *
 * Duas aplicações Vite convivem nesta máquina, e as duas nasciam na porta
 * 5173. Sem `strictPort` o Vite escorrega calado para a 5174, e quem cravou o
 * endereço abraça o servidor do OUTRO produto.
 *
 * A suíte e2e do HelpHS, cravada na 5173 com `reuseExistingServer`, rodou
 * contra **este** sistema — que respondia `<title>ChamadosHS</title>` e 404 nas
 * rotas dela. Está escrito no `vite.config.ts` deles.
 *
 * Aqui não há Playwright, então o defeito não chega pela suíte: chega pelas
 * CAPTURAS, que cravam o endereço no protocolo. E nesta mesma sessão o servidor
 * já escorregou para a 5174 sem avisar ninguém.
 *
 * ── Porta exclusiva e identidade resolvem coisas diferentes ──────────
 *
 * A porta própria com `strictPort` resolve por ACORDO — cada produto na sua, e
 * a colisão vira erro na cara em vez de escorregão.
 *
 * Esta checagem resolve quando o acordo falha: um checkout antigo ainda de pé,
 * uma porta reaproveitada, um túnel, um endereço colado errado. As duas juntas,
 * porque acordo é combinação e combinação se quebra.
 *
 * ── Estes casos rodam a sonda DE VERDADE ─────────────────────────────
 *
 * Não uma cópia da regra: o texto gerado por `montarSonda` é avaliado contra um
 * documento montado aqui. Se a checagem sair da sonda, estes casos caem junto —
 * que é o ponto.
 */

const requerer = createRequire(import.meta.url);
const { montarSonda } = requerer(
  resolve(__dirname, '../scripts/sonda-captura.js')
) as { montarSonda: (tema: string, exigirTabela: boolean) => string };

const sonda = montarSonda('claro', false);

/** Roda a sonda no documento atual e devolve o resultado dela. */
const rodar = () =>
  // eslint-disable-next-line no-eval
  (0, eval)(sonda) as { ok: boolean; app: string; problemas: string[] };

/** O problema de identidade, se houver — os outros não interessam aqui. */
const problemaDeIdentidade = (r: { problemas: string[] }) =>
  r.problemas.find((p) => /data-app|produto "/.test(p)) ?? null;

beforeEach(() => {
  // O jsdom não aplica CSS nem carrega recursos, então o canário e as outras
  // checagens vão reprovar. Isso é esperado e não atrapalha: cada caso olha
  // SÓ para o problema de identidade.
  if (!performance.getEntriesByType) {
    (performance as unknown as { getEntriesByType: () => unknown[] }).getEntriesByType =
      () => [];
  }
  delete document.documentElement.dataset.app;
  document.title = '';
});

describe('sonda — identidade da página', () => {
  it('não reclama quando o marcador é do ChamadosHS', () => {
    document.documentElement.dataset.app = 'chamadoshs';
    document.title = 'ChamadosHS';

    expect(problemaDeIdentidade(rodar())).toBeNull();
  });

  /**
   * O caso do incidente: outra aplicação servida do mesmo host.
   *
   * O bloqueio precisa NOMEAR o produto encontrado — "é do helphs, não do
   * chamadoshs". Um "página errada" genérico obriga quem lê a investigar
   * justamente no momento em que ela achava que estava tudo certo.
   */
  it('bloqueia numa página de outro produto, e diz qual', () => {
    document.documentElement.dataset.app = 'helphs';
    document.title = 'HelpHS';

    const r = rodar();
    expect(r.ok).toBe(false);
    const problema = problemaDeIdentidade(r);
    expect(problema).toContain('helphs');
    expect(problema).toContain('chamadoshs');
  });

  /**
   * Falha FECHADA: sem marcador, bloqueia.
   *
   * É a diferença entre uma trava e uma decoração. Se alguém tirar o atributo
   * do `index.html`, a sonda para tudo em vez de liberar por omissão — e liberar
   * por omissão é exatamente o modo de falha que ela existe para não ter.
   */
  it('bloqueia quando não há marcador nenhum', () => {
    document.title = 'Qualquer coisa';

    const r = rodar();
    expect(r.ok).toBe(false);
    expect(problemaDeIdentidade(r)).toContain('não tem data-app');
  });

  /**
   * O título entra no relatório, e NÃO no critério.
   *
   * Título muda por rota; marcador é estrutura. Uma trava baseada em título
   * reprovaria a tela de detalhe por ela se chamar "Chamado #4187", e um
   * atacante — ou um engano — reproduz um título trivialmente.
   */
  it('o título não é o critério: marcador certo com título estranho passa', () => {
    document.documentElement.dataset.app = 'chamadoshs';
    document.title = 'Chamado HS-4187 — Impressora não imprime';

    expect(problemaDeIdentidade(rodar())).toBeNull();
  });

  it('e o marcador errado bloqueia mesmo com o título certo', () => {
    document.documentElement.dataset.app = 'helphs';
    document.title = 'ChamadosHS';

    expect(problemaDeIdentidade(rodar())).toContain('helphs');
  });
});

describe('o marcador está no index.html', () => {
  /**
   * Sem isto, a sonda bloquearia TODA captura e ninguém saberia por quê.
   *
   * É o par do caso de falha fechada: um garante que a ausência bloqueia, o
   * outro garante que a presença existe onde precisa existir.
   */
  it('o <html> do index.html declara data-app="chamadoshs"', () => {
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
    expect(html).toMatch(/<html[^>]*\sdata-app="chamadoshs"/);
  });
});
