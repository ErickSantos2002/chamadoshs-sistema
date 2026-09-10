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
  { classe: string; Icone: React.FC<PropsDeIcone>; papel: 'alert' | 'status' }
> = {
  // O fundo é o alias `--tint-*`, e não a cor cheia com modificador.
  //
  // É a regra (b) da decisão D8-a: onde existe alias com alfa embutido, usa-se
  // o alias. Os blocos que este componente substitui escreviam `bg-perigo/10`,
  // a ponte a 10%; o alias é a mesma cor a 15%, e é alias justamente para a
  // opacidade não ficar escrita à mão em nove lugares.
  //
  // O `papel` vive AQUI, no mesmo mapa da cor, por um motivo: uma variante
  // nova não pode entrar sem que alguém decida como ela é anunciada. Enquanto
  // o `role` estava escrito no JSX, ele valia para todas por omissão.
  info: {
    classe: 'border-info/30 bg-tint-info text-on-tint-info',
    Icone: IconeInfo,
    papel: 'status',
  },
  sucesso: {
    classe: 'border-sucesso/30 bg-tint-success text-on-tint-success',
    Icone: IconeConfereCirculo,
    papel: 'status',
  },
  alerta: {
    classe: 'border-alerta/30 bg-tint-warning text-on-tint-warning',
    Icone: IconeAlerta,
    papel: 'status',
  },
  perigo: {
    classe: 'border-perigo/30 bg-tint-danger text-on-tint-danger',
    Icone: IconeAlerta,
    papel: 'alert',
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
 * ── Mas assertivo NÃO serve para as quatro ───────────────────────────
 *
 * `role="alert"` estava escrito no JSX, o que o aplicava a todas as variantes,
 * inclusive à `info` — que é o PADRÃO. Assertivo interrompe: o leitor de tela
 * corta a frase que estava dizendo para ler o aviso.
 *
 * Para "Erro ao carregar" isso é o certo — a pessoa precisa saber agora, antes
 * de continuar agindo sobre uma tela que não vale. Para "Salvo com sucesso" é
 * atropelar a leitura com algo que podia esperar a próxima pausa. `role="status"`
 * é a mesma região viva em modo educado: entra na fila.
 *
 *     perigo                   → alert    (interrompe)
 *     info, sucesso, alerta    → status   (espera a pausa)
 *
 * **Só `perigo` interrompe**, e é decisão do operador, gravada na emenda E12
 * do pacote. Eu tinha posto `alerta` em `alert` — parecia razoável, aviso de
 * atenção pede atenção. O critério dele é mais estreito e melhor: aviso de
 * atenção quase nunca é urgente a ponto de cortar a fala do leitor de tela, e
 * quando é, a tela usa `perigo`. Se `alerta` também interrompesse, sobrariam
 * duas variantes assertivas e a distinção entre elas deixaria de significar
 * algo no canal não visual.
 *
 * Hoje as doze chamadas do sistema são todas `perigo`, então isto não muda uma
 * linha do que se ouve. Muda o que acontece na PRÓXIMA: o primeiro
 * `<Aviso variante="info">` que alguém escrever já nasce educado, e o `<Aviso>`
 * sem variante — que cai em `info` — deixa de ser o pior caso.
 *
 * Achado pela sessão do HelpHS, no `Alert.jsx` do pacote, que tem o mesmo
 * defeito e do qual este componente descende. Lá virou a emenda E12; aqui é
 * conserto local, porque o `Aviso` é código deste repositório e não cópia do
 * pacote.
 *
 * ── O que o pacote tem e aqui NÃO entrou: a prop `live` ──────────────
 *
 * A E12 acrescentou `live={false}`, para o aviso que JÁ ESTÁ na tela quando a
 * página carrega. O argumento é bom: região viva anuncia MUDANÇA, e conteúdo
 * que sempre esteve ali não mudou — anunciá-lo faz o leitor ler o aviso fora
 * de ordem, antes do conteúdo que lhe dá contexto.
 *
 * Não entrou porque **as doze chamadas deste sistema são todas condicionais a
 * um estado de erro** — `{error && <Aviso>}` ou um `return` de falha. Nenhuma
 * é parte permanente da página. Uma prop sem consumidor é especulação, e é a
 * mesma régua que manteve o `Switch` documentado como sem uso em vez de
 * inventar um.
 *
 * No dia em que aparecer um aviso permanente de estado — "chamado encerrado",
 * "setor inativo" —, a prop entra com ele.
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
  const { classe, Icone, papel } = VARIANTES[variante];

  return (
    <div
      role={papel}
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
