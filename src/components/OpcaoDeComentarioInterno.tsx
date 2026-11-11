import React from 'react';
import { Aviso, Badge, Button, Checkbox } from './ui';
import {
  MENSAGEM_INTERNO_RECUSADO,
  MENSAGEM_INTERNO_SEM_CONFIRMACAO,
  dicaDoInterno,
} from '../lib/comentarios';

interface OpcaoDeComentarioInternoProps {
  /** Quem pode criar interno agora (`podeAdministrar`). */
  pode: boolean;
  interno: boolean;
  /**
   * A API recusou o interno (403), ou a permissão saiu com ele marcado. Em
   * ambos, o envio fica travado até a pessoa escolher publicar.
   */
  bloqueado: boolean;
  /**
   * A permissão não pôde ser confirmada (revalidação falhou): o bloqueio diz
   * isso, e oferece confirmar de novo além de publicar.
   */
  semConfirmacao?: boolean;
  aoConfirmarDeNovo?: () => void;
  aoMudar: (interno: boolean) => void;
  /** A escolha explícita de mandar o mesmo texto como público. */
  aoTornarPublico: () => void;
  desabilitado?: boolean;
  /** O chamado é da Qualidade: a dica diz a equipe que lê o interno. */
  daQualidade?: boolean;
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
  semConfirmacao = false,
  aoConfirmarDeNovo,
  aoMudar,
  aoTornarPublico,
  desabilitado = false,
  daQualidade = false,
}) => {
  if (bloqueado) {
    return (
      <Aviso variante="alerta">
        <span className="block">
          {semConfirmacao ? MENSAGEM_INTERNO_SEM_CONFIRMACAO : MENSAGEM_INTERNO_RECUSADO}
        </span>
        <span className="mt-2 flex flex-wrap gap-2">
          {semConfirmacao && aoConfirmarDeNovo && (
            <Button variante="secundario" tamanho="sm" onClick={aoConfirmarDeNovo}>
              Confirmar de novo
            </Button>
          )}
          <Button variante="secundario" tamanho="sm" onClick={aoTornarPublico}>
            Tornar público
          </Button>
        </span>
      </Aviso>
    );
  }

  if (!pode) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Checkbox marcado={interno} aoMudar={aoMudar} desabilitado={desabilitado} dica={dicaDoInterno(daQualidade)}>
        Comentário interno
      </Checkbox>
      {interno && <Badge variante="alerta">Interno</Badge>}
    </div>
  );
};

/** O selo do comentário interno na lista — texto, e não só cor. */
export const SeloInterno: React.FC = () => <Badge variante="alerta">Interno</Badge>;

export default OpcaoDeComentarioInterno;
