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

const RAIZ = path.join(__dirname, '..');
const CSS_DO_DISCO = path.join(RAIZ, 'src', 'styles', 'index.css');

/** O CSS em disco — a referência que vem de FORA da coisa medida. */
const cssDoDisco = () => fs.readFileSync(CSS_DO_DISCO, 'utf8');

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
 * As superfícies do tema, lidas do CSS em disco na GERAÇÃO e embutidas na sonda.
 *
 * ── Por que embutir, e não ler no navegador ──────────────────────────
 *
 * A sonda roda na página e não tem acesso ao disco. Se ela lesse o valor
 * esperado do próprio CSS servido, compararia o servido consigo mesmo e
 * aprovaria qualquer divergência — que é o defeito do canário lendo o bloco
 * errado, uma casa adiante. O valor de referência precisa vir de FORA da coisa
 * medida, e o único "fora" disponível é o disco no momento de gerar.
 *
 * ── Este bloco existe porque ele NÃO existia ─────────────────────────
 *
 * O comentário que estava aqui prometia "o fundo esperado por tema, para
 * conferir o PIXEL e não só o atributo" e documentava um mapa de valores
 * esperados. **O mapa nunca foi escrito.** Abaixo dele, `fundo` era calculado,
 * reportado, e comparado com nada — quatro ocorrências da palavra no arquivo,
 * nenhuma delas um `if`.
 *
 * Sobreviveu a oito provas negativas porque a prova que existia bloqueia com
 * três motivos — marcador, classe \`.dark\` e canário —, todos de atributo. As
 * três disparam juntas, e a saída fica idêntica com ou sem a quarta.
 */
function superficiesDoTema(css, tema) {
  const ler = (seletor) => {
    const i = css.indexOf(seletor + ' {');
    if (i === -1) throw new Error('bloco "' + seletor + '" não encontrado');
    const bloco = css.slice(i, css.indexOf('}', i));
    const achado = {};
    for (const [, nome, r, g, b] of bloco.matchAll(
      /--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g
    )) achado[nome] = [Number(r), Number(g), Number(b)];
    return achado;
  };
  // O escuro herda do :root o que não redefine — é a cascata, não um remendo.
  const base = ler(':root');
  const tk = tema === 'escuro' ? { ...base, ...ler('.dark') } : base;
  const nomes = ['superficie', 'superficie-base', 'superficie-elevada'];
  const fora = {};
  for (const n of nomes) {
    if (!tk[n]) throw new Error('token --' + n + ' não encontrado para o tema ' + tema);
    fora[n] = tk[n];
  }
  return fora;
}
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
  const SUPERFICIES = ${JSON.stringify(superficiesDoTema(cssDoDisco(), tema))};
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

  const escuroNaTela = document.documentElement.classList.contains('dark');
  if (escuroNaTela !== (TEMA === 'escuro')) {
    problemas.push('a classe .dark no <html> não corresponde ao tema pedido');
  }
  if (canario.tema !== (TEMA === 'escuro' ? '.dark' : ':root')) {
    problemas.push('o canário mediu contra o bloco errado — tema divergente');
  }

  // -- 2b. O CANVAS tem a cor do tema? Atributo e promessa, pixel e fato. --
  //
  // O elemento medido e o MAIOR OPACO QUE COBRE O VIEWPORT INTEIRO, e nao o
  // "que cobre 90%". A diferenca nao e zelo: com 90%, em 1366 vencia o <main>,
  // que exclui barra lateral e cabecalho e NAO e o canvas; em 390 vencia um
  // card, porque em coluna unica ele cresce. Nos dois casos a cor batia por
  // COINCIDENCIA -- card e canvas carregam tokens diferentes que, no tema
  // claro, coincidem. Cobertura total resolve os dois: card tem margem.
  //
  // NAO ha recuo para o body. Recuo mascara a perda: na sessao do HelpHS o caso
  // de prova da normalizacao passava SEM a normalizacao, porque o elemento era
  // descartado e a sonda caia no body, que estava certo. Sem elemento que
  // cubra, isto BLOQUEIA e diz que bloqueou.
  const normalizar = (v) => {
    if (!v) return null;
    let m = v.match(/^rgba?[(](\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    // O Chromium devolve color(srgb ...) para tudo que sai de color-mix(), e o
    // tailwind.config.js declara as cores do pacote com color-mix. Comparar
    // string com string nunca casaria.
    m = v.match(/^color[(]srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)/);
    if (m) return [1, 2, 3].map((i) => Math.round(Number(m[i]) * 255));
    return null;
  };
  const opaco = (v) => !!v && v !== 'transparent' && !/,\\s*0([.]0+)?[)]$/.test(v);

  const cobrem = [...document.querySelectorAll('body *')].filter((el) => {
    if (!opaco(getComputedStyle(el).backgroundColor)) return false;
    const r = el.getBoundingClientRect();
    return r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight;
  });
  const canvasEl = cobrem.length ? cobrem[cobrem.length - 1] : null;

  // Ler DUAS vezes, com refluxo forcado entre elas, e exigir concordancia.
  //
  // O valor computado e INTERMITENTE: o mesmo <main>, no mesmo tema escuro,
  // devolveu rgb(248,250,252) numa captura e rgb(13,27,42) em outra, e duas
  // leituras seguidas na MESMA pagina chegaram a discordar entre si.
  //
  // O refluxo e COMPENSACAO, nao conserto. A causa do valor velho segue
  // desconhecida, e fechar a investigacao aqui trocaria o defeito por um laco
  // que o esconde. Esta registrado como investigacao aberta.
  const lerCanvas = () => (canvasEl ? getComputedStyle(canvasEl).backgroundColor : null);
  const leituras = [];
  let assentou = false;
  if (canvasEl) {
    leituras.push(lerCanvas());
    for (let i = 0; i < 4 && !assentou; i++) {
      void document.documentElement.offsetHeight;
      const nova = lerCanvas();
      assentou = nova === leituras[leituras.length - 1];
      leituras.push(nova);
    }
  }

  const igual = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const canvasCor = leituras.length ? normalizar(leituras[leituras.length - 1]) : null;
  const esperadoCanvas = SUPERFICIES['superficie-base'];
  const tokenDe = (c) => Object.keys(SUPERFICIES).find((n) => igual(SUPERFICIES[n], c)) || null;
  const ondeVeio = canvasEl
    ? canvasEl.tagName + (canvasEl.className ? '.' + String(canvasEl.className).trim().split(/\\s+/).join('.') : '')
    : null;

  if (!canvasEl) {
    problemas.push(
      'nenhum elemento opaco cobre o viewport inteiro: nao ha canvas para medir. ' +
      'Sem recuo de proposito, porque recuo mascara a perda.'
    );
  } else if (!assentou) {
    problemas.push('a cor do canvas nao parou de mudar: ' + leituras.join(' -> '));
  } else if (!canvasCor) {
    problemas.push('nao consegui interpretar a cor do canvas: "' + leituras[leituras.length - 1] + '"');
  } else if (!igual(canvasCor, esperadoCanvas)) {
    const achado = tokenDe(canvasCor);
    problemas.push(
      'o canvas (' + ondeVeio + ') esta em rgb(' + canvasCor.join(', ') + ')' +
      (achado ? ', que e --' + achado : ', que nao e token de superficie deste tema') +
      ', e o tema "' + TEMA + '" pede --superficie-base rgb(' + esperadoCanvas.join(', ') + ')'
    );
  }

  // ── 3. A tabela tem a segunda linha? ──────────────────────────────
  //
  // O divisor entre linhas é \`border-b\` na LINHA, então ele só aparece
  // quando há linha seguinte para separar. Com uma linha só, a captura sai
  // sem o elemento que a E14 mudou — e parece uma tabela normal.
  //
  // E conta a tabela VISIVEL, nao a maior. Em /cadastros as tres abas montam
  // tabela no DOM ao mesmo tempo -- linhas [6, 11, 33] -- e so a primeira esta
  // em cena. Decidindo por Math.max sobre todas, a sonda aprovaria uma captura
  // cuja tabela visivel tivesse UMA linha, desde que qualquer aba oculta
  // tivesse duas -- e o divisor, unica coisa que esta checagem existe para
  // garantir, nao apareceria na foto.
  // "Visivel" por tres sinais, e NAO por offsetParent. O offsetParent seria o
  // quarto e foi retirado: ele e null em jsdom para tudo, entao tornaria esta
  // checagem intestavel fora do navegador -- e uma checagem que so pode ser
  // exercitada no lugar onde ela e mais dificil de exercitar tende a nao ser.
  //
  // Ele tambem e redundante aqui: elemento dentro de ancestral com display:none
  // tem retangulo ZERO, e o terceiro sinal ja o pega.
  const visivel = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const tabelas = [...document.querySelectorAll('table')];
  const contar = (tb) => tb.querySelectorAll('tbody tr').length;
  const tabelasVisiveis = tabelas.filter(visivel);
  const linhas = tabelasVisiveis.map(contar);
  const linhasTodas = tabelas.map(contar);
  if (EXIGIR_TABELA) {
    if (!tabelas.length) problemas.push('nenhuma tabela na tela, e esta captura exige uma');
    else if (!tabelasVisiveis.length)
      problemas.push('ha ' + tabelas.length + ' tabela(s) no DOM e nenhuma VISIVEL');
    else if (Math.max(...linhas) < 2)
      problemas.push('a maior tabela VISIVEL tem ' + Math.max(...linhas) + ' linha(s): o divisor entre linhas nao aparece com menos de 2');
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
    // NOME MUDADO DE PROPOSITO. Era "fundo", e "fundo" numa saida de sonda
    // parece veredito. Ele nunca foi comparado com nada e continua nao sendo:
    // e o backgroundColor do <body>, que nas paginas do app fica COBERTO e nao
    // acompanha o tema. Contexto, e rotulado como tal.
    contexto_fundo_body: getComputedStyle(document.body).backgroundColor,
    canvas: canvasCor ? 'rgb(' + canvasCor.join(', ') + ')' : null,
    canvas_elemento: ondeVeio,
    canvas_esperado: 'rgb(' + esperadoCanvas.join(', ') + ')',
    canvas_leituras: leituras,
    canario: canario.ok ? 'ok' : 'REPROVADO',
    linhas_por_tabela: linhas,
    linhas_no_dom: linhasTodas,
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
