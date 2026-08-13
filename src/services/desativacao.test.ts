import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import { setoresService, usuariosService } from './chamadoshsapi';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const patch = vi.mocked(api.patch);
const remover = vi.mocked(api.delete);
const atualizar = vi.mocked(api.put);

beforeEach(() => {
  vi.clearAllMocks();
  patch.mockResolvedValue({ data: { id: 7, nome: 'Fulano', ativo: false } } as never);
});

/**
 * Estes testes travam a MIGRAÇÃO, não o comportamento interno.
 *
 * A API tinha `DELETE /usuarios/{id}` que nunca apagou nada — desativava, e
 * devolvia 204 vazio. O front então removia a linha da lista, e no
 * carregamento seguinte o cadastro reaparecia: era daí que vinha o "eu deleto
 * e ele volta" que o usuário relatou.
 *
 * Trocar o verbo é metade; a outra metade é o retorno. O PATCH devolve o
 * registro atualizado, o que permite substituir a linha em vez de escondê-la —
 * e é isso que faz a tela mostrar o que de fato aconteceu.
 *
 * O passo 4 da API remove as rotas DELETE. Um `delete` que sobrasse aqui só
 * seria descoberto em produção, com 405, no clique de alguém.
 */

describe('desativação de usuário', () => {
  it('usa PATCH na rota de desativar, não DELETE', async () => {
    await usuariosService.desativar(7);

    expect(patch).toHaveBeenCalledWith('/usuarios/7/desativar');
    expect(remover).not.toHaveBeenCalled();
  });

  it('devolve o registro que o servidor gravou', async () => {
    // Sem isto a tela não teria com o que substituir a linha, e voltaria a
    // adivinhar o novo estado.
    const usuario = await usuariosService.desativar(7);

    expect(usuario).toEqual({ id: 7, nome: 'Fulano', ativo: false });
  });

  it('reativa por rota própria, não por edição de cadastro', async () => {
    await usuariosService.reativar(7);

    // Era `PUT {ativo: true}`: uma edição inteira, passando pelas validações
    // de cadastro, para mudar um booleano.
    expect(patch).toHaveBeenCalledWith('/usuarios/7/reativar');
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('não expõe mais um método de exclusão', () => {
    // O nome prometia o que o sistema não fazia. Deixá-lo por perto convida a
    // ser chamado de novo.
    expect('deletar' in usuariosService).toBe(false);
  });
});

describe('desativação de setor', () => {
  it('usa PATCH na rota de desativar, não DELETE', async () => {
    await setoresService.desativar(3);

    expect(patch).toHaveBeenCalledWith('/setores/3/desativar');
    expect(remover).not.toHaveBeenCalled();
  });

  it('reativa por rota própria', async () => {
    await setoresService.reativar(3);

    expect(patch).toHaveBeenCalledWith('/setores/3/reativar');
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('propaga o erro para quem chamou', async () => {
    // A API recusa desativar setor com usuários ativos e diz quantos são. Se o
    // serviço engolisse o erro, a tela mostraria sucesso sobre uma operação
    // que não aconteceu.
    patch.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'setor com 2 usuário(s) ativo(s)' } },
    });

    await expect(setoresService.desativar(3)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('não expõe mais um método de exclusão', () => {
    expect('deletar' in setoresService).toBe(false);
  });
});
