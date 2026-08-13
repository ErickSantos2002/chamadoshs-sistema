import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import { auditoriaService } from './chamadoshsapi';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const get = vi.mocked(api.get);

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: [] } as never);
});

/** Os parâmetros da última chamada. */
const params = () => get.mock.calls[0]?.[1]?.params as Record<string, unknown> | undefined;

describe('auditoriaService.listar', () => {
  it('chama a rota com a barra final', async () => {
    await auditoriaService.listar();

    // O router é montado em `/api/v1/eventos` e a rota é `/`. Sem a barra o
    // FastAPI responde 307 e o navegador refaz a requisição — funciona, e gasta
    // uma ida à rede em cada troca de filtro.
    expect(get).toHaveBeenCalledWith('/eventos/', expect.anything());
  });

  it('omite filtro vazio em vez de mandar string vazia', async () => {
    // `alvo=` é valor inválido para a API e viraria 400. O componente guarda
    // string vazia para "todos", que é o natural num <select>.
    await auditoriaService.listar({ alvo: undefined, ator_id: undefined, de: '', ate: '' });

    expect(params()?.alvo).toBeUndefined();
    expect(params()?.de).toBeUndefined();
    expect(params()?.ate).toBeUndefined();
  });

  it('passa os filtros preenchidos', async () => {
    await auditoriaService.listar({
      alvo: 'setor',
      ator_id: 7,
      de: '2026-08-01',
      ate: '2026-08-13',
    });

    expect(params()).toMatchObject({
      alvo: 'setor',
      ator_id: 7,
      de: '2026-08-01',
      ate: '2026-08-13',
    });
  });

  it('passa skip zero, em vez de omitir', async () => {
    // Zero é falso em JavaScript. Se o serviço filtrasse por veracidade, a
    // primeira página nunca mandaria `skip` — o que hoje dá no mesmo, porque o
    // padrão da API é 0, e deixaria de dar no dia em que o padrão mudasse.
    await auditoriaService.listar({ skip: 0, limit: 50 });

    expect(params()?.skip).toBe(0);
    expect(params()?.limit).toBe(50);
  });

  it('não engole erro da API', async () => {
    // A tela precisa distinguir "nenhum evento" de "não consegui perguntar".
    // Um catch aqui transformaria falha em lista vazia, que se lê como
    // "ninguém mexeu em nada" — a conclusão mais perigosa numa auditoria.
    get.mockRejectedValueOnce({ response: { status: 403 } });

    await expect(auditoriaService.listar()).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
