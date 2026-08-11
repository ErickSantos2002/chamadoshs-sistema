import React from 'react';
import { faltamCaracteres } from '../lib/validacao';
import { cn } from '../lib/utils';

interface ContadorMinimoProps {
  valor: string;
  minimo: number;
  /** Quando existe, o contador também mostra quanto ainda cabe. */
  maximo?: number;
}

/**
 * Contador de caracteres abaixo de um campo.
 *
 * Enquanto falta texto, diz quanto falta. Assim que o mínimo é atingido, para
 * de cobrar — se continuar avisando, vira ruído no campo que já está certo.
 *
 * A cor é âmbar e não vermelha: enquanto a pessoa digita, o campo está
 * incompleto, não errado. Vermelho antes da primeira tentativa de enviar
 * transforma a digitação normal numa sucessão de erros.
 */
export const ContadorMinimo: React.FC<ContadorMinimoProps> = ({ valor, minimo, maximo }) => {
  const faltam = faltamCaracteres(valor, minimo);
  const escritos = valor.trim().length;

  return (
    <p className={cn('mt-1 text-xs', faltam > 0 ? 'text-alerta' : 'text-conteudo-tenue')}>
      {faltam > 0
        ? `Faltam ${faltam} ${faltam === 1 ? 'caractere' : 'caracteres'} (mínimo ${minimo})`
        : maximo
          ? `${escritos}/${maximo} caracteres`
          : `${escritos} caracteres`}
    </p>
  );
};

export default ContadorMinimo;
