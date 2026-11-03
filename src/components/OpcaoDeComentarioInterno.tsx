import React from 'react';
import { Aviso, Badge, Button, Checkbox } from './ui';
import { DICA_DO_INTERNO, MENSAGEM_INTERNO_RECUSADO } from '../lib/comentarios';

interface OpcaoDeComentarioInternoProps {
  /** Quem pode criar interno agora (`podeAdministrar`). */
  pode: boolean;
  interno: boolean;
  /**
   * A API recusou o interno (403), ou a permissão saiu com ele marcado. Em
   * ambos, o envio fica travado até a pessoa escolher publicar.
   */
  bloqueado: boolean;
  aoMudar: (interno: boolean) => void;
  /** A escolha explícita de mandar o mesmo texto como público. */
  aoTornarPublico: () => void;
  desabilitado?: boolean;
}

/**
 * A opção de comentário interno, na página e no modal — uma só, para a regra
 * de "nunca vira público sozinho" não ter duas versões (`lib/comentarios`).
 * Quem não pode criar interno não vê nada aqui.
 */
export const OpcaoDeComentarioInterno: React.FC<OpcaoDeComentarioInternoProps> = ({
  pode,
  interno,
  bloqueado,
  aoMudar,
  aoTornarPublico,
  desabilitado = false,
}) => {
  if (bloqueado) {
    return (
      <Aviso variante="alerta">
        <span className="block">{MENSAGEM_INTERNO_RECUSADO}</span>
        <Button variante="secundario" tamanho="sm" className="mt-2" onClick={aoTornarPublico}>
          Tornar público
        </Button>
      </Aviso>
    );
  }

  if (!pode) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Checkbox marcado={interno} aoMudar={aoMudar} desabilitado={desabilitado} dica={DICA_DO_INTERNO}>
        Comentário interno
      </Checkbox>
      {interno && <Badge variante="alerta">Interno</Badge>}
    </div>
  );
};

/** O selo do comentário interno na lista — texto, e não só cor. */
export const SeloInterno: React.FC = () => <Badge variante="alerta">Interno</Badge>;

export default OpcaoDeComentarioInterno;
