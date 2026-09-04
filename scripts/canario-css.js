/**
 * O canário do CSS servido, para rodar ANTES de fotografar as telas.
 *
 * ── O modo de falha que ele existe para pegar ─────────────────────────
 *
 * Um servidor de desenvolvimento que ficou de pé desde antes de uma mudança no
 * `tailwind.config.js` serve o CSS ANTIGO. As classes de token novas não têm
 * regra nenhuma, os elementos herdam a cor do pai, e a tela **parece
 * plausível**: nada em branco, nada quebrado, só cores que não são as de
 * ninguém.
 *
 * A sessão do HelpHS perdeu uma tarde nisso. A galeria dela acusou **quatro
 * reprovações de contraste que não existiam** — o Playwright reusou o servidor
 * antigo, e a medição deu número plausível e errado. Se ela tivesse
 * "consertado" aquelas quatro, teria quebrado código que funcionava.
 *
 * O modo de falhar não avisa: **ele mede**. É por isso que a conferência vem
 * antes da captura, e não depois de um resultado estranho.
 *
 * ── Por que a prova é comparar com o DISCO ────────────────────────────
 *
 * Conferir que a classe existe pega o caso grosseiro. Não pega o caso em que o
 * CSS foi gerado, mas de uma versão anterior dos tokens — que é exatamente o
 * que acontece quando o servidor é velho.
 *
 * Então este script lê os valores da fonte real (`src/styles/index.css`) e
 * monta uma sonda com eles cravados. No navegador, a sonda compara o valor
 * COMPUTADO com o esperado. Divergiu, o CSS servido não é o do disco.
 *
 * ── Uso ───────────────────────────────────────────────────────────────
 *
 *   node scripts/canario-css.js          # imprime a sonda para colar no console
 *   node scripts/canario-css.js --json   # a mesma sonda em uma linha
 *
 * A saída da sonda é o que se cola no relatório como prova, junto das capturas.
 */

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const CSS = path.join(RAIZ, 'src', 'styles', 'index.css');

/**
 * Os tokens que a sonda confere, e por que estes.
 *
 * Não é a lista inteira de propósito: seis bastam para provar frescor, e uma
 * lista longa transforma a prova num muro de texto que ninguém lê. Os seis
 * cobrem as três famílias que a migração tocou — superfície, conteúdo e
 * significado — mais o anel de foco, que é o que a E15 do pacote acabou de
 * mexer e é o mais provável de estar desatualizado.
 */
const TOKENS = [
  '--superficie',
  '--superficie-elevada',
  '--conteudo',
  '--conteudo-tenue',
  '--sinal',
  '--perigo',
];

/**
 * Classes que precisam ter REGRA gerada.
 *
 * Aqui a pergunta é outra: o token pode estar certo e a classe não existir, se
 * o `tailwind.config.js` mudou e o servidor não releu. Uma classe sem regra
 * não pinta nada e o elemento herda do pai — sem erro, sem aviso.
 */
const CLASSES = [
  'bg-superficie',
  'bg-superficie-elevada',
  'text-conteudo',
  'text-conteudo-tenue',
  'bg-tint-danger',
  'text-on-tint-danger',
  'border-borda-control',
];

/** Lê os tokens de um bloco do CSS, como faz `validar-paleta.js`. */
function tokensDoBloco(css, seletor) {
  const inicio = css.indexOf(seletor + ' {');
  if (inicio === -1) throw new Error(`bloco "${seletor}" não encontrado`);
  const bloco = css.slice(inicio, css.indexOf('}', inicio));

  const achado = {};
  for (const [, nome, r, g, b] of bloco.matchAll(
    /--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g
  )) {
    achado['--' + nome] = `${r} ${g} ${b}`;
  }
  return achado;
}

const css = fs.readFileSync(CSS, 'utf8');

/**
 * Os dois temas, e não só o claro.
 *
 * A primeira versão lia apenas o `:root`, e **reprovava toda página no tema
 * escuro** — cinco dos seis tokens "divergiam", porque os valores servidos
 * eram os do `.dark`. O sexto, `--perigo`, passava, e foi ele que denunciou:
 * é o único da lista que tem o mesmo valor nos dois temas.
 *
 * Um canário que grita quando não há fogo é pior que canário nenhum: ele
 * ensina quem o lê a ignorá-lo, e aí ele também não grita quando há.
 *
 * Achado ao rodá-lo pela primeira vez numa página de verdade — que é a única
 * forma de achar isto, porque o teste dele conferia que os valores saem da
 * fonte, e eles saíam. Da fonte errada.
 */
const claro = tokensDoBloco(css, ':root');
const escuro = tokensDoBloco(css, '.dark');

const esperado = { ':root': {}, '.dark': {} };
for (const t of TOKENS) {
  if (!claro[t]) throw new Error(`token ${t} não encontrado no :root de index.css`);
  esperado[':root'][t] = claro[t];
  // O `.dark` só redeclara o que muda com o tema. O que ele não redeclara cai
  // no `:root` pela cascata — é o caso das cores de significado, que são fixas
  // de propósito.
  esperado['.dark'][t] = escuro[t] ?? claro[t];
}

// A sonda. Roda no navegador, na página que vai ser fotografada.
const sonda = `(() => {
  const POR_TEMA = ${JSON.stringify(esperado)};
  const CLASSES = ${JSON.stringify(CLASSES)};
  const raiz = getComputedStyle(document.documentElement);
  const falhas = [];

  // Qual tema está na tela AGORA. Sem isto a sonda compara os valores do
  // escuro com os do claro e reprova cinco de seis — foi o que ela fez na
  // primeira vez que rodou numa página de verdade.
  const escuro = document.documentElement.classList.contains('dark');
  const tema = escuro ? '.dark' : ':root';
  const ESPERADO = POR_TEMA[tema];

  // 1. O valor computado do token bate com o do disco?
  const tokens = Object.entries(ESPERADO).map(([nome, disco]) => {
    const vivo = raiz.getPropertyValue(nome).trim();
    const ok = vivo === disco;
    if (!ok) falhas.push(nome + ': servido "' + vivo + '", disco "' + disco + '"');
    return { token: nome, disco, servido: vivo || '(vazio)', ok };
  });

  // 2. A classe tem REGRA gerada? Procurada nas folhas, e nao pelo efeito:
  //    uma classe sem regra deixa o elemento herdar do pai, e o valor
  //    herdado pode por acaso ser o esperado.
  const seletores = new Set();
  for (const folha of document.styleSheets) {
    let regras;
    try { regras = folha.cssRules; } catch { continue; }  // folha de outra origem
    const percorrer = (lista) => {
      for (const r of lista) {
        if (r.selectorText) r.selectorText.split(',').forEach((s) => seletores.add(s.trim()));
        if (r.cssRules) percorrer(r.cssRules);
      }
    };
    percorrer(regras);
  }
  const classes = CLASSES.map((c) => {
    const ok = seletores.has('.' + c) || seletores.has('.' + CSS.escape(c));
    if (!ok) falhas.push('classe .' + c + ' nao tem regra gerada');
    return { classe: c, ok };
  });

  const veredito = falhas.length === 0;
  console.log('%c CANARIO DO CSS ' + (veredito ? 'OK' : 'REPROVADO') + ' — tema ' + tema + ' ',
    'background:' + (veredito ? '#065f46' : '#b91c1c') + ';color:#fff;font-weight:bold');
  console.table(tokens);
  console.table(classes);
  if (!veredito) {
    console.error('O CSS servido NAO e o do disco. NAO fotografe.');
    console.error('Derrube o servidor de desenvolvimento e suba de novo.');
    falhas.forEach((f) => console.error('  - ' + f));
  }
  return { ok: veredito, tema, tokens, classes, falhas };
})()`;

/* A mesma guarda de `validar-paleta.js`: sem ela, um `require` deste arquivo
 * imprime a sonda inteira no meio da saída de quem importou. */
if (require.main === module) {
  if (process.argv.includes('--json')) {
    console.log(sonda.replace(/\n\s*/g, ' '));
  } else {
    console.log(sonda);
  }
}

module.exports = { sonda, esperado, CLASSES, TOKENS };
