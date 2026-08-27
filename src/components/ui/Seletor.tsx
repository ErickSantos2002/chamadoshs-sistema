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
  /** O que se escolhe aqui. Vira o `aria-label`; o gatilho mostra só a opção. */
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
          role="listbox"
          aria-label={rotulo}
          aria-activedescendant={`${id}-${destacado}`}
          tabIndex={-1}
          onKeyDown={aoTeclarNaLista}
          style={{ position: 'fixed', ...posicao, zIndex: 9999 }}
          // `overscroll-contain`: chegar ao fim da lista não pode emendar a
          // rolagem na página atrás — que fecharia a lista pelo caminho.
          // Sem `max-h-*`: o teto vem calculado em `posicao.maxHeight`, e é
          // o espaço que existe de verdade acima ou abaixo do campo.
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
      <button
        ref={gatilhoRef}
        id={idExterno}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={rotulo}
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
          aberto
            ? 'border-transparent ring-2 ring-sinal'
            : invalido
              ? 'border-perigo'
              : 'border-borda hover:border-conteudo-tenue',
          'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sinal'
        )}
      >
        {escolhida?.cor && (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: escolhida.cor }}
          />
        )}
        <span className="flex-1 truncate text-left">{escolhida?.rotulo}</span>
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
