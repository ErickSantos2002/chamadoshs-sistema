import { Chamado, StatusEnum } from '../types/api';

/**
 * Se o chamado ainda espera a avaliação de quem o abriu.
 *
 * A avaliação existe desde a primeira versão e quase ninguém usa: 12 de 144
 * chamados nos primeiros nove meses. O motivo não é permissão — é lugar. As
 * estrelas só aparecem dentro da página de detalhe de um chamado resolvido, e
 * o solicitante não tem motivo para voltar lá depois que o problema acabou.
 *
 * Esta função move o pedido para onde a pessoa já passa: a lista de chamados.
 *
 * Só o solicitante avalia. Técnico e administrador não avaliam no lugar dele —
 * a nota mede a satisfação de quem foi atendido, e nota dada por quem atendeu
 * não mede nada.
 */
export function precisaAvaliar(
  chamado: Pick<
    Chamado,
    'solicitante_id' | 'status' | 'avaliacao' | 'cancelado' | 'arquivado'
  >,
  usuarioId: number | undefined
): boolean {
  // Enquanto o usuário não carregou, `usuarioId` é undefined e a comparação
  // abaixo já barra tudo: nenhum `solicitante_id` é igual a undefined.
  if (chamado.solicitante_id !== usuarioId) return false;

  // Chamado cancelado não teve atendimento para avaliar.
  if (chamado.cancelado) return false;

  // Arquivado já foi guardado: pedir nota agora é pedir que a pessoa avalie um
  // atendimento que ela provavelmente nem lembra. O caso ficou visível quando
  // o arquivo ganhou coluna própria no quadro — antes o card não aparecia em
  // lugar nenhum, e o selo "Avaliar" existia sem ter onde ser visto.
  if (chamado.arquivado) return false;

  const encerrado =
    chamado.status === StatusEnum.RESOLVIDO || chamado.status === StatusEnum.FECHADO;
  if (!encerrado) return false;

  // `avaliacao` é 1 a 5 no banco, então zero nunca é nota válida — mas a
  // comparação é explícita para não depender disso.
  return chamado.avaliacao === undefined || chamado.avaliacao === null;
}
