import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

/**
 * O canário do CSS servido — e o que dele dá para testar aqui.
 *
 * ── O que ele existe para pegar ──────────────────────────────────────
 *
 * Servidor de desenvolvimento que ficou de pé desde antes de uma mudança nos
 * tokens serve o CSS ANTIGO. As classes novas não têm regra, os elementos
 * herdam a cor do pai, e a tela **parece plausível** — nada em branco, nada
 * quebrado, só cores que não são as de ninguém.
 *
 * A sessão do HelpHS perdeu uma tarde nisso: a galeria dela acusou quatro
 * reprovações de contraste que não existiam, porque o Playwright reusou um
 * servidor velho. Se tivesse "consertado" as quatro, teria quebrado código que
 * funcionava. O modo de falhar não avisa — ele MEDE.
 *
 * ── O que este arquivo testa, e o que não alcança ────────────────────
 *
 * A sonda em si roda no NAVEGADOR: ela lê `getComputedStyle` e percorre
 * `document.styleSheets`. O jsdom não aplica CSS e não tem folha nenhuma, então
 * testá-la aqui mediria o ambiente, e não a regra.
 *
 * O que dá para travar aqui é o que de fato pode apodrecer sem ninguém ver:
 * **que os valores esperados venham da fonte real**, e não de uma cópia. Uma
 * sonda com a paleta copiada à mão daria "tudo fresco" enquanto o disco mudou —
 * que é a segunda fonte de verdade da §5.4, e seria especialmente perversa
 * numa ferramenta cujo trabalho é justamente detectar divergência.
 */

const requerer = createRequire(import.meta.url);
const canario = requerer(resolve(__dirname, '../scripts/canario-css.js')) as {
  sonda: string;
  esperado: Record<':root' | '.dark', Record<string, string>>;
  CLASSES: string[];
  TOKENS: string[];
};

const FONTE = readFileSync(
  resolve(__dirname, 'styles/index.css'),
  'utf8'
);

describe('canário do CSS', () => {
  it('os valores esperados saem do index.css, e não de uma cópia', () => {
    // Se alguém cravar a paleta na sonda, este caso reprova no dia em que o
    // disco mudar — que é exatamente o dia em que o canário precisa funcionar.
    for (const tema of [':root', '.dark'] as const) {
      for (const [token, valor] of Object.entries(canario.esperado[tema])) {
        expect(
          FONTE,
          `${tema} ${token}: o valor "${valor}" não está no index.css`
        ).toContain(`${token}: ${valor};`);
      }
    }
  });

  /**
   * O canário conhece OS DOIS TEMAS, e compara com o que está na tela.
   *
   * ── O defeito que este caso trava ────────────────────────────────────
   *
   * A primeira versão lia só o `:root`. Ela **reprovava toda página no tema
   * escuro**: cinco dos seis tokens "divergiam", porque os valores servidos
   * eram os do `.dark`. O sexto, `--perigo`, passava — e foi ele que
   * denunciou, por ser o único da lista com o mesmo valor nos dois temas.
   *
   * Um canário que grita quando não há fogo é pior que canário nenhum: ele
   * ensina quem o lê a ignorá-lo, e aí ele também não grita quando há.
   *
   * ── E por que os testes anteriores não pegaram ───────────────────────
   *
   * Porque o caso acima confere que os valores **saem da fonte**, e eles
   * saíam. Da fonte errada. "Vem do arquivo certo" e "vem do BLOCO certo" são
   * perguntas diferentes, e só a segunda distingue os temas.
   *
   * Achado ao rodar a sonda pela primeira vez numa página de verdade. Nenhum
   * teste de unidade acharia: o tema é do navegador.
   */
  it('conhece os dois temas, e escolhe pelo que está na tela', () => {
    expect(Object.keys(canario.esperado).sort()).toEqual(['.dark', ':root']);

    // Os que MUDAM com o tema têm de diferir entre os dois blocos.
    expect(canario.esperado[':root']['--superficie']).not.toBe(
      canario.esperado['.dark']['--superficie']
    );
    // E os fixos têm de ser iguais — é a queda para o `:root` pela cascata.
    expect(canario.esperado[':root']['--perigo']).toBe(
      canario.esperado['.dark']['--perigo']
    );

    // A sonda decide pela classe no `<html>`, e não por um palpite.
    expect(canario.sonda).toContain("classList.contains('dark')");
  });

  it('cobre as três famílias de token que a migração tocou', () => {
    const nomes = canario.TOKENS.join(' ');
    expect(nomes).toMatch(/superficie/); // superfície
    expect(nomes).toMatch(/conteudo/); // conteúdo
    expect(nomes).toMatch(/perigo|sinal/); // significado e ação
  });

  it('confere CLASSE além de token, que são perguntas diferentes', () => {
    // O token pode estar certo e a classe não existir: basta o
    // `tailwind.config.js` ter mudado e o servidor não ter relido. Classe sem
    // regra não pinta nada, e o elemento herda do pai — sem erro, sem aviso.
    expect(canario.CLASSES.length).toBeGreaterThan(0);
    expect(canario.sonda).toContain('document.styleSheets');
    expect(canario.sonda).toContain('getComputedStyle');
  });

  /**
   * A sonda tem de recusar em voz alta, e não devolver um aviso discreto.
   *
   * Um canário que reprova em silêncio é pior que canário nenhum: ele dá a
   * sensação de conferência sem a conferência.
   */
  it('manda NÃO fotografar quando reprova', () => {
    expect(canario.sonda).toContain('NAO fotografe');
    expect(canario.sonda).toContain('console.error');
  });
});
