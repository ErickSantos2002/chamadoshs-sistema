/**
 * Contraste medido no NAVEGADOR, a partir do estilo computado.
 *
 * ── Por que na página, e não no script ────────────────────────────────
 *
 * A varredura de `scripts/validar-paleta.js` lê os arquivos e resolve os
 * `var()` na unha. Serve para o que ela faz — varrer tudo sem abrir browser —
 * mas mede o que o CSS *diz*, não o que o navegador *pinta*.
 *
 * Aqui é o contrário, e é isso que transforma a galeria em evidência: quem
 * resolve a cascata, o `color-mix`, a herança e o alfa é o próprio Chrome.
 * Se o token estiver errado, se a classe não existir, se o `color-mix` cair
 * para `unset` — o número muda, e muda na imagem.
 *
 * ── O fundo pode estar num ancestral ──────────────────────────────────
 *
 * É a sexta limitação que a varredura tem e esta função não tem: o fundo do
 * elemento pode ser transparente, e quem pinta é o pai. Aqui se sobe a árvore
 * compondo os fundos translúcidos até achar um opaco, que é exatamente o que
 * o olho vê.
 */

type RGBA = { rgb: [number, number, number]; a: number };

/** `rgb(a)`, `color(srgb …)` e `#rrggbb` — o que o Chrome devolve hoje. */
function daCorComputada(valor: string): RGBA | null {
  const s = valor.trim();
  if (!s || s === 'transparent' || s === 'none') return { rgb: [0, 0, 0], a: 0 };

  let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/i);
  if (m) {
    return {
      rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
      a: m[4] === undefined ? 1 : Number(m[4]),
    };
  }

  // `color(srgb 0.12 0.53 0.79 / 0.15)` — o formato que o `color-mix` devolve
  m = s.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/i);
  if (m) {
    return {
      rgb: [Number(m[1]) * 255, Number(m[2]) * 255, Number(m[3]) * 255],
      a: m[4] === undefined ? 1 : Number(m[4]),
    };
  }

  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const h = m[1];
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number], a: 1 };
  }

  return null;
}

const paraLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const luminancia = ([r, g, b]: [number, number, number]) =>
  0.2126 * paraLinear(r) + 0.7152 * paraLinear(g) + 0.0722 * paraLinear(b);

/**
 * Composição em ponto flutuante, sem arredondar por canal.
 *
 * É o método que a sessão do HelpHS usa, e o que o navegador faz. Arredondando
 * a diferença fica em até 0,02 e não muda veredito, mas os números dos dois
 * repositórios precisam ser comparáveis.
 */
const sobre = (
  frente: [number, number, number],
  alfa: number,
  fundo: [number, number, number]
): [number, number, number] =>
  [0, 1, 2].map((i) => alfa * frente[i] + (1 - alfa) * fundo[i]) as [number, number, number];

/** O fundo EFETIVO do elemento: sobe a árvore até compor um opaco. */
export function fundoEfetivo(el: Element): [number, number, number] {
  const pilha: RGBA[] = [];
  let atual: Element | null = el;

  while (atual) {
    const cor = daCorComputada(getComputedStyle(atual).backgroundColor);
    if (cor && cor.a > 0) {
      pilha.push(cor);
      if (cor.a >= 1) break;
    }
    atual = atual.parentElement;
  }

  // Sem nada opaco na árvore, o papel do navegador é branco.
  let resultado: [number, number, number] = [255, 255, 255];
  for (let i = pilha.length - 1; i >= 0; i--) {
    resultado = sobre(pilha[i].rgb, pilha[i].a, resultado);
  }
  return resultado;
}

/**
 * A razão de contraste do TEXTO do elemento contra o fundo que ele tem atrás.
 *
 * Devolve `null` quando não dá para medir — cor que não parseia, elemento sem
 * texto. Devolver `null` é melhor que devolver um número inventado: a galeria
 * mostra um traço, e um traço é uma pergunta; um número errado é uma resposta.
 */
export function contrasteDoTexto(el: Element): number | null {
  const texto = daCorComputada(getComputedStyle(el).color);
  if (!texto) return null;

  const fundo = fundoEfetivo(el);
  // Texto translúcido compõe sobre o próprio fundo antes de contar.
  const frente = texto.a < 1 ? sobre(texto.rgb, texto.a, fundo) : texto.rgb;

  const [claro, escuro] = [luminancia(frente), luminancia(fundo)].sort((a, b) => b - a);
  return (claro + 0.05) / (escuro + 0.05);
}

export const PISO_TEXTO = 4.5;
export const PISO_FORMA = 3;

/** `7,58:1` — vírgula decimal, como o resto dos registros do projeto. */
export const formatar = (n: number | null) =>
  n === null ? '—' : `${n.toFixed(2).replace('.', ',')}:1`;
