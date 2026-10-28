import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
import { Chamado, StatusEnum, Usuario } from '../types/api';
import ChamadoDetalhes from './ChamadoDetalhes';

/**
 * A edição e as ações da página do chamado, num chamado da TI.
 *
 * ── A trava da TI ─────────────────────────────────────────────────────
 *
 * Estes casos descrevem a página ANTES do atendimento da Qualidade: o corpo
 * exato do PUT da edição (os quatro campos sempre, a solução só quando muda),
 * o PUT das ações rápidas, e quem vê o quê. A Qualidade ganha caminho próprio;
 * a TI fica como está, e é isso que se trava aqui.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Umbler sem funcionar',
  protocolo: 'CHAM-2026-0001',
  descricao: 'Não conecta.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 1,
  categoria_id: null,
  solucao: null,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
} as unknown as Chamado;

const sessao = (role: string) =>
  ({
    user: { id: 1, username: 'rickelme', role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;
let noServidor: Chamado;

const montar = async (extra: Partial<Chamado> = {}, role = 'Administrador') => {
  noServidor = { ...CHAMADO, ...extra } as Chamado;
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(role)}>
        <ThemeProvider>
          <ChamadosProvider>
            <MemoryRouter initialEntries={['/chamados/1']}>
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

const botao = (texto: string) =>
  Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);

const clicar = async (el: Element | undefined, oQue: string) => {
  expect(el, `${oQue} não apareceu`).toBeTruthy();
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const nomeAcessivel = (el: Element): string => {
  const ids = el.getAttribute('aria-labelledby');
  if (ids) {
    return ids
      .split(/\s+/)
      .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
  }
  return el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
};

const escolher = async (rotulo: string, opcao: string) => {
  const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
    nomeAcessivel(b).startsWith(rotulo)
  );
  await clicar(seletor, `seletor "${rotulo}"`);
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.trim() === opcao
  );
  await clicar(alvo, `opção "${opcao}" de "${rotulo}"`);
};

beforeEach(() => {
  // Nada sai sem mock: o `.env` local aponta para produção. A releitura
  // depois de salvar vai por `api.get` direto, e só ela é respondida.
  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/chamados/1') return { data: noServidor };
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async () => noServidor);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
    { id: 3, nome: 'tecnica', role_id: 2, ativo: true } as Usuario,
  ]);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe('TI — comentar durante a edição', () => {
  /**
   * Caracterização, não promessa: na TI a recarga do comentário continua
   * repondo os campos com o servidor, e o PUT continua completo. A correção
   * do M-2 é só da Qualidade, que tem a referência da edição segura.
   */
  it('a recarga repõe os campos, e o PUT segue completo', async () => {
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, dados) => ({ ...noServidor, ...dados }) as Chamado);
    vi.spyOn(comentariosService, 'criar').mockImplementation(
      async (d) => ({ id: 50, ...d }) as never
    );
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Alta');

    const campo = host.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    await act(async () => {
      setter.call(campo, 'Comentário no meio da edição.');
      campo!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clicar(botao('Enviar Comentário'), 'Enviar Comentário');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0]).toStrictEqual([
      1,
      {
        categoria_id: null,
        status: StatusEnum.EM_ANDAMENTO,
        prioridade: 'Média',
        tecnico_responsavel_id: 1,
      },
    ]);
  });
});

describe('TI — o PUT da edição', () => {
  it('manda os quatro campos, mesmo os que não mudaram, e relê da API', async () => {
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, dados) => ({ ...noServidor, ...dados }) as Chamado);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Prioridade', 'Alta');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0]).toStrictEqual([
      1,
      {
        categoria_id: null,
        status: StatusEnum.EM_ANDAMENTO,
        prioridade: 'Alta',
        tecnico_responsavel_id: 1,
      },
    ]);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/chamados/1');
  });

  it('salvar sem mexer em nada ainda manda o PUT completo', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0]).toStrictEqual([
      1,
      {
        categoria_id: null,
        status: StatusEnum.EM_ANDAMENTO,
        prioridade: 'Média',
        tecnico_responsavel_id: 1,
      },
    ]);
  });

  it('"Sem atribuição" manda null, não some do corpo', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    await escolher('Técnico responsável', 'Sem atribuição');
    await clicar(botao('Salvar'), 'Salvar');

    expect(atualizar.mock.calls[0][1]).toHaveProperty('tecnico_responsavel_id', null);
  });

  it('as opções de responsável são "Sem atribuição" e a equipe', async () => {
    await montar();
    await clicar(botao('Editar Detalhes'), 'Editar Detalhes');
    const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      nomeAcessivel(b).startsWith('Técnico responsável')
    );
    await clicar(seletor, 'seletor de responsável');
    const opcoes = Array.from(document.querySelectorAll('[role="option"]')).map((o) =>
      o.textContent?.trim()
    );
    expect(opcoes).toEqual(['Sem atribuição', 'rickelme', 'tecnica']);
  });
});

describe('TI — as ações rápidas da página', () => {
  it('mudar status manda só o status, pelo PUT', async () => {
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await montar();
    await clicar(botao('Aguardando Retorno'), 'Aguardando Retorno');

    expect(atualizar.mock.calls[0]).toStrictEqual([1, { status: StatusEnum.AGUARDANDO }]);
  });

  /**
   * D-12: a página não esconde as ações da equipe num chamado cancelado ou
   * arquivado. Fica como está — mexer nisso é outra decisão.
   */
  it('a equipe ainda vê as ações num chamado cancelado', async () => {
    await montar({ status: StatusEnum.ABERTO, cancelado: true });
    expect(botao('Iniciar Atendimento')).toBeTruthy();
  });

  it('e num arquivado', async () => {
    await montar({ status: StatusEnum.ABERTO, arquivado: true });
    expect(botao('Iniciar Atendimento')).toBeTruthy();
  });
});

describe('quem não é da equipe', () => {
  it('não vê edição nem ações rápidas', async () => {
    await montar({}, 'Usuario');
    // Confere que a página carregou, senão o caso passaria à toa.
    expect(host.textContent).toContain('Umbler sem funcionar');
    expect(botao('Editar Detalhes')).toBeUndefined();
    expect(host.textContent).not.toContain('Ações Rápidas');
  });
});
