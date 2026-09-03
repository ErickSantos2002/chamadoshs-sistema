import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  Avatar,
  Badge,
  BlocoCarregando,
  Button,
  Card,
  CardHeader,
  Spinner,
  type VarianteBadge,
  type VarianteBotao,
} from '../../components/ui';
import {
  MarcaBadge,
  PrioridadeBadge,
  StatusBadge,
  VARIANTE_DE_PRIORIDADE,
  VARIANTE_DE_STATUS,
} from '../../components/SelosDeChamado';
import { PrioridadeEnum, StatusEnum } from '../../types/api';
import { contrasteDoTexto, formatar, PISO_TEXTO } from './contraste';

/**
 * A galeria de componentes — só em desenvolvimento.
 *
 * ── O que a separa de uma ilustração ──────────────────────────────────
 *
 * A §26 exige, no Checkpoint 2, "screenshot de cada primitivo em todos os
 * estados nos dois temas". Uma página que só DESENHA os componentes cumpre a
 * letra e não prova nada: quem olha a imagem não sabe se o que está vendo
 * passa em contraste.
 *
 * Por isso cada amostra traz a RAZÃO DE CONTRASTE medida na hora, a partir do
 * `getComputedStyle`. Quem resolve a cascata, o `color-mix`, a herança e o
 * alfa é o próprio navegador — se o token estiver errado, se a classe não
 * existir, se o `color-mix` cair para `unset`, o número muda NA IMAGEM.
 *
 * É a diferença entre uma galeria que mostra e uma que prova.
 *
 * ── O tema NÃO é aplicado aqui ────────────────────────────────────────
 *
 * Entra em `main.tsx`, síncrono, antes do `createRoot`. A nota longa está lá:
 * aplicar por efeito fazia a primeira pintura sair no tema errado, e a moldura
 * e o iframe disputavam a mesma chave de `localStorage`.
 *
 * ── Os três marcadores, e por que são três ────────────────────────────
 *
 *   data-tema-pronto   posto por `main.tsx`   o tema foi aplicado, e qual
 *   data-galeria       posto aqui             a ROTA renderizou
 *   data-medido        posto aqui             as medições terminaram (quantas)
 *
 * O primeiro sozinho não basta: ele existe mesmo quando a rota cai no fallback
 * de login, porque `main.tsx` roda antes do roteador. O segundo é o que separa
 * "a galeria está na tela" de "alguma coisa está na tela" — e foi preciso
 * porque, com o servidor frio, a primeira captura de ontem saiu a tela de
 * login. O terceiro evita fotografar a tabela com traços no lugar dos números.
 *
 * **Quem captura não fotografa antes dos três, e ainda confere o
 * `backgroundColor` computado do body.** Atributo é promessa; pixel é fato.
 *
 * ── Como se usa ───────────────────────────────────────────────────────
 *
 *   /dev/componentes?tema=claro
 *   /dev/componentes?tema=escuro&grupo=badge
 *   /dev/componentes?tema=claro&grupo=button&foco=primario
 *
 * `tema`   claro | escuro                          (exigido na captura)
 * `grupo`  badge | button | card | avatar | spinner | tudo  (padrão: tudo)
 * `foco`   a variante de Button que recebe foco    (ver a nota em Botoes)
 *
 * ── Por que não entra em produção ─────────────────────────────────────
 *
 * `router.tsx` só registra a rota sob `import.meta.env.DEV`, que o Vite troca
 * por `false` literal: o `import()` morre no tree-shaking. Sai inteira na Fase
 * 20, junto com a galeria da casca.
 */

/* ─────────────────────────────────────────────────────────────────────
   A amostra
   ───────────────────────────────────────────────────────────────────── */

type Medicoes = Record<string, number | null>;

/**
 * Uma amostra: o componente, o rótulo, e a razão medida embaixo.
 *
 * ── Por que o alvo é achado por SELETOR, e não por prop ───────────────
 *
 * O caminho óbvio seria marcar o elemento a medir com `data-medir`. Não dá:
 * `Badge` e `Avatar` declaram as props uma a uma e não repassam o resto, e o
 * TypeScript recusa `data-*` em componente sem índice — permitir isso seria
 * alargar a API de dois primitivos por causa de uma página de desenvolvimento,
 * que é o rabo abanando o cachorro.
 *
 * Então a amostra embrulha o filho num slot e mede o primeiro elemento dentro
 * dele — o `<span>` do Badge, o `<button>` do Button, o `<span>` do Avatar.
 * Quando o que interessa está mais fundo (o `<p>` dentro do Card), `seletor`
 * diz onde.
 */
const Amostra: React.FC<{
  id: string;
  rotulo: string;
  nota?: string;
  seletor?: string;
  /** Token de fundo sob a amostra. Sem ele, a superfície é a da página. */
  fundo?: string;
  medicoes: Medicoes;
  children: React.ReactNode;
}> = ({ id, rotulo, nota, seletor, fundo, medicoes, children }) => {
  const razao = medicoes[id];
  const reprova = typeof razao === 'number' && razao < PISO_TEXTO;

  return (
    <div
      data-amostra={id}
      data-seletor={seletor}
      className="flex min-w-[8.5rem] flex-col gap-2"
    >
      <div
        data-alvo=""
        // O fundo entra num ancestral do que se mede, e não no próprio
        // elemento — que é exatamente o caso real, e o que `fundoEfetivo`
        // sabe resolver subindo a árvore e compondo os translúcidos.
        style={fundo ? { backgroundColor: `var(${fundo})` } : undefined}
        className={
          fundo
            ? 'flex min-h-[2.5rem] items-center px-3'
            : 'flex min-h-[2.5rem] items-center'
        }
      >
        {children}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-conteudo-tenue">
          {rotulo}
        </span>
        <span
          className={
            reprova
              ? 'font-mono text-xs font-semibold text-on-tint-danger'
              : 'font-mono text-xs text-conteudo-suave'
          }
        >
          {formatar(razao === undefined ? null : razao)}
          {reprova ? '  reprova' : ''}
        </span>
        {nota && (
          <span className="max-w-[10rem] text-[10px] leading-tight text-conteudo-tenue">
            {nota}
          </span>
        )}
      </div>
    </div>
  );
};

const Secao: React.FC<{
  titulo: string;
  nota?: React.ReactNode;
  children: React.ReactNode;
}> = ({ titulo, nota, children }) => (
  <section className="mb-10">
    <h2 className="mb-1 text-base font-semibold text-conteudo">{titulo}</h2>
    {nota && (
      <p className="mb-4 max-w-prose text-sm text-conteudo-tenue">{nota}</p>
    )}
    <div className="flex flex-wrap items-start gap-x-6 gap-y-5">{children}</div>
  </section>
);

/* ─────────────────────────────────────────────────────────────────────
   Badge, e os dois mapas da §16
   ───────────────────────────────────────────────────────────────────── */

const VARIANTES_BADGE: VarianteBadge[] = [
  'neutro',
  'discreto',
  'principal',
  'info',
  'sucesso',
  'alerta',
  'perigo',
];

/**
 * As três superfícies em que um selo pode cair, e onde cada uma aparece.
 *
 * É a mesma lista que a regra permanente da emenda E5 fixou: contraste de
 * token de texto se mede contra `--surface`, `--bg-base` e
 * `--surface-elevated`. Um número sem a superfície ao lado não é um resultado,
 * é meio resultado — foi assim que o Checkpoint 1 declarou a casca conforme
 * medindo só os tokens.
 */
const SUPERFICIES = [
  ['--bg-base', 'página'],
  ['--surface', 'card'],
  ['--surface-elevated', 'elevada'],
] as const;

const Selos: React.FC<{ medicoes: Medicoes }> = ({ medicoes }) => (
  <>
    <Secao
      titulo="Badge — as sete variantes, nas três superfícies"
      nota="O fundo do selo é translúcido: ele pega o tom do que está embaixo, então a MESMA variante dá números diferentes conforme onde cai. Medir só contra o fundo da página seria esconder o pior caso — e o pior caso é real: o ChamadoModal põe os selos dentro de um aside elevado, na tela mais usada do sistema. neutro e discreto renderizam idêntico de propósito, pela emenda E6: o que as separa é o rótulo, que a §16 exige de todo jeito."
    >
      <div className="flex w-full flex-col gap-5">
        {SUPERFICIES.map(([token, nome]) => (
          <div key={token} className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-conteudo-suave">
              {nome} · {token}
            </span>
            <div className="flex flex-wrap items-start gap-x-5 gap-y-4">
              {VARIANTES_BADGE.map((v) => (
                <Amostra
                  key={v}
                  id={`badge-${v}-${nome}`}
                  rotulo={v}
                  fundo={token}
                  medicoes={medicoes}
                >
                  <Badge variante={v}>Exemplo</Badge>
                </Amostra>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Secao>

    <Secao
      titulo="Mapa de status — §16"
      nota="O rótulo é o valor do enum da API, não texto reescrito aqui. Cinco status, cinco variantes distintas: antes desta fase Aberto e Em Andamento eram a mesma cor, e Resolvido e Fechado também. Os números abaixo são sobre --bg-base; para as outras duas superfícies, ver o bloco acima — a variante é a mesma."
    >
      {Object.values(StatusEnum).map((s) => (
        <Amostra
          key={s}
          id={`status-${s}`}
          rotulo={VARIANTE_DE_STATUS[s]}
          medicoes={medicoes}
        >
          <StatusBadge status={s} />
        </Amostra>
      ))}
      <Amostra id="marca-cancelado" rotulo="perigo · marca" medicoes={medicoes}>
        <MarcaBadge marca="cancelado" />
      </Amostra>
      <Amostra id="marca-arquivado" rotulo="neutro · marca" medicoes={medicoes}>
        <MarcaBadge marca="arquivado" />
      </Amostra>
    </Secao>

    <Secao
      titulo="Mapa de prioridade — §16"
      nota="Quatro prioridades, quatro variantes. Baixa usa discreto, o muted do pacote. Sobre --bg-base, pelo mesmo motivo do mapa acima."
    >
      {Object.values(PrioridadeEnum).map((p) => (
        <Amostra
          key={p}
          id={`prioridade-${p}`}
          rotulo={VARIANTE_DE_PRIORIDADE[p]}
          medicoes={medicoes}
        >
          <PrioridadeBadge prioridade={p} />
        </Amostra>
      ))}
    </Secao>
  </>
);

/* ─────────────────────────────────────────────────────────────────────
   Button
   ───────────────────────────────────────────────────────────────────── */

const VARIANTES_BOTAO: VarianteBotao[] = [
  'primario',
  'secundario',
  'sucesso',
  'perigo',
  'fantasma',
];

const Botoes: React.FC<{ medicoes: Medicoes; foco: string | null }> = ({
  medicoes,
  foco,
}) => (
  <>
    <Secao
      titulo="Button — repouso"
      nota="sucesso e perigo usam os degraus de ação da emenda E2. Com o degrau 500, que era o que estava aqui, davam 2,54:1 e 3,76:1 — os dois reprovando, nos dois temas."
    >
      {VARIANTES_BOTAO.map((v) => (
        <Amostra key={v} id={`botao-${v}`} rotulo={v} medicoes={medicoes}>
          <Button variante={v}>Salvar</Button>
        </Amostra>
      ))}
    </Secao>

    <Secao
      titulo="Button — desabilitado"
      nota="O número medido é o do texto ANTES da opacidade do elemento: getComputedStyle não compõe opacity dentro de color. Fica marcado como otimista em vez de omitido — um número com a ressalva escrita vale mais que um espaço em branco."
    >
      {VARIANTES_BOTAO.map((v) => (
        <Amostra
          key={v}
          id={`botao-off-${v}`}
          rotulo={v}
          nota="não inclui a opacidade do estado"
          medicoes={medicoes}
        >
          <Button variante={v} disabled>
            Salvar
          </Button>
        </Amostra>
      ))}
    </Secao>

    <Secao
      titulo="Button — carregando"
      nota="carregando desabilita junto; o anel é aria-hidden e o botão fica aria-busy, para o leitor de tela anunciar a espera uma vez só."
    >
      {VARIANTES_BOTAO.map((v) => (
        <Amostra key={v} id={`botao-load-${v}`} rotulo={v} medicoes={medicoes}>
          <Button variante={v} carregando>
            Salvando
          </Button>
        </Amostra>
      ))}
    </Secao>

    <Secao
      titulo="Button — foco visível"
      nota="Foco é estado do NAVEGADOR, não prop: só um elemento o tem por vez, e :focus-visible depende de a última interação ter sido de teclado. Por isso não é uma coluna desta grade — é uma captura por vez, com ?foco=<variante>, e quem captura pressiona Tab antes para pôr o navegador em modalidade de teclado. Simular com classe seria ilustração."
    >
      {VARIANTES_BOTAO.map((v) => (
        <Amostra
          key={v}
          id={`botao-foco-${v}`}
          rotulo={v}
          nota={foco === v ? 'com foco de teclado' : undefined}
          medicoes={medicoes}
        >
          <Button variante={v}>Salvar</Button>
        </Amostra>
      ))}
    </Secao>
  </>
);

/* ─────────────────────────────────────────────────────────────────────
   Card
   ───────────────────────────────────────────────────────────────────── */

const Cartoes: React.FC<{ medicoes: Medicoes }> = ({ medicoes }) => (
  <Secao
    titulo="Card — os quatro paddings"
    nota="0 · 12 · 16 (padrão) · 24px, os valores do Card.jsx do pacote. O CardHeader não tem padding horizontal próprio: vive dentro do padding do card e só desenha a régua embaixo de si."
  >
    {(['none', 'sm', 'md', 'lg'] as const).map((p) => (
      <Amostra
        key={p}
        id={`card-${p}`}
        rotulo={`padding ${p}`}
        seletor="p"
        medicoes={medicoes}
      >
        <Card padding={p} className="w-44">
          <p className="text-sm text-conteudo-suave">Conteúdo do card.</p>
        </Card>
      </Amostra>
    ))}

    <Amostra
      id="card-header"
      rotulo="com CardHeader"
      seletor="h3"
      medicoes={medicoes}
    >
      <Card className="w-60">
        <CardHeader titulo="Título" descricao="Descrição do card" />
        <p className="text-sm text-conteudo-suave">Conteúdo abaixo da régua.</p>
      </Card>
    </Amostra>

    <Amostra
      id="card-clicavel"
      rotulo="clicável"
      nota="vira <button>; foco em --focus-ring"
      seletor="p"
      medicoes={medicoes}
    >
      <Card className="w-44" onClick={() => {}}>
        <p className="text-sm text-conteudo-suave">O card inteiro navega.</p>
      </Card>
    </Amostra>
  </Secao>
);

/* ─────────────────────────────────────────────────────────────────────
   Avatar
   ───────────────────────────────────────────────────────────────────── */

/**
 * Um nome para cada um dos seis pares.
 *
 * Derivado em tempo de render pela MESMA regra do componente (soma dos
 * charCodes módulo o tamanho da lista), e não escrito numa tabela à mão: se a
 * derivação mudar, a galeria acompanha em vez de mentir.
 */
function nomesPorPar(quantos: number): string[] {
  const achados: string[] = new Array(quantos).fill('');
  const candidatos = [
    'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Hugo',
    'Iara', 'Joao', 'Kelly', 'Lucas', 'Marta', 'Nina', 'Otavio', 'Paula',
    'Rita', 'Sergio', 'Tania', 'Vera',
  ];
  for (const nome of candidatos) {
    const i = nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % quantos;
    if (!achados[i]) achados[i] = nome;
  }
  return achados;
}

const Avatares: React.FC<{ medicoes: Medicoes }> = ({ medicoes }) => (
  <Secao
    titulo="Avatar — os seis pares do pacote"
    nota="Pares [fundo, texto] pensados um contra o outro. Antes desta fase a cor saía da paleta categórica de gráficos, com texto e fundo na MESMA cor, um deles a 20%: 14 de 20 combinações reais reprovavam e 6 não chegavam a 3:1."
  >
    {nomesPorPar(6).map((nome, i) => (
      <Amostra
        key={i}
        id={`avatar-${i}`}
        rotulo={`par ${i} · ${nome}`}
        medicoes={medicoes}
      >
        <Avatar nome={nome} />
      </Amostra>
    ))}
    <Amostra
      id="avatar-sem-nome"
      rotulo="sem nome"
      nota="par neutro, não o par 0"
      medicoes={medicoes}
    >
      <Avatar nome={null} />
    </Amostra>
  </Secao>
);

/* ─────────────────────────────────────────────────────────────────────
   Spinner
   ───────────────────────────────────────────────────────────────────── */

const Aneis: React.FC<{ medicoes: Medicoes }> = ({ medicoes }) => (
  <>
    <Secao
      titulo="Spinner — os três tamanhos"
      nota="16 · 24 · 32px, com o traço engrossando junto (2 · 2 · 3). Substituiu dezoito anéis escritos à mão em treze arquivos, em três formas, cinco cores e seis tamanhos. O piso aqui é 3:1 e não 4,5:1 — o anel é elemento não textual (WCAG 1.4.11) —, então o número embaixo é informativo, não veredito: o que ele mede é a cor do TEXTO do contêiner, e o anel herda dela."
    >
      {(['sm', 'md', 'lg'] as const).map((t) => (
        <Amostra key={t} id={`spinner-${t}`} rotulo={t} medicoes={medicoes}>
          <span className="text-sinal">
            <Spinner tamanho={t} />
          </span>
        </Amostra>
      ))}
      <Amostra
        id="spinner-herda"
        rotulo="cor herdada"
        nota="currentColor — é o que o Button usa"
        medicoes={medicoes}
      >
        <span className="text-conteudo-tenue">
          <Spinner tamanho="md" />
        </span>
      </Amostra>
    </Secao>

    <Secao
      titulo="BlocoCarregando — o vazio de região"
      nota="Aqui mora o role=status. Três destes blocos tinham aria-hidden no anel e nenhum texto: SlaTab, ChamadoModal e TarefasRecorrentes. Quem usa leitor de tela ficava em silêncio total enquanto a região carregava."
      >
      <Amostra
        id="bloco-com-texto"
        rotulo="com texto"
        seletor="span:last-child"
        medicoes={medicoes}
      >
        <BlocoCarregando className="h-24 w-56 rounded-xl border border-borda bg-superficie">
          Carregando chamados...
        </BlocoCarregando>
      </Amostra>
      <Amostra
        id="bloco-sem-texto"
        rotulo="sem texto"
        nota="o anúncio vai em sr-only, sem mudar um pixel"
        medicoes={medicoes}
      >
        <BlocoCarregando className="h-24 w-56 rounded-xl border border-borda bg-superficie" />
      </Amostra>
    </Secao>
  </>
);

/* ─────────────────────────────────────────────────────────────────────
   A página
   ───────────────────────────────────────────────────────────────────── */

const GaleriaDeComponentes: React.FC = () => {
  const [params] = useSearchParams();
  const { darkMode } = useTheme();
  const [medicoes, setMedicoes] = useState<Medicoes>({});

  const grupo = params.get('grupo') ?? 'tudo';
  const foco = params.get('foco');

  /** O marcador de ROTA: existe só enquanto esta página está montada. */
  useEffect(() => {
    document.documentElement.dataset.galeria = 'componentes';
    return () => {
      delete document.documentElement.dataset.galeria;
      delete document.documentElement.dataset.medido;
    };
  }, []);

  /**
   * Uma passagem só, depois da pintura: mede toda amostra e publica.
   *
   * Medir num lugar só — e não dentro de cada amostra — é o que dá um ponto
   * ÚNICO onde "pronto" passa a ser verdade. Com N medições independentes,
   * "pronto" seriam N verdades chegando fora de ordem, e o marcador que a
   * captura espera não teria significado.
   *
   * ── Por que `setTimeout` e NÃO `requestAnimationFrame` ────────────────
   *
   * A primeira versão usava dois `requestAnimationFrame` encadeados, que é o
   * jeito canônico de esperar "depois do layout, depois da pintura". Ela nunca
   * mediu nada, e o motivo demorou a aparecer: **a aba que captura roda
   * OCULTA** (`document.hidden === true`), e o navegador não agenda quadro
   * nenhum em aba oculta. Medido: `rAF` não disparou em 2000ms, com
   * `visibilityState: "hidden"`.
   *
   * É o defeito mais traiçoeiro dos três, porque não estraga a PÁGINA — ela
   * fica perfeita — e sim a PROVA: os componentes aparecem certos e a coluna
   * de contraste inteira sai com traço. Uma foto assim passa por boa.
   *
   * `setTimeout` continua correndo em aba oculta (com atraso mínimo maior, o
   * que não importa aqui). E esperar quadro nunca foi necessário para o que se
   * mede: `getComputedStyle` força a resolução de estilo e layout na hora em
   * que é chamado. O quadro era zelo, e custou o resultado.
   *
   * A segunda passagem, quando as fontes terminam, existe porque a métrica de
   * texto muda com a fonte definitiva. Não muda COR — então não muda número —,
   * mas faz a imagem sair com a tipografia certa em página fria.
   */
  useEffect(() => {
    let vivo = true;

    const medir = () => {
      if (!vivo) return;
      const resultado: Medicoes = {};
      document
        .querySelectorAll<HTMLElement>('[data-amostra]')
        .forEach((caixa) => {
          const id = caixa.dataset.amostra;
          if (!id) return;
          const slot = caixa.querySelector('[data-alvo]');
          const seletor = caixa.dataset.seletor;
          const alvo = slot
            ? seletor
              ? slot.querySelector(seletor)
              : slot.firstElementChild
            : null;
          resultado[id] = alvo ? contrasteDoTexto(alvo) : null;
        });
      setMedicoes(resultado);
      document.documentElement.dataset.medido = String(
        Object.keys(resultado).length
      );
    };

    const id = window.setTimeout(medir, 0);
    document.fonts?.ready.then(medir);

    return () => {
      vivo = false;
      window.clearTimeout(id);
    };
  }, [grupo, darkMode]);

  /**
   * O foco de teclado, para a seção que não tem prop.
   *
   * Depende de `medicoes` para rodar DEPOIS da medição: focar antes faria o
   * `setMedicoes` re-renderizar e o foco voltaria para o body.
   */
  useEffect(() => {
    if (!foco) return;
    document
      .querySelector<HTMLButtonElement>(
        `[data-amostra="botao-foco-${foco}"] button`
      )
      ?.focus();
  }, [foco, medicoes]);

  const mostrar = (g: string) => grupo === 'tudo' || grupo === g;

  return (
    // `h-screen overflow-y-auto`, e NÃO `min-h-screen`.
    //
    // O `body` do app é `overflow: hidden` — a casca rola por dentro do
    // `<main>`, e não na janela. Esta página vive FORA da casca (está em
    // `noLayoutRoutes`), então herda o `hidden` e não ganha rolagem nenhuma:
    // com `min-h-screen` tudo abaixo de uma tela ficava cortado E inalcançável.
    // Não era um recorte feio, era conteúdo que não existia — o mapa de
    // prioridade inteiro sumia da foto sem deixar rastro.
    //
    // Assim a própria página é o contêiner que rola, e quem captura rola ELA,
    // não a janela.
    <div
      data-rolagem=""
      className="h-screen overflow-y-auto bg-superficie-base p-8 text-conteudo"
    >
      <header className="mb-8 border-b border-borda pb-4">
        <h1 className="text-xl font-bold text-conteudo">
          Galeria de componentes
        </h1>
        <p className="mt-1 max-w-prose text-sm text-conteudo-tenue">
          Página de desenvolvimento. Sob cada amostra, a razão de contraste
          medida na hora a partir do estilo computado — é isso que a torna
          evidência para o Checkpoint 2, e não ilustração. Piso 4,5:1 para
          texto; o que reprova aparece marcado.
        </p>
        <p className="mt-2 font-mono text-xs text-conteudo-tenue">
          tema {darkMode ? 'escuro' : 'claro'} · grupo {grupo} ·{' '}
          {Object.keys(medicoes).length} amostras medidas
        </p>
      </header>

      {mostrar('badge') && <Selos medicoes={medicoes} />}
      {mostrar('button') && <Botoes medicoes={medicoes} foco={foco} />}
      {mostrar('card') && <Cartoes medicoes={medicoes} />}
      {mostrar('avatar') && <Avatares medicoes={medicoes} />}
      {mostrar('spinner') && <Aneis medicoes={medicoes} />}
    </div>
  );
};

export default GaleriaDeComponentes;
