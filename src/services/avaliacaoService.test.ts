import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import { chamadosService } from './chamadoshsapi';
import type { Chamado } from '../types/api';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const enviar = vi.mocked(api.patch);
const atualizar = vi.mocked(api.put);

describe('chamadosService.avaliar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enviar.mockResolvedValue({ data: { id: 42, avaliacao: 5 } as Chamado } as never);
  });

  it('chama o endpoint do solicitante com a nota no corpo', async () => {
    await chamadosService.avaliar(42, 5);

    expect(enviar).toHaveBeenCalledWith('/chamados/42/avaliar', { avaliacao: 5 });
  });

  // A regressão que este arquivo existe para impedir: a avaliação já foi feita
  // por PUT /chamados/{id}, que exige perfil de técnico ou administrador. O
  // solicitante levava 403 e não conseguia avaliar o próprio chamado.
  it('não usa o PUT, que é restrito à equipe', async () => {
    await chamadosService.avaliar(42, 5);

    expect(atualizar).not.toHaveBeenCalled();
  });

  // O backend usa um schema próprio (ChamadoAvaliacao) justamente para não
  // aceitar status, prioridade ou responsável vindos do solicitante. Mandar
  // campo a mais daqui seria confiar nesse descarte silencioso.
  it('envia apenas a nota, nenhum outro campo', async () => {
    await chamadosService.avaliar(42, 3);

    const [, corpo] = enviar.mock.calls[0];
    expect(Object.keys(corpo as object)).toEqual(['avaliacao']);
  });

  it('devolve o chamado atualizado que a API respondeu', async () => {
    const daApi = { id: 42, avaliacao: 4, protocolo: 'CH-042' } as Chamado;
    enviar.mockResolvedValue({ data: daApi } as never);

    expect(await chamadosService.avaliar(42, 4)).toEqual(daApi);
  });

  it('propaga o erro para a tela decidir a mensagem', async () => {
    enviar.mockRejectedValue({ response: { status: 409 } } as never);

    await expect(chamadosService.avaliar(42, 5)).rejects.toMatchObject({
      response: { status: 409 },
    });
  });
});
