import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  historicoService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, Comentario, SetorDestinoEnum, StatusEnum, Usuario } from '../types/api';
import { MENSAGEM_INTERNO_RECUSADO } from '../lib/comentarios';
import ChamadoDetalhes from '../pages/ChamadoDetalhes';
import ChamadoModal from './ChamadoModal';

/**
 * Comentários internos (API-8, FE-5, `lib/comentarios`).
 *
 * Só quem administra — administrador por perfil e a equipe da TI — vê a
 * opção. O padrão é público, `is_interno` vai sempre explícito, e um 403 num
 * interno nunca vira público sozinho: o texto fica, o envio trava, e publicar
 * é escolha da pessoa.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Impressora do RH',
  protocolo: 'CHAM-2026-0201',
  descricao: 'Não imprime.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 1,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.TI,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
} as unknown as Chamado;

const comentario = (id: number, texto: string, criado: string, interno = false) =>
  ({
    id,
    chamado_id: 1,
    usuario_id: 2,
    comentario: texto,
    is_interno: interno,
    created_at: criado,
    updated_at: criado,
  }) as Comentario;

type Sessao = React.ContextType<typeof AuthContext>;
const sessao = (id: number, role: string, integra = false, revalidar = vi.fn(async () => {})): Sessao =>
  ({
    user: { id, username: `u${id}`, role, integra_equipe_ti: integra },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: true,
    falhaAoConfirmar: false,
    revalidarIdentidade: revalidar,
  }) as Sessao;

const ADMIN = () => sessao(1, 'Administrador');
const TECNICO_TI = () => sessao(3, 'Tecnico', true);
const TECNICO_FORA = () => sessao(4, 'Tecnico', false);
const USUARIO = () => sessao(2, 'Usuario');

const PROIBIDO = { response: { status: 403, data: { detail: 'Sem permissão para comentário interno' } } };

let host: HTMLDivElement;
let root: Root;
let criar: MockInstance<typeof comentariosService.criar>;
let naApi: Comentario[];

beforeEach(() => {
  naApi = [];
  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/chamados/1') return { data: CHAMADO };
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockResolvedValue(CHAMADO);
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([{ id: 1, nome: 'rickelme' }]);
  criar = vi
    .spyOn(comentariosService, 'criar')
    .mockImplementation(async (d) => comentario(99, d.comentario, '2026-09-02T10:00:00', d.is_interno));
  vi.spyOn(comentariosService, 'listarPorChamado').mockImplementation(async () => naApi);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
    { id: 2, nome: 'Maria do RH', role_id: 3, ativo: true } as Usuario,
  ]);
  vi.spyOn(toast, 'error').mockImplementation(() => '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

const arvore = (onde: 'pagina' | 'modal', quem: Sessao) => (
  <AuthContext.Provider value={quem}>
    <ThemeProvider>
      <ChamadosProvider>
        {onde === 'pagina' ? (
          <MemoryRouter initialEntries={['/chamados/1']}>
            <Routes>
              <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
            </Routes>
          </MemoryRouter>
        ) : (
          <ChamadoModal chamadoId={1} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
        )}
      </ChamadosProvider>
    </ThemeProvider>
  </AuthContext.Provider>
);

const montar = async (onde: 'pagina' | 'modal', quem: Sessao) => {
  await act(async () => {
    root.render(arvore(onde, quem));
  });
};

const ENVIAR = { pagina: 'Enviar Comentário', modal: 'Comentar' } as const;

const botao = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as
    | HTMLButtonElement
    | undefined;

const clicar = async (texto: string) => {
  const alvo = botao(texto);
  expect(alvo, `botão "${texto}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const opcaoInterno = () =>
  Array.from(document.querySelectorAll('label'))
    .find((l) => l.textContent?.includes('Comentário interno'))
    ?.querySelector('input') as HTMLInputElement | undefined;

const marcarInterno = async () => {
  const caixa = opcaoInterno();
  expect(caixa, 'opção de interno não apareceu').toBeTruthy();
  await act(async () => {
    caixa!.click();
  });
};

const digitar = async (valor: string) => {
  const campo = document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]');
  expect(campo, 'campo de comentário não apareceu').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo!.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const textoDoCampo = () =>
  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]')?.value;

for (const onde of ['pagina', 'modal'] as const) {
  describe(`${onde} — quem vê a opção`, () => {
    it('administrador: vê, desmarcada; o padrão é público e vai explícito', async () => {
      await montar(onde, ADMIN());
      expect(opcaoInterno()).toBeTruthy();
      expect(opcaoInterno()!.checked).toBe(false);
      await digitar('Troquei o toner');
      await clicar(ENVIAR[onde]);
      expect(criar).toHaveBeenCalledTimes(1);
      expect(criar.mock.calls[0][0]).toMatchObject({ is_interno: false });
      expect(criar.mock.calls[0][0]).toHaveProperty('is_interno', false);
    });

    it('técnico da equipe da TI: vê, e marcar manda is_interno: true', async () => {
      await montar(onde, TECNICO_TI());
      await digitar('Fornecedor cobra R$ 400 pela peça');
      await marcarInterno();
      await clicar(ENVIAR[onde]);
      expect(criar.mock.calls[0][0]).toMatchObject({ is_interno: true });
    });

    it('depois de enviar um interno, o próximo volta a ser público', async () => {
      await montar(onde, ADMIN());
      await digitar('Primeiro');
      await marcarInterno();
      await clicar(ENVIAR[onde]);
      expect(opcaoInterno()!.checked).toBe(false);
    });

    for (const [nome, quem] of [
      ['técnico fora da equipe da TI', TECNICO_FORA],
      ['usuário comum', USUARIO],
    ] as const) {
      it(`${nome}: não vê a opção, e o comentário vai público`, async () => {
        await montar(onde, quem());
        expect(opcaoInterno()).toBeUndefined();
        expect(document.body.textContent).not.toContain('Comentário interno');
        await digitar('Ainda não imprime');
        await clicar(ENVIAR[onde]);
        expect(criar.mock.calls[0][0]).toHaveProperty('is_interno', false);
      });
    }

    it('identidade ainda não confirmada: sem a opção', async () => {
      await montar(onde, { ...ADMIN(), identidadeConfirmada: false } as Sessao);
      expect(opcaoInterno()).toBeUndefined();
    });
  });

  describe(`${onde} — a marca do interno na lista`, () => {
    it('o interno traz o selo "Interno" em texto; o público, não', async () => {
      naApi = [
        comentario(1, 'Público para a Maria', '2026-09-01T11:00:00'),
        comentario(2, 'Só para a equipe', '2026-09-01T12:00:00', true),
      ];
      await montar(onde, ADMIN());
      const itens = Array.from(document.querySelectorAll('p')).filter((p) =>
        ['Público para a Maria', 'Só para a equipe'].includes(p.textContent?.trim() ?? '')
      );
      expect(itens).toHaveLength(2);
      const cartao = (p: Element) => p.closest('li') ?? p.parentElement!;
      const selos = (p: Element) =>
        Array.from(cartao(p).querySelectorAll('span')).filter((s) => s.textContent?.trim() === 'Interno');
      expect(selos(itens[0])).toHaveLength(0);
      expect(selos(itens[1])).toHaveLength(1);
    });

    it('ordem estável: data de criação, e o id no empate — não a ordem da resposta', async () => {
      naApi = [
        comentario(30, 'C terceiro', '2026-09-01T12:00:00'),
        comentario(12, 'B segundo (mesmo instante, id maior)', '2026-09-01T11:00:00'),
        comentario(11, 'A primeiro (mesmo instante, id menor)', '2026-09-01T11:00:00'),
      ];
      await montar(onde, ADMIN());
      const ordem = Array.from(document.querySelectorAll('p'))
        .map((p) => p.textContent?.trim() ?? '')
        .filter((t) => /^[ABC] /.test(t))
        .map((t) => t[0]);
      expect(ordem).toEqual(['A', 'B', 'C']);
    });
  });

  describe(`${onde} — 403 no interno`, () => {
    const recusar = async (revalidar = vi.fn(async () => {})) => {
      await montar(onde, sessao(1, 'Administrador', false, revalidar));
      await digitar('Custo da peça: R$ 400');
      await marcarInterno();
      criar.mockRejectedValueOnce(PROIBIDO);
      await clicar(ENVIAR[onde]);
      return revalidar;
    };

    it('o texto fica, sem toast próprio, sem reenvio, e o envio trava', async () => {
      const revalidar = await recusar();
      expect(textoDoCampo()).toBe('Custo da peça: R$ 400');
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
      expect(criar).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain(MENSAGEM_INTERNO_RECUSADO);
      expect(botao(ENVIAR[onde])!.disabled).toBe(true);
      // A permissão é relida; a escrita, nunca.
      expect(revalidar).toHaveBeenCalledTimes(1);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
      expect(criar).toHaveBeenCalledTimes(1);
    });

    it('a janela não troca o chamado por um aviso de erro', async () => {
      await recusar();
      expect(document.body.textContent).toContain(CHAMADO.descricao);
      expect(document.body.textContent).not.toContain('Erro ao enviar');
    });

    it('"Tornar público" não envia; enviar depois é um clique, e vai público', async () => {
      await recusar();
      await clicar('Tornar público');
      expect(criar).toHaveBeenCalledTimes(1);
      expect(textoDoCampo()).toBe('Custo da peça: R$ 400');
      await clicar(ENVIAR[onde]);
      expect(criar).toHaveBeenCalledTimes(2);
      expect(criar.mock.calls[1][0]).toMatchObject({
        is_interno: false,
        comentario: 'Custo da peça: R$ 400',
      });
    });

    it('a permissão sai com o interno marcado: não vira público sozinho', async () => {
      await montar(onde, ADMIN());
      await digitar('Rascunho interno');
      await marcarInterno();
      // A revalidação do /auth/me tirou a permissão.
      await act(async () => {
        root.render(arvore(onde, sessao(1, 'Tecnico', false)));
      });
      expect(document.body.textContent).toContain(MENSAGEM_INTERNO_RECUSADO);
      expect(botao(ENVIAR[onde])!.disabled).toBe(true);
      expect(criar).not.toHaveBeenCalled();
      await clicar('Tornar público');
      await clicar(ENVIAR[onde]);
      expect(criar.mock.calls[0][0]).toHaveProperty('is_interno', false);
    });
  });

  describe(`${onde} — 403 no público`, () => {
    it('o texto fica, e o toast é só o do interceptor', async () => {
      await montar(onde, USUARIO());
      await digitar('Ainda com defeito');
      criar.mockRejectedValueOnce(PROIBIDO);
      await clicar(ENVIAR[onde]);
      expect(textoDoCampo()).toBe('Ainda com defeito');
      expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
      expect(criar).toHaveBeenCalledTimes(1);
    });

    it('outro erro: o detail no toast, e o texto fica', async () => {
      await montar(onde, USUARIO());
      await digitar('Ainda com defeito');
      criar.mockRejectedValueOnce({ response: { status: 422, data: { detail: 'Comentário vazio' } } });
      await clicar(ENVIAR[onde]);
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Comentário vazio');
      expect(textoDoCampo()).toBe('Ainda com defeito');
    });
  });
}
