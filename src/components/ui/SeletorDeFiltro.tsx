import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import {
  acharPorDigitacao,
  acumularBusca,
  LARGURA_MINIMA,
  posicionarLista,
  type PosicaoDaLista,
} from '../../lib/seletor';
import { IconeConfere, IconeSeta } from './icones';

/**
 * Um seletor de filtro com a lista desenhada por nós.
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
 * Por isso ele fica só nos FILTROS. Nos formulários o nativo continua, onde o
 * seletor do celular e a digitação valem mais que a aparência da lista.
 *
 * ── Por que a lista vai para um portal ────────────────────────────────
 *
 * Os filtros vivem dentro de painéis com `overflow` próprio. Uma lista
 * posicionada dentro deles seria recortada pela borda do painel. No `body`,
 * com posição fixa, ela abre por cima de tudo — e por isso precisa fechar ao
 * rolar a página, senão fica flutuando longe do campo que a abriu.
 */

export interface OpcaoDeFiltro {
  valor: string;
  rotulo: string;
  /** Ponto colorido à esquerda. Para status e prioridade, que já têm cor. */
  cor?: string;
}

export interface SeletorDeFiltroProps {
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: OpcaoDeFiltro[];
  /** O que este filtro filtra. O gatilho mostra só a opção escolhida. */
  rotulo: string;
  className?: string;
}

export const SeletorDeFiltro: React.FC<SeletorDeFiltroProps> = ({
  valor,
  aoMudar,
  opcoes,
  rotulo,
  className,
}) => {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [destacado, setDestacado] = useState(0);
  const [posicao, setPosicao] = useState<PosicaoDaLista>({
    top: 0,
    left: 0,
    minWidth: LARGURA_MINIMA,
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

      setPosicao(posicionarLista(gatilho.getBoundingClientRect(), window.innerWidth));
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

    // A lista tem posição fixa e não acompanha a rolagem. Fechar é mais honesto
    // que recalcular: quem rolou a página não está mais olhando para o filtro.
    const aoRolarOuRedimensionar = () => setAberto(false);

    document.addEventListener('mousedown', aoClicarFora);
    window.addEventListener('scroll', aoRolarOuRedimensionar, true);
    window.addEventListener('resize', aoRolarOuRedimensionar);

    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      window.removeEventListener('scroll', aoRolarOuRedimensionar, true);
      window.removeEventListener('resize', aoRolarOuRedimensionar);
    };
  }, [aberto]);

  const escolher = (opcao: OpcaoDeFiltro) => {
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
          className="max-h-72 overflow-auto border border-borda-forte bg-superficie-elevada shadow-2xl focus:outline-none"
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
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={rotulo}
        onClick={() => (aberto ? fechar(false) : abrir(indiceAtual))}
        onKeyDown={aoTeclarNoGatilho}
        className={cn(
          'flex w-full items-center gap-2 border px-3 py-2 text-sm transition-colors',
          'bg-superficie-base text-conteudo',
          aberto
            ? 'border-sinal ring-1 ring-sinal'
            : 'border-borda hover:border-borda-forte',
          'focus:border-sinal focus:outline-none focus:ring-1 focus:ring-sinal'
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

export default SeletorDeFiltro;
