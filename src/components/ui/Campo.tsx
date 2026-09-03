import React from 'react';
import { cn } from '../../lib/utils';
import { IconeAlerta } from './icones';

/**
 * As duas peças de um campo de formulário: o rótulo e o erro.
 *
 * Estavam copiadas. O rótulo era a mesma string de classes escrita em quatro
 * arquivos (`const ROTULO = 'mb-1.5 block…'`), e a mensagem de erro era o mesmo
 * componente escrito duas vezes, idêntico. Enquanto for cópia, ajustar o
 * espaçamento de um formulário deixa os outros para trás — e ninguém descobre
 * por leitura, só por comparação lado a lado.
 *
 * Não é o `Rotulo` de `ui/Rotulo`, de propósito: aquele é monoespaçado e em
 * caixa alta, para rótulo de PAINEL — dado de máquina, filtro, faixa de estado.
 * Este é o rótulo de campo que alguém preenche, e ali a caixa alta atrapalha a
 * leitura de "Confirmar Senha".
 */

/**
 * A forma do campo — a mesma para `Input`, `Textarea` e o gatilho do `Seletor`.
 *
 * ── Por que uma constante, e não a string repetida em três arquivos ───
 *
 * Já esteve escrita duas vezes, idêntica, em `Input.tsx` e `Textarea.tsx`. O
 * argumento contra a duplicação é o mesmo que abriu este arquivo: enquanto for
 * cópia, ajustar um campo deixa os outros para trás, e ninguém descobre por
 * leitura — só por comparação lado a lado. A E7 é a prova: ela muda um token
 * de borda, e num arquivo só isso é uma linha.
 *
 * ── O contorno agora é `--border-control`, e o que isso conserta ─────
 *
 * Era `--border-color` (`border-borda`), que é o SEPARADOR de superfície: a
 * linha de cabelo entre um card e o fundo. Medido contra as três superfícies,
 * claro | escuro: 1,23 1,18 1,13 | 1,39 1,51 1,18.
 *
 * A WCAG 1.4.11 pede 3:1 para o limite de um componente — e limite de campo é
 * exatamente isso: é o que diz "aqui começa a área em que você digita". Seis
 * de seis reprovavam, e reprovavam também com `--border-strong`, que era o
 * mais forte que existia (1,48 no pior caso).
 *
 * A emenda E7 do pacote criou o degrau que faltava. `--border-control` dá
 * 4,76 4,55 4,34 | 6,23 6,78 5,29.
 *
 * O piso aqui é 3:1 e não 4,5:1: contorno não é texto. Misturar os dois pisos
 * num teste é fácil de fazer sem perceber, e reprova o que passa.
 *
 * ── O hover saiu ────────────────────────────────────────────────────
 *
 * Era `hover:border-conteudo-tenue`, e **no tema escuro não fazia nada**:
 * depois da E5, `--text-muted` no escuro é slate-400, que é exatamente o que
 * `--border-control` já é ali. A mesma cor nos dois estados.
 *
 * No claro fazia um escurecimento sutil (slate-500 → slate-600). Não vale
 * manter um estado que existe em metade dos temas por acidente, e o
 * `Input.jsx` do pacote não tem hover nenhum no campo — quem sinaliza que o
 * campo é editável é o cursor de texto, que o navegador já dá.
 *
 * Levado à sessão do HelpHS como possível lacuna do pacote: não há token de
 * borda para o hover de um controle.
 */
export const FORMA_DE_CAMPO = [
  'w-full rounded-lg border border-borda-control bg-superficie text-sm text-conteudo',
  'placeholder:text-conteudo-tenue',
  'disabled:cursor-not-allowed disabled:opacity-50',
  // O anel de foco sai de `--focus-ring`, como o do `Button` e o do `Card`.
  //
  // Era `ring-sinal`. Os dois resolvem para o MESMO valor hoje — `--action` e
  // `--focus-ring` são ambos primary-600 no claro e primary-400 no escuro —,
  // então isto não muda um pixel. Muda a procedência: `--focus-ring` é o token
  // que o pacote reserva para anel de foco, e no dia em que ele se separar de
  // `--action` o campo acompanha sem ninguém lembrar de vir aqui.
  'transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]',
].join(' ');

interface RotuloDeCampoProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** Marca o campo com o asterisco, na cor de perigo. */
  obrigatorio?: boolean;
}

export const RotuloDeCampo: React.FC<RotuloDeCampoProps> = ({
  obrigatorio,
  className,
  children,
  ...resto
}) => (
  <label
    className={cn('mb-1.5 block text-sm font-medium text-conteudo-suave', className)}
    {...resto}
  >
    {children}
    {obrigatorio && (
      <>
        {' '}
        {/* O asterisco vai junto do rótulo e fora do texto lido: quem usa
            leitor de tela recebe a obrigatoriedade do `required` do campo, não
            de um símbolo solto no meio da frase. */}
        <span aria-hidden="true" className="text-perigo">
          *
        </span>
      </>
    )}
  </label>
);

/**
 * Erro de campo. Nada é renderizado quando não há erro.
 *
 * ── `role="alert"`, e por que ele não basta ──────────────────────────
 *
 * A mensagem entrava na tela em silêncio: quem usa leitor de tela apertava
 * Salvar, o formulário recusava, e nada era anunciado. `role="alert"` é região
 * viva assertiva — o texto é lido no instante em que aparece.
 *
 * O que ele NÃO resolve sozinho é a ASSOCIAÇÃO. Anunciado no instante em que
 * aparece, o erro some do alcance de quem navegar de volta ao campo depois:
 * sem `aria-describedby`, o controle continua se anunciando como válido e sem
 * motivo. Associar exige um `id` aqui e o `aria-describedby` lá.
 *
 * Quem faz esse par é o `Campo`, abaixo. Este componente aceita `id` para ser
 * usado por ele; usado solto, continua anunciando e continua desassociado —
 * que era o estado de todos os treze formulários do sistema.
 */
export const MensagemDeErro: React.FC<{ texto?: string; id?: string }> = ({
  texto,
  id,
}) =>
  texto ? (
    <p
      id={id}
      role="alert"
      className="mt-1 flex items-center gap-1 text-sm text-perigo"
    >
      <IconeAlerta className="h-4 w-4 shrink-0" aria-hidden="true" />
      {texto}
    </p>
  ) : null;

interface CampoProps {
  /** O `id` do controle. É por ele que o rótulo e o erro se ligam ao campo. */
  id: string;
  rotulo: React.ReactNode;
  /** Marca o rótulo com asterisco E põe `aria-required` no controle. */
  obrigatorio?: boolean;
  /** A mensagem de erro. Quando existe, o controle vira inválido. */
  erro?: string;
  /** Texto de apoio abaixo do campo — contador, formato esperado. */
  dica?: React.ReactNode;
  /**
   * UM controle: `Input`, `Textarea` ou `Seletor`.
   *
   * Tipado com o registro de props aberto porque o `cloneElement` precisa
   * injetar `id` e os `aria-*`, e um `ReactElement` sem parâmetro não aceita
   * prop nenhuma no clone.
   */
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
}

/**
 * O campo inteiro: rótulo, controle, erro e dica — ligados entre si.
 *
 * ── O buraco que ele fecha ───────────────────────────────────────────
 *
 * A varredura da Fase 8 achou **zero ocorrências** de `aria-invalid`,
 * `aria-describedby` e `aria-errormessage` em todo o `src`. As telas montavam
 * a pilha à mão — `RotuloDeCampo`, controle, `MensagemDeErro` — e a mensagem
 * ficava SOLTA: um `<p>` vermelho ao lado do campo, sem nada dizendo a quem
 * ela pertence.
 *
 * O efeito é que o campo continuava se anunciando como VÁLIDO. Quem navegasse
 * de volta até ele depois de o formulário recusar ouvia "Nome, caixa de
 * edição" — sem "inválido", e sem o motivo. A mensagem existia só para quem
 * a via na tela.
 *
 * A Fase 10 deu `role="alert"` ao `MensagemDeErro`, e isso resolve o ANÚNCIO
 * no instante em que o erro aparece. Não resolve a ASSOCIAÇÃO, que é o que
 * faz o motivo estar disponível depois — e associar exige `id`, que é decisão
 * de cada sítio de uso. Este componente tira essa decisão do sítio.
 *
 * ── Por que `cloneElement`, que normalmente é ruim ───────────────────
 *
 * O componente injeta `id`, `aria-invalid`, `aria-required` e
 * `aria-describedby` no filho. A alternativa seria o sítio escrever os quatro
 * a cada campo, e é exatamente essa a coisa que ninguém faz toda vez — foi
 * assim que se chegou a zero ocorrências em treze formulários.
 *
 * O risco do `cloneElement` é injetar em quem não espera. Aqui o filho é
 * sempre um primitivo deste kit, e os três repassam `...resto` ao elemento
 * nativo. Props que o sítio já tenha escrito VENCEM: o spread do filho vem
 * depois, então um `aria-describedby` próprio não é sobrescrito.
 *
 * ── A dica entra no `aria-describedby` junto com o erro ──────────────
 *
 * Um contador de caracteres é a única explicação para "500 caracteres" ser
 * recusado. Deixá-lo fora da descrição do campo é o mesmo defeito do
 * `ContadorMinimo`, que a varredura registrou: a explicação existe e não
 * alcança quem precisa dela.
 */
export const Campo: React.FC<CampoProps> = ({
  id,
  rotulo,
  obrigatorio = false,
  erro,
  dica,
  children,
  className,
}) => {
  const idDoErro = `${id}-erro`;
  const idDaDica = `${id}-dica`;

  // O erro vem primeiro: quando os dois existem, é ele que a pessoa precisa
  // ouvir antes.
  const descritores = [erro && idDoErro, dica && idDaDica]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <RotuloDeCampo htmlFor={id} obrigatorio={obrigatorio}>
        {rotulo}
      </RotuloDeCampo>

      {React.cloneElement(children, {
        id,
        'aria-invalid': erro ? true : undefined,
        'aria-required': obrigatorio || undefined,
        'aria-describedby': descritores || undefined,
        // O spread do filho vem por ÚLTIMO de propósito: o que o sítio já
        // escreveu vence o que este componente injeta. Um campo que precise de
        // `aria-describedby` próprio continua podendo declará-lo.
        ...(children.props as Record<string, unknown>),
      })}

      <MensagemDeErro id={idDoErro} texto={erro} />

      {dica && (
        <p id={idDaDica} className="mt-1 text-xs text-conteudo-tenue">
          {dica}
        </p>
      )}
    </div>
  );
};
