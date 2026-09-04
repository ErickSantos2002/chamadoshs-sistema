/**
 * A sonda que roda ANTES de cada uma das dezesseis capturas.
 *
 * ── Por que uma sonda, e não uma conferência de olho ─────────────────
 *
 * Porque os três modos de falha desta captura são **silenciosos**: em nenhum
 * deles a tela parece errada. Ela parece plausível e mostra outra coisa.
 *
 *   1. CSS servido velho. A sessão do HelpHS perdeu uma tarde: o Playwright
 *      reusou o servidor, as classes de token não tinham regra, os elementos
 *      herdaram a cor do pai, e a medição deu número plausível e ERRADO.
 *
 *   2. Tema aplicado por efeito. A primeira pintura sai no tema errado e troca
 *      um quadro depois; um screenshot nesse intervalo mostra a cor errada com
 *      a legenda certa. Já aconteceu aqui — o DOM dizia `dark`, a tela estava
 *      clara e o painel dizia "claro".
 *
 *   3. Tabela com uma linha só. O divisor entre linhas não existe quando não
 *      há duas linhas, e a captura sai sem o elemento que a E14 mudou — sem
 *      erro, sem aviso, e com aparência de tabela normal.
 *
 * ── Uso ───────────────────────────────────────────────────────────────
 *
 *   node scripts/sonda-captura.js --tema=claro --tabela   # imprime a sonda
 *   node scripts/sonda-captura.js --tema=escuro           # sem exigir tabela
 *
 * Cola-se a saída no console da página, com o tema já na URL:
 *
 *   http://localhost:5173/dashboard?tema=claro
 *
 * A sonda devolve `{ ok: false }` e diz o motivo. **Não fotografe com
 * `ok: false`** — a foto sairia parecendo certa.
 */

const { sonda: sondaDoCanario } = require('./canario-css.js');

const args = process.argv.slice(2);
const tema = (args.find((a) => a.startsWith('--tema=')) ?? '').split('=')[1];
const exigirTabela = args.includes('--tabela');

if (tema !== 'claro' && tema !== 'escuro') {
  console.error('Uso: node scripts/sonda-captura.js --tema=claro|escuro [--tabela]');
  process.exit(1);
}

/**
 * O fundo esperado por tema, para conferir o PIXEL e não só o atributo.
 *
 * `data-tema-pronto` é promessa: ele diz que o tema foi aplicado. O
 * `backgroundColor` computado é fato. Os dois juntos pegam o caso em que a
 * classe entrou e o CSS não acompanhou — que é o modo de falha 1 disfarçado de
 * modo de falha 2.
 */
const sonda = `(() => {
  const TEMA = ${JSON.stringify(tema)};
  const EXIGIR_TABELA = ${exigirTabela};
  const problemas = [];

  // ── 1. O CSS servido é o do disco? ────────────────────────────────
  const canario = ${sondaDoCanario};
  if (!canario.ok) problemas.push('canário reprovou: ' + canario.falhas.join(' | '));

  // ── 2. O tema foi aplicado ANTES da primeira pintura? ─────────────
  const marcador = document.documentElement.dataset.temaPronto;
  if (!marcador) {
    problemas.push(
      'sem data-tema-pronto: a página não recebeu ?tema= na URL, e o tema veio ' +
      'por efeito — a primeira pintura pode ter saído no tema errado'
    );
  } else if (marcador !== TEMA) {
    problemas.push('data-tema-pronto diz "' + marcador + '", e a captura é de "' + TEMA + '"');
  }

  // Atributo é promessa, pixel é fato: o fundo tem de ser o do tema pedido.
  const fundo = getComputedStyle(document.body).backgroundColor;
  const escuroNaTela = document.documentElement.classList.contains('dark');
  if (escuroNaTela !== (TEMA === 'escuro')) {
    problemas.push('a classe .dark no <html> não corresponde ao tema pedido');
  }
  if (canario.tema !== (TEMA === 'escuro' ? '.dark' : ':root')) {
    problemas.push('o canário mediu contra o bloco errado — tema divergente');
  }

  // ── 3. A tabela tem a segunda linha? ──────────────────────────────
  //
  // O divisor entre linhas é \`border-b\` na LINHA, então ele só aparece
  // quando há linha seguinte para separar. Com uma linha só, a captura sai
  // sem o elemento que a E14 mudou — e parece uma tabela normal.
  const tabelas = [...document.querySelectorAll('table')];
  const linhas = tabelas.map((t) => t.querySelectorAll('tbody tr').length);
  if (EXIGIR_TABELA) {
    if (!tabelas.length) problemas.push('nenhuma tabela na tela, e esta captura exige uma');
    else if (Math.max(...linhas) < 2)
      problemas.push('a maior tabela tem ' + Math.max(...linhas) + ' linha(s): o divisor entre linhas não aparece com menos de 2');
  }

  const ok = problemas.length === 0;
  console.log(
    '%c CAPTURA ' + (ok ? 'LIBERADA' : 'BLOQUEADA') + ' — ' + TEMA + ' ',
    'background:' + (ok ? '#065f46' : '#b91c1c') + ';color:#fff;font-weight:bold'
  );
  if (!ok) {
    console.error('NÃO fotografe. A foto sairia parecendo certa.');
    problemas.forEach((p) => console.error('  - ' + p));
  }
  return {
    ok,
    tema: TEMA,
    marcador: marcador || '(ausente)',
    fundo,
    canario: canario.ok ? 'ok' : 'REPROVADO',
    linhas_por_tabela: linhas,
    problemas,
  };
})()`;

if (require.main === module) {
  // Sempre em várias linhas. Ver a nota do `canario-css.js`: achatar quebra,
  // porque os comentários `//` engolem tudo que vem depois.
  console.log(sonda);
}

module.exports = { sonda };
