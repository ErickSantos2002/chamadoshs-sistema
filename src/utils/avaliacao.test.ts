import { describe, it, expect } from 'vitest';
import { precisaAvaliar } from './avaliacao';
import { StatusEnum } from '../types/api';

const base = {
  solicitante_id: 7,
  status: StatusEnum.RESOLVIDO,
  avaliacao: undefined as number | undefined,
  cancelado: false,
  arquivado: false,
};

describe('precisaAvaliar', () => {
  it('pede avaliação do solicitante em chamado resolvido e ainda sem nota', () => {
    expect(precisaAvaliar(base, 7)).toBe(true);
  });

  it('vale também para chamado fechado', () => {
    expect(precisaAvaliar({ ...base, status: StatusEnum.FECHADO }, 7)).toBe(true);
  });

  // A nota mede a satisfação de quem foi atendido. Se o técnico pudesse
  // avaliar, o indicador passaria a medir a opinião de quem prestou o serviço.
  it('não pede a quem não abriu o chamado', () => {
    expect(precisaAvaliar(base, 99)).toBe(false);
  });

  it('não pede quando o chamado já foi avaliado', () => {
    for (const nota of [1, 2, 3, 4, 5]) {
      expect(precisaAvaliar({ ...base, avaliacao: nota }, 7)).toBe(false);
    }
  });

  it('não pede enquanto o atendimento não terminou', () => {
    const emAberto = [StatusEnum.ABERTO, StatusEnum.EM_ANDAMENTO, StatusEnum.AGUARDANDO];
    for (const status of emAberto) {
      expect(precisaAvaliar({ ...base, status }, 7)).toBe(false);
    }
  });

  it('não pede em chamado cancelado, que não teve atendimento', () => {
    expect(precisaAvaliar({ ...base, cancelado: true }, 7)).toBe(false);
  });

  // Ficou visível quando o arquivo ganhou coluna no quadro: o card arquivado
  // aparecia pedindo nota de um atendimento antigo, já guardado.
  it('não pede em chamado arquivado, que já foi guardado', () => {
    expect(precisaAvaliar({ ...base, arquivado: true }, 7)).toBe(false);
  });

  // Durante o carregamento inicial o usuário ainda não existe no contexto. A
  // comparação com o solicitante já cobre esse caso, e este teste existe para
  // que continue coberto se alguém reordenar as checagens.
  it('não pede nada quando ainda não se sabe quem está logado', () => {
    expect(precisaAvaliar(base, undefined)).toBe(false);
  });
});
