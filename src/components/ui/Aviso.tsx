import React from 'react';
import { cn } from '../../lib/utils';
import {
  IconeAlerta,
  IconeConfereCirculo,
  IconeInfo,
  type PropsDeIcone,
} from './icones';

export type VarianteAviso = 'info' | 'sucesso' | 'alerta' | 'perigo';

const VARIANTES: Record<
  VarianteAviso,
  { classe: string; Icone: React.FC<PropsDeIcone> }
> = {
  // O fundo é o alias `--tint-*`, e não a cor cheia com modificador.
  //
  // É a regra (b) da decisão D8-a: onde existe alias com alfa embutido, usa-se
  // o alias. Os blocos que este componente substitui escreviam `bg-perigo/10`,
  // a ponte a 10%; o alias é a mesma cor a 15%, e é alias justamente para a
  // opacidade não ficar escrita à mão em nove lugares.
  info: { classe: 'border-info/30 bg-tint-info text-on-tint-info', Icone: IconeInfo },
  sucesso: {
    classe: 'border-sucesso/30 bg-tint-success text-on-tint-success',
    Icone: IconeConfereCirculo,
  },
  alerta: {
    classe: 'border-alerta/30 bg-tint-warning text-on-tint-warning',
    Icone: IconeAlerta,
  },
  perigo: {
    classe: 'border-perigo/30 bg-tint-danger text-on-tint-danger',
    Icone: IconeAlerta,
  },
};

interface AvisoProps {
  variante?: VarianteAviso;
  /** Primeira linha, em negrito. Opcional. */
  titulo?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Aviso em bloco, dentro do fluxo da página.
 *
 * ── O que ele substitui ──────────────────────────────────────────────
 *
 * Esta string, escrita NOVE vezes, idêntica:
 *
 *     rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3
 *     text-sm text-on-tint-danger
 *
 * Mais quatro variações da mesma ideia com outro respiro ou outra cor. Nenhuma
 * delas errada; nenhuma delas escolhida.
 *
 * ── E `role="alert"`, que é o motivo real ────────────────────────────
 *
 * A maioria daqueles blocos não tinha `role` nenhum. Eles aparecem quando uma
 * submissão falha — "Selecione o solicitante", "Este nome de usuário já está
 * em uso", "Erro ao carregar" — e apareciam em SILÊNCIO: a pessoa apertava o
 * botão, o texto surgia no topo do formulário, e quem usa leitor de tela não
 * ouvia nada. Pelo que percebia, o botão não tinha funcionado.
 *
 * `role="alert"` é região viva assertiva: o texto é lido no instante em que
 * entra na tela. Sendo o aviso um componente, isso deixa de depender de alguém
 * lembrar.
 *
 * ── O ícone é decorativo, e por quê ──────────────────────────────────
 *
 * `aria-hidden`: ele repete o que a cor e o texto já dizem. Um triângulo
 * anunciado como "alerta" antes da frase "Este nome de usuário já está em uso"
 * não acrescenta informação, só atrasa a frase.
 *
 * O que ele acrescenta é para quem VÊ: a §16 exige que a cor nunca informe
 * sozinha, e o ícone é o segundo canal — quem não distingue vermelho de verde
 * distingue o triângulo do círculo com visto.
 */
export const Aviso: React.FC<AvisoProps> = ({
  variante = 'info',
  titulo,
  children,
  className,
}) => {
  const { classe, Icone } = VARIANTES[variante];

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3 text-sm',
        classe,
        className
      )}
    >
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {titulo && <p className="mb-0.5 font-semibold">{titulo}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Aviso;
