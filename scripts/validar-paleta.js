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

  console.log(linhas.join('\n'));

  if (falhas.length) {
    console.error(`\n${falhas.length} falha(s):`);
    falhas.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('\nPaleta validada.');
}

main();
