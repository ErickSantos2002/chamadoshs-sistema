import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useResponsaveisTI, type ListaDeResponsaveisTI } from '../hooks/useResponsaveisTI';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  historicoService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, StatusEnum, Usuario } from '../types/api';
import { MENSAGENS_DA_LISTA, type ResponsavelTI } from '../lib/responsaveis';
import ChamadoModal from './ChamadoModal';
import ChamadoDetalhes from '../pages/ChamadoDetalhes';

/**
 * O seletor de responsável da TI na FE-5 (F5-1): a lista é a da API-9, e só
 * ela. Sem a lista, nada para escolher — e nada inventado. O responsável
 * antigo continua à vista e não muda sozinho.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const LISTA: ResponsavelTI[] = [
  { id: 65, nome: 'aaa.tecnico.ti' },
  { id: 10, nome: 'tecnico.ti' },
];

/** Inclui o inativo 56 — o índice de nomes é a listagem sem filtro. */
const USUARIOS = [
  { id: 2, nome: 'quem.abriu', role_id: 3, ativo: true },
  { id: 10, nome: 'tecnico.ti', role_id: 2, ativo: true },
  { id: 56, nome: 'tecnico.inativo', role_id: 2, ativo: false },
  { id: 65, nome: 'aaa.tecnico.ti', role_id: 2, ativo: true },
  { id: 70, nome: 'outro.setor', role_id: 2, ativo: true },
] as Usuario[];

const CHAMADO = {
  id: 107,
  titulo: 'VPN caiu',
  protocolo: 'CHAM-2026-0107',
  descricao: 'Sem VPN.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 10,
  cancelado: false,
  arquivado: false,
  setor_destino: 'TI',
  versao: 4,
} as unknown as Chamado;

type Perfil = { role: string; role_id: number; integra_equipe_ti: boolean };
const ADMIN: Perfil = { role: 'Administrador', role_id: 1, integra_equipe_ti: false };
const TI: Perfil = { role: 'Tecnico', role_id: 2, integra_equipe_ti: true };
const QUALIDADE: Perfil = { role: 'Tecnico', role_id: 2, integra_equipe_ti: false };
const USUARIO: Perfil = { role: 'Usuario', role_id: 3, integra_equipe_ti: false };

const sessao = (perfil: Perfil, id = 1, confirmada = true) =>
  ({
    user: { id, username: `u${id}`, ...perfil },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: confirmada,
    falhaAoConfirmar: false,
    revalidarIdentidade: async () => {},
  }) as React.ContextType<typeof AuthContext>;

/** Promessa que o teste resolve na hora que quiser. */
const adiada = <T,>() => {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((r, j) => {
    resolver = r;
    rejeitar = j;
  });
  return { promessa, resolver, rejeitar };
};

let host: HTMLDivElement;
let root: Root;
let listarResponsaveis: MockInstance<typeof chamadosService.listarResponsaveisTI>;
let atualizar: MockInstance<typeof chamadosService.atualizar>;
let listarUsuariosAtivos: MockInstance<typeof usuariosService.listarTodos>;

const nomeAcessivel = (el: Element): string =>
  (el.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ');

const seletorDoResponsavel = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('[role="combobox"]')).find((b) =>
    /respons/i.test(nomeAcessivel(b))
  );

const opcoes = async () => {
  const s = seletorDoResponsavel();
  expect(s, 'seletor de responsável não apareceu').toBeTruthy();
  await act(async () => {
    s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  return Array.from(document.querySelectorAll('[role="option"]'));
};

const escolher = async (texto: string) => {
  const alvo = (await opcoes()).find((o) => o.textContent?.trim() === texto);
  expect(alvo, `opção "${texto}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const abrirModal = async (
  perfil: Perfil = ADMIN,
  extra: Partial<Chamado> = {},
  chamadoId = CHAMADO.id
) => {
  vi.mocked(chamadosService.buscar).mockResolvedValue({ ...CHAMADO, ...extra } as Chamado);
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(perfil)}>
        <ThemeProvider>
          <ChamadosProvider>
            <ChamadoModal chamadoId={chamadoId} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(toast, 'error').mockImplementation(() => '');
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockResolvedValue(CHAMADO);
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 404,
    dados: { detail: 'Not Found' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([]);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  listarUsuariosAtivos = vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue(USUARIOS);
  listarResponsaveis = vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue(LISTA);
  atualizar = vi
    .spyOn(chamadosService, 'atualizar')
    .mockImplementation(async (_id, d) => ({ ...CHAMADO, ...d }) as Chamado);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('a lista vem só da API-9', () => {
  it('as opções são "Sem atribuição" e a lista da rota, na ordem dela', async () => {
    await abrirModal();
    expect(listarResponsaveis).toHaveBeenCalledTimes(1);
    expect((await opcoes()).map((o) => o.textContent?.trim())).toEqual([
      'Sem atribuição',
      'aaa.tecnico.ti',
      'tecnico.ti',
    ]);
    // O técnico de outro setor e o inativo, que o filtro antigo de
    // `GET /usuarios/` oferecia, não aparecem.
    expect(host.ownerDocument.body.textContent).not.toContain('outro.setor');
  });

  it('nunca pede os usuários ativos para montar o seletor', async () => {
    await abrirModal();
    for (const chamada of listarUsuariosAtivos.mock.calls) {
      expect(chamada[0]).not.toEqual({ ativo: true });
    }
  });

  it('escolher manda o id da lista, e o quadro recebe o chamado', async () => {
    await abrirModal();
    await escolher('aaa.tecnico.ti');
    expect(atualizar.mock.calls).toStrictEqual([[107, { tecnico_responsavel_id: 65 }]]);
  });

  it('administrador e técnico da TI pedem a lista; técnico da Qualidade e usuário, não', async () => {
    for (const [perfil, pede] of [
      [ADMIN, true],
      [TI, true],
      [QUALIDADE, false],
      [USUARIO, false],
    ] as Array<[Perfil, boolean]>) {
      listarResponsaveis.mockClear();
      act(() => root.unmount());
      root = createRoot(host);
      await abrirModal(perfil);
      expect(listarResponsaveis.mock.calls.length > 0, perfil.role).toBe(pede);
      if (!pede) {
        // Só leitura: o nome do responsável, sem seletor.
        expect(seletorDoResponsavel()).toBeUndefined();
        expect(host.ownerDocument.body.textContent).toContain('tecnico.ti');
      }
    }
  });

  it('identidade ainda não confirmada: não pede', async () => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={sessao(ADMIN, 1, false)}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={107} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
    expect(listarResponsaveis).not.toHaveBeenCalled();
  });

  it('chamado da Qualidade não usa a lista da TI', async () => {
    await abrirModal(ADMIN, { setor_destino: 'QUALIDADE' } as Partial<Chamado>);
    expect(listarResponsaveis).not.toHaveBeenCalled();
  });

  it('cada abertura pede de novo — sem cache', async () => {
    await abrirModal(ADMIN, {}, 107);
    await abrirModal(ADMIN, { id: 108 } as Partial<Chamado>, 108);
    expect(listarResponsaveis).toHaveBeenCalledTimes(2);
  });

  it('o serviço chama a rota da API-9 e confere o formato', async () => {
    listarResponsaveis.mockRestore();
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: [{ id: 1, nome: 'x', extra: 1 }] });
    await expect(chamadosService.listarResponsaveisTI()).resolves.toEqual([{ id: 1, nome: 'x' }]);
    expect(get).toHaveBeenCalledWith('/chamados/responsaveis-ti');

    get.mockResolvedValue({ data: { detail: 'qualquer' } });
    await expect(chamadosService.listarResponsaveisTI()).rejects.toThrow(/formato inesperado/);
  });
});

describe('sem lista válida, sem escolha — e sem fallback', () => {
  const casos: Array<[string, () => unknown, string]> = [
    ['403', () => ({ response: { status: 403, data: { detail: 'Requer perfil' } } }), MENSAGENS_DA_LISTA['sem-permissao']],
    ['404 (rota ausente)', () => ({ response: { status: 404 } }), MENSAGENS_DA_LISTA.indisponivel],
    ['405', () => ({ response: { status: 405 } }), MENSAGENS_DA_LISTA.indisponivel],
    ['422 (API-8: cai em /{chamado_id})', () => ({ response: { status: 422, data: { detail: 'x' } } }), MENSAGENS_DA_LISTA.incompativel],
    ['500', () => ({ response: { status: 500 } }), MENSAGENS_DA_LISTA.falhou],
    ['rede', () => ({ request: {}, message: 'Network Error' }), MENSAGENS_DA_LISTA.falhou],
  ];

  for (const [rotulo, erro, mensagem] of casos) {
    it(`${rotulo}: seletor travado no atual, mensagem no lugar, nenhum fallback`, async () => {
      listarResponsaveis.mockRejectedValue(erro());
      await abrirModal();

      const s = seletorDoResponsavel()!;
      expect(s.disabled).toBe(true);
      // O atual continua à vista — não vira "Sem atribuição".
      expect(s.textContent).toContain('tecnico.ti');
      expect(host.ownerDocument.body.textContent).toContain(mensagem);
      // Nenhuma lista inventada: o filtro antigo não é chamado.
      for (const chamada of listarUsuariosAtivos.mock.calls) {
        expect(chamada[0]).not.toEqual({ ativo: true });
      }
      expect(atualizar).not.toHaveBeenCalled();
      // A falha não vira toast desta tela (o 403 é do interceptor).
      expect(toast.error).not.toHaveBeenCalled();
    });
  }

  it('resposta fora do contrato: travado, como incompatível', async () => {
    listarResponsaveis.mockRestore();
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/chamados/responsaveis-ti') return { data: [{ id: '10', nome: 'tecnico.ti' }] };
      throw new Error(`rede bloqueada no teste: get ${url}`);
    });
    await abrirModal();
    expect(seletorDoResponsavel()!.disabled).toBe(true);
    expect(host.ownerDocument.body.textContent).toContain(MENSAGENS_DA_LISTA.incompativel);
  });

  it('"Tentar de novo" pede uma vez, e com a lista volta a escolher', async () => {
    listarResponsaveis.mockRejectedValueOnce({ response: { status: 500 } });
    await abrirModal();
    expect(seletorDoResponsavel()!.disabled).toBe(true);

    const botao = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tentar de novo')
    )!;
    await act(async () => botao.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(listarResponsaveis).toHaveBeenCalledTimes(2);
    expect(seletorDoResponsavel()!.disabled).toBe(false);
  });

  it('lista vazia: só "Sem atribuição", e o aviso de que não há ninguém', async () => {
    listarResponsaveis.mockResolvedValue([]);
    await abrirModal(ADMIN, { tecnico_responsavel_id: null } as unknown as Partial<Chamado>);
    expect((await opcoes()).map((o) => o.textContent?.trim())).toEqual(['Sem atribuição']);
    expect(host.ownerDocument.body.textContent).toContain('Nenhum responsável da TI');
  });
});

describe('o responsável antigo', () => {
  it('fora da lista: aparece "(fora da equipe)", como valor atual, e não como escolha', async () => {
    await abrirModal(ADMIN, { tecnico_responsavel_id: 56 });
    const s = seletorDoResponsavel()!;
    expect(s.textContent).toContain('tecnico.inativo (fora da equipe)');

    const lista = await opcoes();
    const fora = lista.find((o) => o.textContent?.includes('fora da equipe'))!;
    expect(fora.getAttribute('aria-disabled')).toBe('true');

    // Clicar nele não faz nada.
    await act(async () => fora.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('nada muda sozinho: abrir e fechar não faz PUT', async () => {
    await abrirModal(ADMIN, { tecnico_responsavel_id: 56 });
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('sem nome conhecido: o id, nunca um nome inventado', async () => {
    listarUsuariosAtivos.mockResolvedValue([]);
    await abrirModal(ADMIN, { tecnico_responsavel_id: 56 });
    expect(seletorDoResponsavel()!.textContent).toContain('Usuário #56 (fora da equipe)');
  });

  it('desatribuir continua permitido', async () => {
    await abrirModal(ADMIN, { tecnico_responsavel_id: 56 });
    await escolher('Sem atribuição');
    expect(atualizar.mock.calls).toStrictEqual([[107, { tecnico_responsavel_id: null }]]);
  });

  it('escolher quem já está não faz requisição', async () => {
    await abrirModal();
    await escolher('tecnico.ti');
    expect(atualizar).not.toHaveBeenCalled();
  });
});

describe('400 no PUT do modal', () => {
  it('mostra o detail, relê a lista e não repete', async () => {
    atualizar.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Técnico responsável está inativo' } },
    });
    await abrirModal();
    expect(listarResponsaveis).toHaveBeenCalledTimes(1);

    await escolher('aaa.tecnico.ti');
    await act(async () => {});

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain('Técnico responsável está inativo');
    expect(listarResponsaveis).toHaveBeenCalledTimes(2);
    // O valor continua o do servidor.
    expect(seletorDoResponsavel()!.textContent).toContain('tecnico.ti');
  });
});

describe('a página do chamado', () => {
  const montarPagina = async (perfil: Perfil = ADMIN, extra: Partial<Chamado> = {}) => {
    vi.mocked(chamadosService.buscar).mockResolvedValue({ ...CHAMADO, ...extra } as Chamado);
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/chamados/107') return { data: { ...CHAMADO, ...extra } };
      throw new Error(`rede bloqueada no teste: get ${url}`);
    });
    await act(async () => {
      root.render(
        <AuthContext.Provider value={sessao(perfil)}>
          <ThemeProvider>
            <ChamadosProvider>
              <MemoryRouter initialEntries={['/chamados/107']}>
                <Routes>
                  <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
                </Routes>
              </MemoryRouter>
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
  };

  const clicar = async (texto: string) => {
    const b = Array.from(host.querySelectorAll('button')).find((x) => x.textContent?.trim() === texto);
    expect(b, `botão "${texto}" não apareceu`).toBeTruthy();
    await act(async () => b!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  };

  it('a lista só é pedida ao entrar na edição, e a cada entrada', async () => {
    await montarPagina();
    expect(listarResponsaveis).not.toHaveBeenCalled();
    await clicar('Editar Detalhes');
    expect(listarResponsaveis).toHaveBeenCalledTimes(1);
    await clicar('Cancelar');
    await clicar('Editar Detalhes');
    expect(listarResponsaveis).toHaveBeenCalledTimes(2);
  });

  it('fora da edição, o responsável inativo aparece pelo nome, e não "Não encontrado"', async () => {
    await montarPagina(ADMIN, { tecnico_responsavel_id: 56 });
    expect(host.textContent).toContain('tecnico.inativo');
    expect(host.textContent).not.toContain('Não encontrado');
  });

  it('o responsável antigo é mantido: salvar outro campo manda o mesmo id', async () => {
    await montarPagina(ADMIN, { tecnico_responsavel_id: 56 });
    await clicar('Editar Detalhes');
    expect(seletorDoResponsavel()!.textContent).toContain('tecnico.inativo (fora da equipe)');
    await clicar('Salvar');
    expect(atualizar.mock.calls[0][1]).toMatchObject({ tecnico_responsavel_id: 56 });
  });

  it('400 no PUT: o formulário fica, com o que foi escolhido, e a lista é relida', async () => {
    atualizar.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Técnico responsável está inativo' } },
    });
    await montarPagina();
    await clicar('Editar Detalhes');
    await escolher('aaa.tecnico.ti');
    await clicar('Salvar');
    await act(async () => {});

    // Ainda em edição, com a escolha feita.
    expect(host.textContent).toContain('Salvar');
    expect(seletorDoResponsavel()!.textContent).toContain('aaa.tecnico.ti');
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain('Técnico responsável está inativo');
    expect(listarResponsaveis).toHaveBeenCalledTimes(2);
    // Nenhuma segunda tentativa sozinha.
    expect(atualizar).toHaveBeenCalledTimes(1);
    // E a página não virou a tela de erro.
    expect(host.textContent).not.toContain('Erro ao atualizar chamado.');
  });

  it('técnico da Qualidade editando chamado da TI: responsável só leitura, sem pedir a lista', async () => {
    await montarPagina(QUALIDADE);
    await clicar('Editar Detalhes');
    expect(listarResponsaveis).not.toHaveBeenCalled();
    expect(host.textContent).toContain('A troca do responsável da TI é de administradores');
  });
});

describe('respostas atrasadas da lista', () => {
  let visto: ListaDeResponsaveisTI;
  const Leitor: React.FC<{ ativo: boolean; chave: unknown }> = ({ ativo, chave }) => {
    visto = useResponsaveisTI(ativo, chave);
    return null;
  };
  const montar = async (ativo: boolean, chave: unknown, perfil = ADMIN, id = 1) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={sessao(perfil, id)}>
          <Leitor ativo={ativo} chave={chave} />
        </AuthContext.Provider>
      );
    });
  };

  it('a lista de uma abertura anterior não sobrescreve a desta', async () => {
    const antiga = adiada<ResponsavelTI[]>();
    const nova = adiada<ResponsavelTI[]>();
    listarResponsaveis.mockReturnValueOnce(antiga.promessa).mockReturnValueOnce(nova.promessa);

    await montar(true, 107);
    await montar(true, 108);
    await act(async () => nova.resolver([{ id: 10, nome: 'tecnico.ti' }]));
    await act(async () => antiga.resolver([{ id: 99, nome: 'de.outra.abertura' }]));

    expect(visto.estado).toBe('pronta');
    expect(visto.responsaveis).toEqual([{ id: 10, nome: 'tecnico.ti' }]);
  });

  it('de dois "recarregar", vale o último', async () => {
    const primeiro = adiada<ResponsavelTI[]>();
    const segundo = adiada<ResponsavelTI[]>();
    listarResponsaveis.mockResolvedValueOnce(LISTA);
    await montar(true, 107);

    listarResponsaveis.mockReturnValueOnce(primeiro.promessa).mockReturnValueOnce(segundo.promessa);
    await act(async () => {
      void visto.recarregar();
      void visto.recarregar();
    });
    await act(async () => segundo.resolver([{ id: 65, nome: 'aaa.tecnico.ti' }]));
    await act(async () => primeiro.rejeitar({ response: { status: 500 } }));

    expect(visto.estado).toBe('pronta');
    expect(visto.responsaveis).toEqual([{ id: 65, nome: 'aaa.tecnico.ti' }]);
  });

  it('troca de sessão: a resposta da conta anterior é descartada', async () => {
    const antiga = adiada<ResponsavelTI[]>();
    listarResponsaveis.mockReturnValueOnce(antiga.promessa).mockResolvedValueOnce([]);
    await montar(true, 107, ADMIN, 1);
    await montar(true, 107, TI, 2);
    await act(async () => antiga.resolver(LISTA));
    expect(visto.responsaveis).toEqual([]);
  });

  it('o hook confere a permissão sozinho: ativo sem permissão não pede', async () => {
    for (const perfil of [QUALIDADE, USUARIO]) {
      listarResponsaveis.mockClear();
      await montar(true, `aberta-${perfil.role}-${perfil.integra_equipe_ti}`, perfil);
      expect(listarResponsaveis).not.toHaveBeenCalled();
      expect(visto.estado).toBe('ociosa');
      await act(async () => visto.recarregar());
      expect(listarResponsaveis).not.toHaveBeenCalled();
    }
  });

  it('desativado no meio do pedido: a resposta não volta a aparecer', async () => {
    const pendente = adiada<ResponsavelTI[]>();
    listarResponsaveis.mockReturnValueOnce(pendente.promessa);
    await montar(true, 107);
    await montar(false, 107);
    await act(async () => pendente.resolver(LISTA));
    expect(visto.estado).toBe('ociosa');
    expect(visto.responsaveis).toEqual([]);
  });
});
