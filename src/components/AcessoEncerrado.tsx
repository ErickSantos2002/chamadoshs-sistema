import React from 'react';
import { Aviso, RotuloDeCampo, Textarea } from './ui';
import type { RascunhoPreservado } from '../lib/acesso';

interface AcessoEncerradoProps {
  mensagem: string;
  rascunhos: RascunhoPreservado[];
  /** O caminho de saída: voltar à lista, na página; fechar, no modal. */
  children?: React.ReactNode;
}

/**
 * O que sobra na tela depois de um chamado sair do alcance de quem o via
 * (`lib/acesso`): o aviso, e o que a pessoa tinha digitado, só para ler e
 * copiar — sem botão de enviar, que não teria para onde ir. Nada do chamado
 * aparece aqui: nem título, nem descrição, nem comentários.
 */
export const AcessoEncerrado: React.FC<AcessoEncerradoProps> = ({
  mensagem,
  rascunhos,
  children,
}) => (
  <div className="space-y-4">
    <Aviso variante="alerta">{mensagem}</Aviso>

    {rascunhos.length > 0 && (
      <div className="space-y-3">
        <p className="text-sm text-conteudo-suave">
          O que você tinha digitado não foi enviado. Ele fica aqui para você copiar:
        </p>
        {rascunhos.map((r, i) => (
          <div key={r.rotulo}>
            <RotuloDeCampo htmlFor={`rascunho-preservado-${i}`}>{r.rotulo}</RotuloDeCampo>
            <Textarea id={`rascunho-preservado-${i}`} value={r.texto} readOnly rows={3} />
          </div>
        ))}
      </div>
    )}

    {children}
  </div>
);

export default AcessoEncerrado;
