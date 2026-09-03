/**
 * Valida a paleta do sistema por cálculo, contra as superfícies reais.
 *
 * ── Por que isto existe como script versionado ────────────────────────
 *
 * Esta conta já foi feita duas vezes em rascunho e jogada fora nas duas. Na
 * segunda vez o custo apareceu: uma varredura de cor deixou o ponto de
 * "Aguardando" idêntico ao de "Aberto" no quadro, e nada quebrou — nem teste,
 * nem tipo, nem build. Cor errada é um defeito que só o olho encontra, e só
 * se o olho estiver olhando para aquela tela naquele dia.
 *
 * Ele NÃO tem uma cópia da paleta. Lê os valores de onde eles realmente
 * moram — os tokens de `src/styles/index.css` e as cores de gráfico de
 * `src/lib/graficos.ts`. Uma segunda cópia daria "tudo certo" enquanto a tela
 * mostra outra coisa, que é exatamente o modo de falha que este script existe
 * para pegar.
 *
 * ── O que ele verifica ────────────────────────────────────────────────
 *
 * 1. Contraste de texto (WCAG 2.1) de todo token de conteúdo e do sinal
 *    contra as duas superfícies do tema. Piso 4.5:1 — inclusive para
 *    `--conteudo-tenue`, que carrega os rótulos monoespaçados. Na maquete
 *    original esse tom dava 2,54:1: o elemento que mais carrega a identidade
 *    era o ilegível.
 *
 * 2. Contraste das cores de gráfico contra a superfície onde são desenhadas.
 *    Piso 3:1, que é o critério de elemento não textual — barra e ponto são
 *    forma, não texto.
 *
 * 3. Separação entre cores que aparecem JUNTAS, para visão normal e para as
 *    três formas de daltonismo. Duas categorias vizinhas com a mesma
 *    aparência não são uma paleta, são uma cor só.
 *
 * 4. Que ninguém escreva modificador de opacidade sobre um token que JÁ tem
 *    alfa próprio — a regra (a′) do D8-a. É o mesmo modo de falha das outras
 *    três: não quebra nada, só fica errado na tela.
 *
 * A simulação usa as matrizes de Machado, Oliveira e Fernandes (2009),
 * aplicadas em RGB linear. A distância é ΔE*ab (CIE76) em Lab D65 — mais
 * grosseira que a CIEDE2000, e escolhida por isso: o limiar fica folgado o
 * bastante para não reprovar paleta boa por causa do modelo.
 *
 * Uso:  npm run validar:paleta
 */

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const CSS = path.join(RAIZ, 'src', 'styles', 'index.css');
const GRAFICOS = path.join(RAIZ, 'src', 'lib', 'graficos.ts');
const FONTE = path.join(RAIZ, 'src');

/**
 * Os sete tokens do pacote que JÁ carregam alfa próprio.
 *
 * Neles o `color-mix` do `tailwind.config.js` compõe em cima do que existe, e
 * o modificador MULTIPLICA em vez de definir: `bg-tint-danger/10` sai em alfa
 * 0,015, não 0,10 — praticamente invisível. Medido no Chrome.
 *
 * `tint-neutral` NÃO entra: é `var(--surface-elevated)`, opaco nos dois temas.
 */
const COM_ALFA = [
  'overlay',
  'action-tint',
  'tint-primary',
  'tint-success',
  'tint-danger',
  'tint-warning',
  'tint-info',
];

/** Piso de contraste para texto (WCAG 2.1 AA). */
const PISO_TEXTO = 4.5;
/** Piso de contraste para forma: barra, ponto, ícone (WCAG 2.1 AA não textual). */
const PISO_FORMA = 3;
/** Separação mínima entre duas cores que aparecem lado a lado, em ΔE*ab. */
const PISO_SEPARACAO = 20;

// ──────────────────────────────────────────────────────────────────────
// Cor
// ──────────────────────────────────────────────────────────────────────

const paraLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const paraSrgb = (v) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(c * 255)));
};

const doHex = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const paraHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();

const luminancia = ([r, g, b]) =>
  0.2126 * paraLinear(r) + 0.7152 * paraLinear(g) + 0.0722 * paraLinear(b);

function contraste(a, b) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/** sRGB → Lab (D65), para medir distância como o olho percebe. */
function paraLab([r, g, b]) {
  const [rl, gl, bl] = [r, g, b].map(paraLinear);

  const x = (0.4124 * rl + 0.3576 * gl + 0.1805 * bl) / 0.95047;
  const y = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
  const z = (0.0193 * rl + 0.1192 * gl + 0.9505 * bl) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function distancia(a, b) {
  const [l1, a1, b1] = paraLab(a);
  const [l2, a2, b2] = paraLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// Matrizes de Machado et al. (2009), severidade 1.0, em RGB linear.
const CVD = {
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simular(rgb, tipo) {
  if (tipo === 'normal') return rgb;
  const m = CVD[tipo];
  const lin = rgb.map(paraLinear);
  return m.map((linha) => paraSrgb(linha[0] * lin[0] + linha[1] * lin[1] + linha[2] * lin[2]));
}

const VISOES = ['normal', 'deuteranopia', 'protanopia', 'tritanopia'];

// ──────────────────────────────────────────────────────────────────────
// Leitura das fontes reais
// ──────────────────────────────────────────────────────────────────────

/**
 * Extrai os tokens de um bloco do CSS. Procura o seletor e lê até a chave que
 * o fecha, para não misturar `:root` com `.dark` — os dois declaram os mesmos
 * nomes com valores diferentes, que é o ponto.
 */
function tokens(css, seletor) {
  const achado = {};
  const inicio = css.indexOf(seletor + ' {');
  if (inicio === -1) throw new Error(`bloco "${seletor}" não encontrado em index.css`);

  const fim = css.indexOf('}', inicio);
  const bloco = css.slice(inicio, fim);

  for (const [, nome, r, g, b] of bloco.matchAll(
    /--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g
  )) {
    achado[nome] = [+r, +g, +b];
  }

  return achado;
}

/**
 * Lê os hexadecimais de uma constante nomeada de graficos.ts, na ordem.
 *
 * Percorre os delimitadores contando abertura e fechamento em vez de casar
 * com expressão regular. A primeira versão usava regex preguiçosa e parava no
 * primeiro `}` OU `]` que encontrasse pela frente — engolia a constante
 * seguinte e devolvia 11 cores onde havia 5. O erro não aparecia como erro:
 * aparecia como paleta aprovada com o dobro do tamanho.
 */
function coresDe(fonte, nome) {
  const decl = fonte.indexOf(`const ${nome}`);
  if (decl === -1) throw new Error(`constante "${nome}" não encontrada em graficos.ts`);

  const igual = fonte.indexOf('=', decl);
  const abre = fonte.slice(igual).search(/[[{]/) + igual;
  const fecha = { '[': ']', '{': '}' }[fonte[abre]];

  let nivel = 0;
  let fim = abre;
  for (; fim < fonte.length; fim++) {
    if (fonte[fim] === fonte[abre]) nivel++;
    else if (fonte[fim] === fecha && --nivel === 0) break;
  }

  const corpo = fonte.slice(abre, fim);
  return [...corpo.matchAll(/#[0-9A-Fa-f]{6}/g)].map((x) => doHex(x[0]));
}

// ──────────────────────────────────────────────────────────────────────
// Verificações
// ──────────────────────────────────────────────────────────────────────

const falhas = [];
const linhas = [];

function exigirContraste(rotulo, cor, fundo, piso) {
  const n = contraste(cor, fundo);
  const passou = n >= piso;
  if (!passou) falhas.push(`${rotulo}: ${n.toFixed(2)}:1, mínimo ${piso}:1`);
  linhas.push(`  ${passou ? 'ok  ' : 'FALHA'} ${rotulo.padEnd(44)} ${n.toFixed(2).padStart(6)}:1`);
  return passou;
}

/**
 * Compara TODOS os pares de um conjunto, em todas as visões, e relata todos os
 * que reprovam.
 *
 * Relatar só o pior par foi um erro que custou caro: a paleta da 1.3.2 tinha
 * quatro colisões e o relatório mostrava uma. Consertar aquela fazia a
 * seguinte aparecer, uma por vez, dando a impressão de que faltava pouco
 * quando na verdade o conjunto inteiro precisava ser refeito.
 *
 * Compara qualquer par, não vizinhos: num gráfico de cinco barras as cinco
 * estão na tela juntas, e o olho compara qualquer uma com qualquer outra.
 */
function exigirSeparacao(rotulo, cores) {
  const unicas = [...new Map(cores.map((c) => [paraHex(c), c])).values()];
  const ruins = [];
  let pior = Infinity;

  for (let i = 0; i < unicas.length; i++) {
    for (let j = i + 1; j < unicas.length; j++) {
      let menor = Infinity;
      let visaoPior = '';

      for (const visao of VISOES) {
        const d = distancia(simular(unicas[i], visao), simular(unicas[j], visao));
        if (d < menor) {
          menor = d;
          visaoPior = visao;
        }
      }

      if (menor < pior) pior = menor;
      if (menor < PISO_SEPARACAO) {
        ruins.push(
          `ΔE ${menor.toFixed(1)} entre ${paraHex(unicas[i])} e ${paraHex(unicas[j])} (${visaoPior})`
        );
      }
    }
  }

  const passou = ruins.length === 0;
  if (!passou) {
    falhas.push(`${rotulo}: ${ruins.length} par(es) abaixo de ΔE ${PISO_SEPARACAO}`);
  }

  linhas.push(
    `  ${passou ? 'ok  ' : 'FALHA'} ${rotulo.padEnd(44)} pior par ΔE ${pior.toFixed(1).padStart(5)}`
  );
  ruins.forEach((r) => linhas.push(`         ${r}`));
}

/**
 * Regra (a′) do D8-a: modificador de opacidade nunca vai nos sete acima.
 *
 * ── Por que isto é um teste e não uma convenção ───────────────────────
 *
 * A armadilha é que a sintaxe é IDÊNTICA à que funciona. `bg-perigo/10` vem
 * da ponte em canais `R G B` e DEFINE o alfa em 0,10; `bg-tint-danger/10` vem
 * do `color-mix` e MULTIPLICA, dando 0,015. Escritas lado a lado, ninguém vê
 * diferença — e as duas convivem dentro da mesma chave do `tailwind.config`.
 *
 * Quem escrever isso não recebe erro de lint, de tipo, de teste nem de build.
 * Recebe um selo com fundo invisível, e o conserto intuitivo — subir para /20,
 * /30, /50 — continua multiplicando e nunca chega nos 15% do pacote.
 *
 * Esses sete já SÃO "a cor a 15%". Para outra opacidade, use a cor cheia.
 */
function exigirSemModificadorDeOpacidade() {
  const arquivos = [];
  (function varrer(dir) {
    for (const nome of fs.readdirSync(dir)) {
      const caminho = path.join(dir, nome);
      if (fs.statSync(caminho).isDirectory()) {
        // A cópia do pacote não é código nosso, e não escreve classe do
        // Tailwind — varrê-la só traria ruído.
        if (nome !== 'design-system') varrer(caminho);
      } else if (/\.(tsx?|css|html)$/.test(nome)) {
        arquivos.push(caminho);
      }
    }
  })(FONTE);

  // `bg-tint-danger/10`, `hover:bg-overlay/50`, `bg-action-tint/[.15]` — o que
  // importa é o nome do token seguido de barra. O prefixo de variante não
  // muda nada, então nem entra no padrão.
  const alvo = new RegExp(
    '[a-z-]+-(' + COM_ALFA.join('|') + ')/(\\[[^\\]]+\\]|[0-9]+)',
    'g'
  );

  const achados = [];
  for (const arquivo of arquivos) {
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    conteudo.split('\n').forEach((linha, i) => {
      for (const m of linha.match(alvo) ?? []) {
        const rel = path.relative(RAIZ, arquivo).split(path.sep).join('/');
        achados.push(`${rel}:${i + 1}  ${m}`);
      }
    });
  }

  if (achados.length) {
    falhas.push(
      `modificador de opacidade em token que já tem alfa (regra a′ do D8-a): ` +
        `${achados.length} ocorrência(s)\n      ` +
        achados.join('\n      ')
    );
  }
  linhas.push(
    `\n=== regra (a′) — modificador de opacidade nos ${COM_ALFA.length} tokens com alfa ===` +
      `\n  ${arquivos.length} arquivos varridos, ${achados.length} ocorrência(s)`
  );
}


// ──────────────────────────────────────────────────────────────────────
// Fundo de cor cheia com texto branco cravado — catraca
// ──────────────────────────────────────────────────────────────────────

/**
 * Doze pares que reprovam hoje, e um mecanismo para eles só diminuírem.
 *
 * ── O problema que isto guarda ────────────────────────────────────────
 *
 * `bg-sucesso text-white` dá 2,54:1. `bg-perigo text-white`, 3,76:1.
 * `bg-sinal text-white`, 2,69:1 no tema escuro. São classes escritas à mão em
 * página, e a Fase 7 consertou o `Button` sem alcançar nenhuma delas —
 * corrigir o primitivo não alcança quem não o usa.
 *
 * A lista com arquivo e linha está em
 * `docs/design-system-migration/fase-7/contraste-fundo-cheio.md`. Elas saem
 * nas Fases 11–16, por tela, como a §25 manda.
 *
 * ── Por que uma catraca, e não uma lista de exceção ───────────────────
 *
 * Lista de exceção costuma sobreviver ao problema que a criou: nasce como
 * "os que já existiam", e em seis meses é uma permissão. Esta não consegue,
 * porque reprova nos DOIS sentidos:
 *
 *   apareceu par novo   -> falha (é o que qualquer guarda faz)
 *   sumiu par da lista  -> TAMBÉM falha, pedindo para baixar o número
 *
 * O segundo é o que impede o apodrecimento. Consertar uma tela obriga a
 * mexer aqui, e o número só anda para baixo. Quando chegar a zero, o bloco
 * inteiro sai e sobra a varredura, que aí passa a reprovar qualquer par.
 *
 * ── A chave é arquivo + fundo + estado, sem linha ─────────────────────
 *
 * Número de linha muda a cada edição acima dele, e uma catraca que grita por
 * causa de uma linha em branco é uma catraca que alguém desliga.
 */
const PARES_CONHECIDOS = new Map([
  ['src/components/cadastros/CategoriasTab.tsx  bg-perigo  repouso', 1],
  ['src/pages/ChamadoDetalhes.tsx  bg-info  repouso', 3],
  ['src/pages/ChamadoDetalhes.tsx  bg-perigo  repouso', 3],
  ['src/pages/ChamadoDetalhes.tsx  bg-sinal  repouso', 3],
  ['src/pages/ChamadoDetalhes.tsx  bg-sucesso  repouso', 2],
]);

/** Os fundos de cor cheia que podem carregar texto, e de onde sai o valor. */
const FUNDOS_CHEIOS = {
  'bg-sinal': 'sinal',
  'bg-sucesso': 'sucesso',
  'bg-sucesso-forte': 'sucesso-forte',
  'bg-perigo': 'perigo',
  'bg-perigo-forte': 'perigo-forte',
  'bg-alerta': 'alerta',
  'bg-alerta-forte': 'alerta-forte',
  'bg-info': 'info',
  'bg-info-forte': 'info-forte',
};

const BRANCO = [255, 255, 255];

/**
 * Varre `src/` atrás de fundo de cor cheia com `text-white` na mesma lista de
 * classes, e no MESMO estado.
 *
 * Quatro armadilhas, todas encontradas na prática, três delas por mim:
 *
 * 1. Filtrar diretório. A primeira varredura pulava `components/ui/`, e o pior
 *    caso de todos estava em `components/layout/` — o link de pular para o
 *    conteúdo.
 * 2. Casar linha a linha. `className` quebra em várias linhas o tempo todo.
 * 3. Ignorar o estado. `hover:bg-perigo-forte` casado com um `text-white` de
 *    repouso troca 3,76:1 por 6,47:1 e transforma reprovação em aprovação.
 * 4. Parear ramos de ternário. Juntar as strings de um `cn(...)` põe lado a
 *    lado classes mutuamente exclusivas e INVENTA reprovação — a sessão do
 *    HelpHS produziu seis de 1,00:1 assim.
 *
 *    Casar "dentro de um literal" NÃO basta, e eu achei que bastasse: um
 *    template com `${cond ? 'A' : 'B'}` É um literal só, e os dois ramos
 *    ficam dentro dele. Foi assim que `Dashboard.tsx` apareceu com
 *    `bg-sinal` de um ramo pareado com `text-conteudo-suave` do outro, em
 *    2,18:1 — que não existe em pixel nenhum. Por isso o conteúdo de cada
 *    `${...}` é recortado antes, e as strings de dentro dele são lidas
 *    separadamente.
 *
 * 5. Ignorar que o estado também troca o TEXTO. `text-conteudo-tenue
 *    hover:bg-superficie-elevada hover:text-conteudo` não põe o texto tênue
 *    sobre o fundo elevado: no hover valem os dois `hover:`. Parear o texto
 *    base com o fundo de hover inventa uma combinação que a CSS nunca produz.
 *    O texto que vale num estado é o daquele estado; o base só entra quando o
 *    estado não declara texto próprio.
 *
 * O preço da 4 é subcontar quando o fundo está no literal base e o texto num
 * condicional. Subcontar é melhor que inventar: um número a menos é uma
 * tarefa esquecida, um número inventado é uma tarefa que não existe.
 */
/**
 * As classes, com o `!` opcional — armadilha 7.
 *
 * `!bg-perigo` e `hover:!bg-perigo` são classes válidas, e o padrão anterior
 * não as via. Cegueira, não invenção; mas cegueira silenciosa.
 */
const CLASSE_FUNDO = /(?:^|\s)((?:[\w-]+:)*)!?(bg-[\w-]+)(?![-\w/])/g;
const CLASSE_TEXTO = /(?:^|\s)((?:[\w-]+:)*)!?(text-[\w-]+)(?![-\w/])/g;

/** `md:hover:` vira ['md','hover']. Sem prefixo, lista vazia. */
const variantesDe = (prefixo) => (prefixo ? prefixo.split(':').filter(Boolean) : []);

/** Todo elemento de `a` está em `b`? */
const contido = (a, b) => a.every((v) => b.includes(v));

/**
 * Recorta cada interpolação de template contando chaves — armadilha 8.
 *
 * Devolve os trechos ESTÁTICOS do literal, na ordem. Recortar até o primeiro
 * `}` erra quando a interpolação tem chaves dentro, como em
 * `cn({ ativo }, '...')`, e mistura pedaços de ramos diferentes. Aqui isso só
 * produzia cegueira — a classe precisa vir depois de espaço, e no pedaço ela
 * vinha depois de aspa — mas na varredura do HelpHS produzia falso positivo.
 */
function semInterpolacao(texto) {
  const CIFRAO = String.fromCharCode(36);
  const trechos = [];
  let atual = '';
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === CIFRAO && texto[i + 1] === '{') {
      trechos.push(atual);
      atual = '';
      let nivel = 1;
      i += 2;
      for (; i < texto.length && nivel > 0; i++) {
        if (texto[i] === '{') nivel++;
        else if (texto[i] === '}') nivel--;
      }
      i--;
    } else {
      atual += texto[i];
    }
  }
  trechos.push(atual);
  return trechos;
}

function varrerFundoCheio() {
  // Lidos uma vez, e não a cada par encontrado.
  const css = fs.readFileSync(CSS, 'utf8');
  const NO_CLARO = tokens(css, ':root');
  const NO_ESCURO = tokens(css, '.dark');

  const arquivos = [];
  (function varrer(dir) {
    for (const nome of fs.readdirSync(dir)) {
      const caminho = path.join(dir, nome);
      if (fs.statSync(caminho).isDirectory()) {
        if (nome !== 'design-system') varrer(caminho);
      } else if (/\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome)) {
        arquivos.push(caminho);
      }
    }
  })(FONTE);

  const encontrados = new Map();

  for (const arquivo of arquivos) {
    const txt = fs.readFileSync(arquivo, 'utf8');
    const rel = path.relative(RAIZ, arquivo).split(path.sep).join('/');

    for (const m of txt.matchAll(/(["'`])((?:(?!\1)[\s\S]){0,600}?)\1/g)) {
      // Armadilha 4: um `${...}` dentro de um template junta ramos de
      // ternario no MESMO literal. O conteudo da interpolacao vira separador;
      // as strings de dentro dela sao lidas por conta propria, porque o
      // matchAll continua correndo o arquivo inteiro.
      for (const lista of semInterpolacao(m[2])) {
        // `text-` não é só cor: `text-xs`, `text-left` e `text-nowrap` usam o
        // mesmo prefixo. Sem este filtro, "o texto deste estado" devolvia o
        // TAMANHO da fonte e o pareamento parava de achar qualquer coisa —
        // uma catraca que zera sozinha é pior que catraca nenhuma, porque
        // parece conserto.
        const NAO_E_COR =
          /^text-(?:\d?xs|sm|base|lg|\d?xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|opacity-\d+)$/;
        const textos = [...lista.matchAll(CLASSE_TEXTO)]
          .map((x) => ({ variantes: variantesDe(x[1]), nome: x[2] }))
          .filter((x) => !NAO_E_COR.test(x.nome));
        if (!textos.length) continue;

        // Armadilhas 5 e 6: PRECEDENCIA, e nao igualdade de prefixo.
        //
        // A primeira versao perguntava "este estado declara texto proprio?" e,
        // se nao, caia no texto base. Funciona com um nivel de variante e
        // volta a inventar assim que eles se compoem: para `md:hover:bg-X`,
        // nao ha `md:hover:text-`, entao ela usava o texto base e IGNORAVA um
        // `hover:text-` que a CSS aplica ali. Provado com fixture — contava um
        // par que nao existe.
        //
        // O modelo do Tailwind e conteudo + especificidade: vale o texto cujas
        // variantes estao CONTIDAS nas do fundo, e entre os candidatos ganha o
        // de mais variantes (no empate, o ultimo escrito).
        const textoDoEstado = (variantesDoFundo) => {
          let melhor = null;
          for (const tx of textos) {
            if (!contido(tx.variantes, variantesDoFundo)) continue;
            if (!melhor || tx.variantes.length >= melhor.variantes.length) melhor = tx;
          }
          return melhor ? melhor.nome : null;
        };

      for (const fm of lista.matchAll(CLASSE_FUNDO)) {
        const estado = fm[1];
        const fundo = fm[2];
        const token = FUNDOS_CHEIOS[fundo];
        if (!token) continue;
        if (textoDoEstado(variantesDe(estado)) !== 'text-white') continue;

        // O `.dark` NÃO redeclara as cores de significado, de propósito:
        // erro é vermelho nos dois temas. Sem o fallback para `:root` a
        // busca devolve `undefined` e a conta estoura — foi o que aconteceu.
        const claro = contraste(NO_CLARO[token], BRANCO);
        const escuro = contraste(NO_ESCURO[token] ?? NO_CLARO[token], BRANCO);
        if (claro >= PISO_TEXTO && escuro >= PISO_TEXTO) continue;

        const chave = `${rel}  ${fundo}  ${estado || 'repouso'}`;
        encontrados.set(chave, (encontrados.get(chave) || 0) + 1);
      }
      }
    }
  }
  return encontrados;
}

function exigirCatracaDeFundoCheio() {
  const achados = varrerFundoCheio();
  const chaves = [...new Set([...achados.keys(), ...PARES_CONHECIDOS.keys()])].sort();

  const novos = [];
  const consertados = [];
  for (const k of chaves) {
    const agora = achados.get(k) || 0;
    const base = PARES_CONHECIDOS.get(k) || 0;
    if (agora > base) novos.push(`${k}  ->  ${base} na linha de base, ${agora} agora`);
    else if (agora < base) consertados.push({ k, agora, base });
  }

  if (novos.length) {
    falhas.push(
      'fundo de cor cheia com texto branco, PAR NOVO (piso 4,5:1):\n      ' +
        novos.join('\n      ') +
        '\n      Use o Button, ou o degrau de acao da E2 (--action-danger / --action-success).'
    );
  }

  if (consertados.length) {
    const linhas = chaves
      .map((k) => ({ k, n: achados.get(k) || 0 }))
      .filter((x) => x.n > 0)
      .map((x) => `  ['${x.k}', ${x.n}],`);
    falhas.push(
      'a catraca precisa descer — par(es) consertado(s), atualize PARES_CONHECIDOS em\n' +
        '      scripts/validar-paleta.js. A lista inteira, ja pronta:\n' +
        (linhas.length ? linhas.join('\n') : '  (vazia — apague o bloco inteiro e faca a varredura reprovar sempre)')
    );
  }

  const total = [...achados.values()].reduce((a, b) => a + b, 0);
  linhas.push(
    `\n=== catraca — fundo de cor cheia com texto branco ===` +
      `\n  ${total} par(es) abaixo de ${PISO_TEXTO}:1, linha de base ${[...PARES_CONHECIDOS.values()].reduce((a, b) => a + b, 0)}`
  );
}

function main() {
  const css = fs.readFileSync(CSS, 'utf8');
  const graficos = fs.readFileSync(GRAFICOS, 'utf8');

  const temas = {
    claro: { tk: tokens(css, ':root'), sufixo: 'CLARA' },
    escuro: { tk: tokens(css, '.dark'), sufixo: 'ESCURA' },
  };

  for (const [nome, { tk, sufixo }] of Object.entries(temas)) {
    linhas.push(`\n=== tema ${nome} ===`);

    // 1. Texto sobre as duas superfícies onde ele de fato aparece.
    for (const fundo of ['superficie', 'superficie-base']) {
      for (const cor of ['conteudo', 'conteudo-suave', 'conteudo-tenue', 'sinal']) {
        exigirContraste(`${cor} sobre ${fundo}`, tk[cor], tk[fundo], PISO_TEXTO);
      }
    }

    // 2. Gráficos contra a superfície do card, que é onde eles são desenhados.
    const categoricas = coresDe(graficos, `CATEGORICA_${sufixo}`);
    const status = coresDe(graficos, `STATUS_${nome === 'claro' ? 'CLARO' : 'ESCURO'}`);
    const prioridades = coresDe(graficos, `PRIORIDADE_${sufixo}`);

    categoricas.forEach((c, i) =>
      exigirContraste(`categórica[${i}] ${paraHex(c)}`, c, tk['superficie'], PISO_FORMA)
    );
    status.forEach((c) =>
      exigirContraste(`status ${paraHex(c)}`, c, tk['superficie'], PISO_FORMA)
    );
    prioridades.forEach((c) =>
      exigirContraste(`prioridade ${paraHex(c)}`, c, tk['superficie'], PISO_FORMA)
    );

    // 3. Separação entre cores que dividem a mesma tela.
    exigirSeparacao('categóricas entre si', categoricas);
    exigirSeparacao('status entre si', status);
    exigirSeparacao('prioridades entre si', prioridades);
  }

  exigirSemModificadorDeOpacidade();
  exigirCatracaDeFundoCheio();

  console.log(linhas.join('\n'));

  if (falhas.length) {
    console.error(`\n${falhas.length} falha(s):`);
    falhas.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('\nPaleta validada.');
}

main();
