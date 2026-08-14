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

/** Erro de campo. Nada é renderizado quando não há erro. */
export const MensagemDeErro: React.FC<{ texto?: string }> = ({ texto }) =>
  texto ? (
    <p className="mt-1 flex items-center gap-1 text-sm text-perigo">
      <IconeAlerta className="h-4 w-4 shrink-0" aria-hidden="true" />
      {texto}
    </p>
  ) : null;
