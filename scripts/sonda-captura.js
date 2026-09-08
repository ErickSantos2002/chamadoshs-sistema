/**
 * A sonda que roda ANTES de cada uma das dezesseis capturas.
 *
 * ── Por que uma sonda, e não uma conferência de olho ─────────────────
 *
 * Porque os modos de falha desta captura são **silenciosos**: em nenhum deles a
 * tela parece errada. Ela parece plausível e mostra outra coisa.
 *
 *  -1. Outro produto na porta. Duas aplicações Vite nesta máquina, as duas
 *      nascidas na 5173; sem `strictPort` o Vite escorrega calado e quem cravou
 *      o endereço abraça o servidor do outro. A suíte e2e do HelpHS já rodou
 *      contra este sistema.
 *
 *   0. API de produção. A tela funciona — e é a real: a captura leva dado de
 *      gente de verdade para dentro de `docs/`, e o passo "derrube a API" da
 *      captura do estado de erro vira uma indisponibilidade.
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
 *   http://localhost:5191/dashboard?tema=claro
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
function montarSonda(tema, exigirTabela, excecaoDeProducao, viewport) {
  const apiNoDisco = apiDoEnv();
  const apiEhLocal = ehLocal(apiNoDisco);

  return `(() => {
  const TEMA = ${JSON.stringify(tema)};
  const EXIGIR_TABELA = ${exigirTabela};
  const API_NO_DISCO = ${JSON.stringify(apiNoDisco)};
  const API_EH_LOCAL = ${JSON.stringify(apiEhLocal)};
  const EXCECAO = ${JSON.stringify(excecaoDeProducao || null)};
  const VIEWPORT = ${JSON.stringify(viewport || null)};
  const problemas = [];
  const avisos = [];

  // ── -1. Esta página é MESMO do ChamadosHS? ────────────────────────
  //
  // Duas aplicações Vite convivem nesta máquina, e as duas nasceram na 5173.
  // A porta exclusiva com \`strictPort\` resolve por ACORDO; esta checagem
  // resolve quando o acordo falha — um checkout antigo ainda de pé, uma porta
  // reaproveitada, um túnel, um endereço colado errado.
  //
  // O gate é o \`data-app\` no \`<html>\`, e NÃO o título: título muda por rota,
  // marcador é estrutura e sobrevive à navegação. O título vai junto no
  // relatório, como contexto de quem está lendo — não como critério.
  //
  // Falha FECHADA: marcador ausente também bloqueia. Se alguém tirar o
  // atributo do \`index.html\`, a sonda para tudo em vez de liberar por
  // omissão — que é o modo de falha que ela existe para não ter.
  const APP = 'chamadoshs';
  const marcaDoApp = document.documentElement.dataset.app;
  if (!marcaDoApp) {
    problemas.push(
      'a página não tem data-app no <html>: não dá para provar que é o ' +
      'ChamadosHS. Título: "' + document.title + '", endereço: ' + location.origin
    );
  } else if (marcaDoApp !== APP) {
    problemas.push(
      'esta página é do produto "' + marcaDoApp + '", e não do "' + APP + '". ' +
      'Título: "' + document.title + '", endereço: ' + location.origin
    );
  }

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
  //
  // A EXCEÇÃO existe, e ela é digitada de propósito.
  //
  // A trava NÃO foi removida: ela continua medindo, continua bloqueando por
  // omissão, e só cede diante de um motivo escrito passado na geração da
  // sonda. Sem o motivo, o comportamento é o de sempre.
  //
  // Quando cede, o resultado carrega o motivo e a saída grita — porque uma
  // exceção silenciosa é indistinguível de uma trava quebrada, e daqui a um
  // mês ninguém saberia dizer qual das duas estava rodando.
  if (API_EH_LOCAL === null) {
    problemas.push('VITE_API_URL ausente ou inválida no .env: "' + API_NO_DISCO + '"');
  } else if (!API_EH_LOCAL) {
    if (EXCECAO) {
      avisos.push(
        'PRODUÇÃO, sob exceção autorizada. API: "' + API_NO_DISCO + '". ' +
        'Motivo: ' + EXCECAO
      );
    } else {
      problemas.push(
        'VITE_API_URL aponta para "' + API_NO_DISCO + '", que não é local. ' +
        'Captura de evidência não aponta para produção.'
      );
    }
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
    if (EXCECAO) avisos.push('origens não locais em uso: ' + externas.join(', '));
    else problemas.push('a página falou com origem NÃO local: ' + externas.join(', '));
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

  // ── 4. O quadro tem o tamanho que o protocolo crava? ────────────
  //
  // A sonda mede a página; sem isto ela não media o QUADRO, e o quadro foi
  // onde o Checkpoint 3 quase saiu errado. Uma captura de aparência
  // perfeitamente normal, tirada num viewport que ninguém pediu, com o
  // número certo escrito ao lado — o modo de falha de sempre.
  //
  // A medida é \`innerWidth\`/\`innerHeight\` e NÃO o tamanho da imagem
  // entregue. A imagem foi a primeira tentativa e se mostrou imprestável: a
  // MESMA página, sem nada mudar entre as duas chamadas, voltou 672×448 e
  // 1026×684 — ora 1:1 com o viewport, ora reduzida a 0,655. Uma régua que
  // oscila reprova captura boa na metade das vezes.
  //
  // Aqui ela bloqueia ANTES da foto, que é onde uma trava serve para alguma
  // coisa. Depois da foto ela só diria que o trabalho foi perdido.
  if (VIEWPORT) {
    if (innerWidth !== VIEWPORT[0] || innerHeight !== VIEWPORT[1]) {
      problemas.push(
        'o viewport é ' + innerWidth + '×' + innerHeight + ', e esta captura é de ' +
        VIEWPORT[0] + '×' + VIEWPORT[1] + '. Ajuste a barra de dispositivo do ' +
        'DevTools (Ctrl+Shift+M), com o zoom em 100% e não em "Fit".'
      );
    }
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
  if (avisos.length) {
    console.warn('%c EXCEÇÃO ATIVA — leia antes de fotografar ', 'background:#92400e;color:#fff;font-weight:bold');
    avisos.forEach((a) => console.warn('  ! ' + a));
  }
  return {
    ok,
    excecao: EXCECAO,
    avisos,
    app: marcaDoApp || '(sem data-app)',
    titulo: document.title,
    endereco: location.origin,
    tema: TEMA,
    api_no_disco: API_NO_DISCO,
    api_e_local: API_EH_LOCAL,
    origens_externas: externas,
    marcador: marcador || '(ausente)',
    fundo,
    canario: canario.ok ? 'ok' : 'REPROVADO',
    linhas_por_tabela: linhas,
    viewport: [innerWidth, innerHeight],
    viewport_exigido: VIEWPORT,
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
  // A exceção precisa vir com motivo escrito. `--producao` sozinho não basta:
  // quem a invoca tem de dizer por quê, e o motivo viaja para dentro da saída
  // da sonda e daí para o relatório.
  const motivo = (args.find((a) => a.startsWith('--producao=')) ?? '').split('=').slice(1).join('=');
  if (args.includes('--producao') && !motivo) {
    console.error('--producao exige motivo: --producao="captura autorizada em 04/09, leitura pura"');
    process.exit(1);
  }
  // --viewport=1366x768. Opcional: sem ele a sonda não cobra tamanho, que é
  // o certo para quem só quer medir uma página fora de uma sessão de captura.
  const bruto = (args.find((a) => a.startsWith('--viewport=')) ?? '').split('=')[1];
  let viewport = null;
  if (bruto) {
    const m = /^(\d+)x(\d+)$/.exec(bruto);
    if (!m) {
      console.error('--viewport espera LARGURAxALTURA, por exemplo --viewport=1366x768');
      process.exit(1);
    }
    viewport = [Number(m[1]), Number(m[2])];
  }
  console.log(montarSonda(tema, args.includes('--tabela'), motivo || null, viewport));
}

module.exports = { montarSonda, ehLocal, apiDoEnv };
