import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import {
  acharPorDigitacao,
  acumularBusca,
  LARGURA_MINIMA,
  posicionarLista,
  ALTURA_MAXIMA,
  type PosicaoDaLista,
} from '../../lib/seletor';
import { IconeConfere, IconeSeta } from './icones';

/**
 * O seletor do sistema, com a lista desenhada por nós.
 *
 * ── Por que não o `<select>` nativo ───────────────────────────────────
 *
 * A parte FECHADA de um `<select>` aceita estilo; a lista ABERTA não. Ela é
 * desenhada pelo sistema operacional, e `option` ignora praticamente tudo que
 * se mande. O resultado, numa interface escura, é uma lista branca com destaque
 * azul do Windows aparecendo no meio da tela — foi assim que o problema
 * chegou, por print.
 *
 * ── O que isto custa, e como fica pago ────────────────────────────────
 *
 * O `<select>` nativo dá de graça teclado, busca por digitação e, no celular,
 * o seletor do próprio sistema. Trocá-lo por `<div>`s significa reimplementar
 * isso — e é o motivo de tanto dropdown caseiro por aí ser navegável só com
 * mouse. Aqui estão implementados: setas, Home e End, Enter e espaço, Escape
 * com o foco voltando para o gatilho, Tab fechando, e busca por digitação.
 *
 * Nasceu restrito aos filtros, com o nativo mantido nos formulários pela
 * digitação e pelo seletor do celular. A restrição caiu no mesmo dia: a lista
 * de solicitante do Novo Chamado — trinta nomes, branca, no meio do modal
 * escuro — mostrou que o argumento não sobrevivia ao primeiro formulário com
 * lista longa. A digitação está reimplementada aqui; o que se perde de verdade
 * é só o seletor nativo do celular, e o sistema roda em desktop e TV.
 *
 * ── Por que a lista vai para um portal ────────────────────────────────
 *
 * Seletor vive dentro de painel e de modal, ambos com `overflow` próprio. Uma
 * lista posicionada dentro deles seria recortada pela borda. No `body`, com
 * posição fixa, ela abre por cima de tudo — e por isso precisa fechar ao rolar,
 * senão fica flutuando longe do campo que a abriu.
 */

export interface OpcaoDoSeletor {
  valor: string;
  rotulo: string;
  /** Ponto colorido à esquerda. Para status e prioridade, que já têm cor. */
  cor?: string;
}

export interface SeletorProps {
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: OpcaoDoSeletor[];
  /**
   * O que se escolhe aqui — "Status", "Prioridade", "Técnico responsável".
   *
   * Vai para um rótulo `sr-only` que o gatilho referencia por
   * `aria-labelledby`. **Não** é `aria-label`: ver a nota longa no componente.
   */
  rotulo: string;
  /** Para o `htmlFor` de um rótulo visível apontar para o gatilho. */
  id?: string;
  /** Modo leitura: mostra a escolha e não abre. */
  disabled?: boolean;
  /** Borda de perigo, para campo que falhou validação. */
  invalido?: boolean;
  className?: string;
}

export const Seletor: React.FC<SeletorProps> = ({
  valor,
  aoMudar,
  opcoes,
  rotulo,
  id: idExterno,
  disabled,
  invalido,
  className,
}) => {
  const id = useId();

  // Os três ids que a costura de acessibilidade precisa. O do gatilho respeita
  // o `id` externo quando ele vem — é o que um rótulo visível usa no `htmlFor`
  // — e cai no gerado quando não vem, porque `aria-labelledby` precisa
  // apontar para algo que exista sempre.
  const idDoRotulo = `${id}-rotulo`;
  const idDoGatilho = idExterno ?? `${id}-gatilho`;
  const idDoValor = `${id}-valor`;
  const idDaLista = `${id}-lista`;
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);
  // Valor de partida, nunca desenhado: a posição de verdade é medida no
  // instante em que a lista abre.
  const [posicao, setPosicao] = useState<PosicaoDaLista>({
    top: 0,
    left: 0,
    minWidth: LARGURA_MINIMA,
    maxHeight: ALTURA_MAXIMA,
  });

  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const buscaRef = useRef({ texto: '', em: 0 });

  const indiceAtual = Math.max(
    0,
    opcoes.findIndex((o) => o.valor === valor)
  );
  const escolhida = opcoes[indiceAtual];

  const fechar = useCallback((devolverFoco: boolean) => {
    setAberto(false);
    if (devolverFoco) gatilhoRef.current?.focus();
  }, []);

  const abrir = useCallback(
    (partirDe: number) => {
      const gatilho = gatilhoRef.current;
      if (!gatilho) return;

      setPosicao(
        posicionarLista(
          gatilho.getBoundingClientRect(),
          window.innerWidth,
          window.innerHeight
        )
      );
      setDestacado(partirDe);
      setAberto(true);
    },
    []
  );

  // Leva o foco para a lista assim que ela existe. Sem isso o teclado continua
  // no gatilho e as setas rolariam a página em vez de andar nas opções.
  useEffect(() => {
    if (aberto) listaRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;

    const aoClicarFora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (
        !gatilhoRef.current?.contains(alvo) &&
        !listaRef.current?.contains(alvo)
      ) {
        setAberto(false);
      }
    };

    // A lista tem posição fixa e não acompanha a rolagem da página. Fechar é
    // mais honesto que recalcular: quem rolou não está mais olhando para o
    // campo.
    //
    // MAS a rolagem de DENTRO da lista não pode contar. A captura na janela
    // apanha todo scroll, inclusive o da própria lista — que tem altura máxima
    // e rolagem interna. Sem esta exceção, a lista de solicitantes fechava no
    // primeiro tique de quem tentava rolar os trinta nomes: parecia que nenhum
    // modal rolava, quando era o seletor se fechando.
    const aoRolar = (e: Event) => {
      if (listaRef.current?.contains(e.target as Node)) return;
      setAberto(false);
    };
    const aoRedimensionar = () => setAberto(false);

    document.addEventListener('mousedown', aoClicarFora);
    window.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRedimensionar);

    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      window.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
    };
  }, [aberto]);

  const escolher = (opcao: OpcaoDoSeletor) => {
    aoMudar(opcao.valor);
    fechar(true);
  };

  // A conta está em `lib/seletor`, testada. Aqui fica só o que é do
  // componente: guardar o acumulado entre teclas e mover o destaque.
  const buscar = (letra: string) => {
    const agora = Date.now();
    const busca = buscaRef.current;

    busca.texto = acumularBusca(busca.texto, letra, agora - busca.em);
    busca.em = agora;

    const achado = acharPorDigitacao(
      opcoes.map((o) => o.rotulo),
      busca.texto
    );
    if (achado >= 0) setDestacado(achado);
  };

  const aoTeclarNaLista = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setDestacado((i) => Math.min(opcoes.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setDestacado((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setDestacado(0);
        break;
      case 'End':
        e.preventDefault();
        setDestacado(opcoes.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        escolher(opcoes[destacado]);
        break;
      case 'Escape':
        e.preventDefault();
        // `stopPropagation` é o que impede o Esc de fechar o MODAL junto.
        //
        // O `Modal` escuta `keydown` no `document` (Modal.tsx:108), e
        // `preventDefault` não interrompe a propagação — só cancela a ação
        // padrão do navegador. Sem esta linha, Esc com a lista aberta fechava
        // a lista E o modal atrás dela, e a pessoa perdia o formulário inteiro
        // por ter desistido de escolher um item.
        //
        // A lista ainda vive num portal em `document.body`, então nem a
        // hierarquia de React salvaria: o evento nativo sobe pela árvore do
        // DOM até o `document` de qualquer jeito.
        e.stopPropagation();
        fechar(true);
        break;
      case 'Tab':
        // Sem `preventDefault`: sair com Tab deve continuar saindo.
        fechar(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          buscar(e.key);
        }
    }
  };

  const aoTeclarNoGatilho = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrir(indiceAtual);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      abrir(opcoes.length - 1);
    }
  };

  const lista = aberto
    ? createPortal(
        <div
          ref={listaRef}
          id={idDaLista}
          role="listbox"
          // Mesmo rótulo do gatilho, pelo mesmo elemento: a lista não pode ter
          // um nome próprio que possa divergir daquele.
          aria-labelledby={idDoRotulo}
          aria-activedescendant={`${id}-${destacado}`}
          tabIndex={-1}
          onKeyDown={aoTeclarNaLista}
          style={{ position: 'fixed', ...posicao, zIndex: 9999 }}
          // `overscroll-contain`: chegar ao fim da lista não pode emendar a
          // rolagem na página atrás — que fecharia a lista pelo caminho.
          // Sem `max-h-*`: o teto vem calculado em `posicao.maxHeight`, e é
          // o espaço que existe de verdade acima ou abaixo do campo.
          // `border-borda` AQUI, e não `border-borda-control` — de propósito.
          //
          // A E7 trocou o contorno dos CONTROLES, e este painel não é um: é
          // uma camada flutuante, e o que a separa do fundo é a sombra
          // (`shadow-xl`), não a linha. A borda aqui é o acabamento da camada,
          // que é exatamente o papel de `--border-color`.
          //
          // O `SearchSelect.jsx` do pacote fez a mesma distinção na E7, e pelo
          // mesmo motivo. Se alguém varrer `border-borda` procurando o que
          // ficou para trás, este é o que deve ficar.
          className="overflow-auto overscroll-contain rounded-lg border border-borda bg-superficie shadow-xl focus:outline-none"
        >
          {opcoes.map((opcao, indice) => {
            const ehEscolhida = opcao.valor === valor;
            const ehDestacada = indice === destacado;

            return (
              <div
                key={opcao.valor}
                id={`${id}-${indice}`}
                role="option"
                aria-selected={ehEscolhida}
                onClick={() => escolher(opcao)}
                onMouseMove={() => setDestacado(indice)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                  ehDestacada ? 'bg-sinal/15 text-conteudo' : 'text-conteudo-suave',
                  ehEscolhida && 'font-medium text-sinal'
                )}
              >
                {/* O ponto ocupa lugar mesmo sem cor, senão os rótulos das
                    listas com e sem cor não alinhariam entre si. */}
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={opcao.cor ? { backgroundColor: opcao.cor } : undefined}
                />
                <span className="flex-1">{opcao.rotulo}</span>
                {ehEscolhida && <IconeConfere className="h-3.5 w-3.5 shrink-0" />}
              </div>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={cn('relative', className)}>
      {/*
        ── O RÓTULO É REFERENCIADO, E NÃO ESCRITO NO GATILHO ───────────

        Aqui havia `aria-label={rotulo}` no botão, e ele **apagava o valor**.

        `aria-label` não soma ao conteúdo do elemento: substitui. O gatilho
        mostra "Em Andamento" na tela e anunciava só "Status, caixa de
        combinação" — a escolha atual, que é a única informação que este
        controle carrega, não existia no canal não visual. Quem navega por
        leitor de tela sabia o que o campo É e nunca o que ele TEM.

        A saída é montar o nome por `aria-labelledby` com DOIS ids — o do
        rótulo e o do VALOR. Assim o leitor lê "Status, Em Andamento", e o
        valor volta a fazer parte do nome em vez de ser apagado por ele.

        ── E por que o segundo id NÃO é o do próprio gatilho ────────────

        O padrão de combobox do APG usa auto-referência: `aria-labelledby` com
        o id do rótulo e o do PRÓPRIO elemento. Foi assim que este componente
        ficou na primeira versão, e ela **não funciona nas duas variantes**.

        A sessão do HelpHS mediu o nome computado dos dois jeitos e achou a
        diferença:

            sem `<label for>` associado   ->  "Situação Aberto"   ✓
            com `<label for>` associado   ->  "Situação"          ✗

        A auto-referência é ambígua no algoritmo do nome acessível, e ele a
        resolve de um jeito quando há um `<label for>` apontando para o
        elemento e de outro quando não há. O valor some justamente no caso do
        formulário.

        E aqui esse caso EXISTE, em quatro lugares: `role_name` e `setor_id` no
        `UsuarioModal`, `categoria` e `solicitante` no `NovoChamadoForm`, todos
        com `RotuloDeCampo htmlFor` apontando para o gatilho. Manter a
        auto-referência reintroduziria em quatro formulários exatamente o
        defeito que esta correção existe para fechar.

        Apontando para o `<span>` do valor — que é filho do gatilho, e não o
        gatilho — não há auto-referência e não há ambiguidade. O `<label for>`
        externo continua existindo e é ignorado, como manda a precedência:
        `aria-labelledby` vence.

        O rótulo é `sr-only` porque neste sistema quem o mostra na tela é o
        contexto — o `<dt>` da lista de definições do detalhe, o cabeçalho da
        coluna de filtro. Um segundo rótulo visível seria repetição; nenhum
        rótulo referenciável era o defeito.
      */}
      <span id={idDoRotulo} className="sr-only">
        {rotulo}
      </span>
      <button
        ref={gatilhoRef}
        id={idDoGatilho}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-labelledby={`${idDoRotulo} ${idDoValor}`}
        // Só quando a lista existe. Ela vive num portal e só é montada aberta;
        // apontar para ela o tempo todo seria ponteiro quebrado — o mesmo
        // defeito que o `Campo` já trava por teste.
        aria-controls={aberto ? idDaLista : undefined}
        disabled={disabled}
        onClick={() => (aberto ? fechar(false) : abrir(indiceAtual))}
        onKeyDown={aoTeclarNoGatilho}
        className={cn(
          // A mesma forma do `Input`: o gatilho fica ao lado de campos em
          // todo formulário, e um deles arredondado com o outro reto é o que
          // mais denuncia um kit meio migrado.
          'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
          'bg-superficie text-conteudo',
          'disabled:cursor-not-allowed disabled:opacity-60',
          // O contorno de repouso sai de `--border-control`, o degrau que a
          // emenda E7 criou para limite de CONTROLE. Era `--border-color`, o
          // separador de superfície, que dá 1,23:1 contra a página — a WCAG
          // 1.4.11 pede 3:1 para o limite de um componente. Ver a nota longa
          // em `Campo.tsx`, onde mora a forma compartilhada.
          //
          // O hover saiu junto com o dos outros dois campos: no tema escuro
          // `--text-muted` e `--border-control` são o mesmo slate-400, então
          // ele não fazia nada ali.
          aberto
            ? 'border-transparent ring-2 ring-[var(--focus-ring)]'
            : invalido
              ? 'border-perigo'
              : 'border-borda-control',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]'
        )}
      >
        {escolhida?.cor && (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: escolhida.cor }}
          />
        )}
        <span id={idDoValor} className="flex-1 truncate text-left">
          {escolhida?.rotulo}
        </span>
        <IconeSeta
          className={cn(
            'h-4 w-4 shrink-0 text-conteudo-tenue transition-transform',
            aberto && 'rotate-180'
          )}
        />
      </button>

      {lista}
    </div>
  );
};

export default Seletor;
