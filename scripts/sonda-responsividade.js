/**
 * Sonda da §20 — os quatro critérios que foto não mede.
 *
 * ── Por que ela existe, e por que vem ANTES das capturas ─────────────
 *
 * A §20 é explícita sobre o que NÃO basta:
 *
 *   > Não considere responsivo só porque não há scrollbar horizontal: tela
 *   > cortada, botão inalcançável, texto sobreposto e toque menor que 40px
 *   > contam como falha.
 *
 * Nenhum dos quatro é visível numa captura. Alvo de toque de 38px parece
 * perfeito na foto; sobreposição de 3px também; botão coberto por um overlay
 * transparente é indistinguível de botão são. Fotografar seis larguras em quatro
 * telas e dois temas custaria 48 imagens para provar MENOS do que este arquivo.
 *
 * Decisão do operador, 09/09/2026: **a sonda vem antes, e as capturas ficam só
 * para o que ela não alcança.**
 *
 * ── Como usar ────────────────────────────────────────────────────────
 *
 * Cole o conteúdo de `EXPRESSAO` no console, com a janela na largura desejada.
 * Devolve um objeto; `ERRO` preenchido significa que NADA foi medido.
 *
 * ── Onde ela PARA — dito antes de rodar ──────────────────────────────
 *
 * **Mede um estado de tela por vez.** Menu fechado não é menu aberto; a gaveta
 * do mobile só entra na conta se estiver aberta quando a sonda roda.
 *
 * **Não rola a página.** O que está abaixo da dobra é medido pela geometria, que
 * é o certo para corte e alvo, mas `elementFromPoint` só responde sobre o que
 * está no viewport — então a cobertura de botão é aferida SÓ para o que está
 * visível agora. Está declarado no retorno, em `cobertura_aferida_em`.
 *
 * **Sobreposição exige 25% da área do menor.** Abaixo disso o ruído de
 * antialiasing e de `line-height` produz falso positivo em texto justaposto, e
 * catraca que grita à toa treina todo mundo a ignorá-la.
 *
 * **Alvo de toque conta em TODAS as larguras**, porque a §20 não qualifica. O
 * resultado separa mobile de desktop para quem for decidir, mas a sonda não
 * decide por conta própria.
 */

const EXPRESSAO = String.raw`
(() => {
  // ── Identidade da página, antes de qualquer medida ────────────────
  // Regra estendida em 09/09/2026: vale para medição solta, não só captura.
  const app = document.documentElement.getAttribute('data-app');
  if (app !== 'chamadoshs')
    return { ERRO: 'pagina nao e do chamadoshs, e sim: ' + (app || '(sem data-app)') };

  const W = window.innerWidth, H = window.innerHeight;
  const TOL = 1;                 // arredondamento de layout
  const ALVO = 40;               // §20
  const AREA = 0.25;             // fração mínima da área do menor

  const visivel = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const nome = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).slice(0, 3).join('.');
    const txt = (el.textContent || '').trim().slice(0, 28);
    return el.tagName.toLowerCase() + id + (cls ? '.' + cls : '') + (txt ? ' "' + txt + '"' : '');
  };

  const todos = [...document.body.querySelectorAll('*')].filter(visivel);

  // ── 1. TELA CORTADA ───────────────────────────────────────────────
  // Só conta quem transborda o VIEWPORT sem ter um ancestral que role ou
  // recorte — tabela dentro de overflow-x:auto está certa, e acusá-la seria
  // a sonda cobrando do conserto.
  const recortado = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(o.overflowX + ' ' + o.overflow)) return true;
    }
    return false;
  };
  const cortados = todos
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return (r.right > W + TOL || r.left < -TOL) && !recortado(el);
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return nome(el) + '  [' + Math.round(r.left) + '..' + Math.round(r.right) + '] de ' + W;
    });

  // ── 2. ALVO DE TOQUE ──────────────────────────────────────────────
  const INTERATIVO = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [tabindex]:not([tabindex="-1"])';
  const controles = [...document.querySelectorAll(INTERATIVO)].filter(visivel);
  const medidos = controles.map((el) => ({ el, r: el.getBoundingClientRect() }));

  // O link "Pular para o conteúdo" é 1×1 até receber foco, porque é assim que
  // se escreve um atalho de leitor de tela. Ele não é alvo de toque, e acusá-lo
  // seria a sonda cobrando de quem fez acessibilidade direito.
  //
  // Vai para BALDE PRÓPRIO e não para o lixo: se um botão de verdade colapsar
  // para 1×1, ele aparece aqui em vez de sumir. Corte silencioso é o que esta
  // sonda existe para não ter.
  const srOnly = medidos.filter(({ r }) => r.width <= 1 && r.height <= 1);
  const pequenos = medidos
    .filter(({ r }) => r.width > 1 && r.height > 1 && Math.min(r.width, r.height) < ALVO)
    .map(({ el, r }) => nome(el) + '  ' + Math.round(r.width) + '×' + Math.round(r.height));

  // ── 3. BOTÃO INALCANÇÁVEL ─────────────────────────────────────────
  // Coberto por outro elemento no próprio centro. Descendente e ancestral
  // contam como o próprio: o alvo do clique continua sendo ele.
  const noViewport = ({ r }) => r.top >= 0 && r.left >= 0 && r.bottom <= H && r.right <= W;
  const comRect = controles.map((el) => ({ el, r: el.getBoundingClientRect() }));
  const afericao = comRect.filter(noViewport);
  const cobertos = afericao
    .filter(({ el, r }) => {
      const alvo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return alvo && alvo !== el && !el.contains(alvo) && !alvo.contains(el);
    })
    .map(({ el, r }) => {
      const a = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return nome(el) + '  coberto por  ' + nome(a);
    });

  // ── 4. TEXTO SOBREPOSTO ───────────────────────────────────────────
  // Só FOLHAS com texto: um pai sempre cobre o filho, e parear os dois
  // acusaria toda página do mundo.
  const folhas = todos.filter((el) => {
    if (el.children.length) return false;
    const t = (el.textContent || '').trim();
    if (!t) return false;
    return getComputedStyle(el).pointerEvents !== 'none';
  });
  const sobrepostos = [];
  for (let i = 0; i < folhas.length; i++) {
    for (let j = i + 1; j < folhas.length; j++) {
      const a = folhas[i], b = folhas[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const larg = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const alt = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (larg <= 0 || alt <= 0) continue;
      const menor = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (menor > 0 && (larg * alt) / menor >= AREA)
        sobrepostos.push(nome(a) + '  sobre  ' + nome(b));
    }
  }

  return {
    regua: W + '×' + H,
    tema: document.documentElement.classList.contains('dark') ? 'escuro' : 'claro',
    rota: location.pathname,
    scrollWidth: document.documentElement.scrollWidth,
    barra_horizontal: document.documentElement.scrollWidth > W,
    cortado: cortados.length, cortado_quais: cortados.slice(0, 12),
    alvo_pequeno: pequenos.length, alvo_pequeno_quais: pequenos.slice(0, 12),
    sr_only_ignorados: srOnly.length,
    coberto: cobertos.length, coberto_quais: cobertos.slice(0, 12),
    sobreposto: sobrepostos.length, sobreposto_quais: sobrepostos.slice(0, 12),
    controles_no_total: controles.length,
    cobertura_aferida_em: afericao.length + ' de ' + controles.length + ' (só o que está no viewport)',
  };
})()
`;

module.exports = { EXPRESSAO };
