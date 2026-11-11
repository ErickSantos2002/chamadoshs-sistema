import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import { chamadosService } from './chamadoshsapi';
import { StatusEnum, type Chamado } from '../types/api';

/**
 * O que sai pela rede com e sem a versão (FE-4). Sem versão, cada chamada é
 * byte a byte a de antes — é o que a TI e uma API anterior à 4 recebem.
 */

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const patch = vi.mocked(api.patch);
const put = vi.mocked(api.put);
const get = vi.mocked(api.get);

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({ data: { id: 5, versao: 9 } as Chamado } as never);
  put.mockResolvedValue({ data: { id: 5, versao: 9 } as Chamado } as never);
});

describe('chamadosService.buscar', () => {
  it('devolve a versão como veio', async () => {
    get.mockResolvedValue({ data: { id: 5, versao: 7 } } as never);
    expect((await chamadosService.buscar(5)).versao).toBe(7);
  });
});

describe.each(['cancelar', 'arquivar', 'desarquivar'] as const)('chamadosService.%s', (marca) => {
  it('com versão: manda só ela, no corpo', async () => {
    const atualizado = await chamadosService[marca](5, 4);

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith(`/chamados/5/${marca}`, { versao_esperada: 4 });
    expect(atualizado.versao).toBe(9);
  });

  it('sem versão: sem corpo, como antes', async () => {
    await chamadosService[marca](5);

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0]).toEqual([`/chamados/5/${marca}`]);
  });

  it.each([0, -1, 1.5, NaN])('versão %s não sai', async (v) => {
    await expect(chamadosService[marca](5, v)).rejects.toThrow('versão inválida');
    expect(patch).not.toHaveBeenCalled();
  });
});

describe('chamadosService.atualizar', () => {
  it('com versão: ela vai junto dos campos', async () => {
    await chamadosService.atualizar(5, { prioridade: 'Alta' as never, versao_esperada: 4 });
    expect(put).toHaveBeenCalledWith('/chamados/5', { prioridade: 'Alta', versao_esperada: 4 });
  });

  it('sem versão: o corpo de antes, sem a chave', async () => {
    await chamadosService.atualizar(5, { status: StatusEnum.EM_ANDAMENTO });
    expect(put.mock.calls[0][1]).toEqual({ status: StatusEnum.EM_ANDAMENTO });
    expect(put.mock.calls[0][1]).not.toHaveProperty('versao_esperada');
  });

  it.each([0, '4', null])('versão %s não sai', async (v) => {
    await expect(
      chamadosService.atualizar(5, { status: StatusEnum.EM_ANDAMENTO, versao_esperada: v as never })
    ).rejects.toThrow('versão inválida');
    expect(put).not.toHaveBeenCalled();
  });
});

describe('chamadosService.atender', () => {
  it('com versão: status e versão', async () => {
    await chamadosService.atender(5, { status: StatusEnum.EM_ANDAMENTO, versao_esperada: 4 });
    expect(patch).toHaveBeenCalledWith('/chamados/5/atendimento', {
      status: StatusEnum.EM_ANDAMENTO,
      versao_esperada: 4,
    });
  });

  it('versão inválida não sai', async () => {
    await expect(
      chamadosService.atender(5, { status: StatusEnum.EM_ANDAMENTO, versao_esperada: 0 })
    ).rejects.toThrow('versão inválida');
    expect(patch).not.toHaveBeenCalled();
  });
});
