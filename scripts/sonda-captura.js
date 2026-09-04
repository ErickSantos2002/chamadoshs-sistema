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
const fs = require('node:fs');
const path = require('node:path');

/**
 * O endereço é local?
 *
 * Compara o **hostname**, e não a string inteira. A versão ingênua seria
 * `url.includes('localhost')`, e ela aprova `https://localhost.exemplo.com`,
 * que é um domínio de terceiro com `localhost` no nome — a armadilha clássica
 * de casar prefixo em vez de estrutura. Aqui a URL é parseada e o hostname
 * comparado por igualdade.
 *
 * Devolve `null` para o que não é URL válida, e quem chama trata: uma sonda
 * que chuta "local" diante de lixo é pior que uma que reclama.
 */
function ehLocal(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  let host;
  try {
    host = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
}

/** O `VITE_API_URL` do `.env`, sem interpretar nada além da própria linha. */
function apiDoEnv() {
  const arquivo = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(arquivo)) return null;
  const linha = fs
    .readFileSync(arquivo, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('VITE_API_URL='));
  return linha ? linha.slice('VITE_API_URL='.length).trim() : null;
}

/**
 * O fundo esperado por tema, para conferir o PIXEL e não só o atributo.
 *
 * `data-tema-pronto` é promessa: ele diz que o tema foi aplicado. O
 * `backgroundColor` computado é fato. Os dois juntos pegam o caso em que a
 * classe entrou e o CSS não acompanhou — que é o modo de falha 1 disfarçado de
 * modo de falha 2.
 */
/**
 * Monta a sonda. Funcao, e nao constante de modulo, por um motivo concreto:
 * a validacao de argumentos ficava no escopo do arquivo e chamava
 * `process.exit(1)`. Um `require` daqui -- que e o que os casos de prova fazem
 * -- derrubava o processo do teste antes de a primeira asercao rodar.
 *
 * E a mesma guarda que o `validar-paleta.js` ja tinha, e que aqui faltou.
 * Achada ao escrever a prova positiva da trava de producao.
 */
function montarSonda(tema, exigirTabela) {
  const apiNoDisco = apiDoEnv();
  const apiEhLocal = ehLocal(apiNoDisco);

  return `(() => {
  const TEMA = ${JSON.stringify(tema)};
  const EXIGIR_TABELA = ${exigirTabela};
  const API_NO_DISCO = ${JSON.stringify(apiNoDisco)};
  const API_EH_LOCAL = ${JSON.stringify(apiEhLocal)};
  const problemas = [];

  // ── 0. A captura está apontada para PRODUÇÃO? ─────────────────────
  //
  // Duas camadas, porque as duas falham de jeitos diferentes.
  //
  // DISCO: o \`.env\` diz para onde o front deveria falar. Se não for local,
  // a captura levaria dado real de gente real para dentro de \`docs/\` — e o
  // passo "derrube a API" da captura do estado de erro deixaria de ser um
  // teste e viraria uma indisponibilidade.
  //
  // AO VIVO: o \`.env\` pode ter sido corrigido DEPOIS de o servidor subir, e
  // o Vite serve o valor com que foi iniciado. É a mesma família do canário:
  // o disco diz uma coisa e o que está no ar diz outra. Por isso a segunda
  // camada olha para onde a página de fato falou.
  if (API_EH_LOCAL === null) {
    problemas.push('VITE_API_URL ausente ou inválida no .env: "' + API_NO_DISCO + '"');
  } else if (!API_EH_LOCAL) {
    problemas.push(
      'VITE_API_URL aponta para "' + API_NO_DISCO + '", que não é local. ' +
      'Captura de evidência não aponta para produção.'
    );
  }

  const daPagina = location.origin;
  const externas = [...new Set(
    performance.getEntriesByType('resource')
      .map((e) => { try { return new URL(e.name).origin; } catch { return null; } })
      .filter((o) => o && o !== daPagina)
  )].filter((o) => {
    const h = new URL(o).hostname.toLowerCase();
    return !(h === 'localhost' || h === '127.0.0.1' || h === '[::1]');
  });
  if (externas.length) {
    problemas.push('a página falou com origem NÃO local: ' + externas.join(', '));
  }

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
    api_no_disco: API_NO_DISCO,
    api_e_local: API_EH_LOCAL,
    origens_externas: externas,
    marcador: marcador || '(ausente)',
    fundo,
    canario: canario.ok ? 'ok' : 'REPROVADO',
    linhas_por_tabela: linhas,
    problemas,
  };
})()`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const tema = (args.find((a) => a.startsWith('--tema=')) ?? '').split('=')[1];
  if (tema !== 'claro' && tema !== 'escuro') {
    console.error('Uso: node scripts/sonda-captura.js --tema=claro|escuro [--tabela]');
    process.exit(1);
  }
  // Sempre em várias linhas. Ver a nota do `canario-css.js`: achatar quebra,
  // porque os comentários `//` engolem tudo que vem depois.
  console.log(montarSonda(tema, args.includes('--tabela')));
}

module.exports = { montarSonda, ehLocal, apiDoEnv };
