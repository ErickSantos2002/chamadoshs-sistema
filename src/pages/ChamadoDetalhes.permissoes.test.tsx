import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
import { Chamado, SetorDestinoEnum, StatusEnum, Usuario } from '../types/api';
import ChamadoDetalhes from './ChamadoDetalhes';
import ChamadoModal from '../components/ChamadoModal';

/**
 * C2 — o que cada conta recebe num chamado que ela LÊ (FE-5 × API-11).
 *
 * Ler não é alterar. A página oferecia "Editar", "Arquivar" e as ações
 * rápidas pelo perfil Técnico, e o técnico que lia o chamado só por ser o
 * responsável levava 403 em cada clique. A matriz abaixo é a da API
 * (`pode_alterar_como_equipe`, `is_admin_humano`, `integra_equipe_ti`, o
 * solicitante): cada conta, cada ação. Em todas a tela recebe o chamado —
 * quem não o lê nem chega a esta página (404, `lib/acesso`).
 *
 * Contas fictícias; os ids não existem em lugar nenhum.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

type Conta = {
  id: number;
  role: string;
  integra_equipe_ti?: boolean;
  conta_de_servico?: boolean;
};

const SOLICITANTE = 50;
const RESPONSAVEL = 60;
const EX_RESPONSAVEL = 61;
const ATENDENTE_DA_QUALIDADE = 3;

const CONTAS: Record<string, Conta> = {
  'administrador humano': { id: 1, role: 'Administrador', integra_equipe_ti: false, conta_de_servico: false },
  'técnico humano TI': { id: 2, role: 'Tecnico', integra_equipe_ti: true },
  'técnico humano Qualidade': { id: ATENDENTE_DA_QUALIDADE, role: 'Tecnico', integra_equipe_ti: false },
  'técnico humano de outro setor': { id: 4, role: 'Tecnico', integra_equipe_ti: false },
  'técnico humano sem setor': { id: 5, role: 'Tecnico', integra_equipe_ti: false },
  'usuário comum': { id: 6, role: 'Usuario', integra_equipe_ti: false },
  solicitante: { id: SOLICITANTE, role: 'Usuario', integra_equipe_ti: false },
  'responsável atual (técnico de outro setor)': { id: RESPONSAVEL, role: 'Tecnico', integra_equipe_ti: false },
  'ex-responsável': { id: EX_RESPONSAVEL, role: 'Tecnico', integra_equipe_ti: false },
  // A API-10 tira a conta de serviço da equipe: `integra_equipe_ti` vem falso.
  'conta de serviço Técnica TI': { id: 70, role: 'Tecnico', integra_equipe_ti: false },
  'conta de serviço Técnica de outro setor': { id: 71, role: 'Tecnico', integra_equipe_ti: false },
  'conta de serviço Administradora': { id: 72, role: 'Administrador', integra_equipe_ti: false, conta_de_servico: true },
  'conta de serviço Usuário': { id: 73, role: 'Usuario', integra_equipe_ti: false },
};

/**
 * Quem altera como equipe em cada setor, pela API-11 e pela API-13: cada
 * equipe no seu setor (até a API-12 o técnico da TI também alterava os da
 * Qualidade). O interno segue a mesma regra, no setor do chamado.
 */
const EQUIPE_TI = ['administrador humano', 'técnico humano TI'];
const EQUIPE_QUALIDADE = ['administrador humano', 'técnico humano Qualidade'];
const INTERNO = EQUIPE_TI;

const BASE = {
  id: 1,
  titulo: 'Chamado fictício da matriz',
  protocolo: 'CHAM-2026-0901',
  descricao: 'Descrição fictícia.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: SOLICITANTE,
  tecnico_responsavel_id: RESPONSAVEL,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.TI,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-11-01T10:00:00',
  versao: 4,
} as unknown as Chamado;

const sessao = (conta: Conta) =>
  ({
    user: { username: `conta${conta.id}`, ...conta },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: true,
    falhaAoConfirmar: false,
    confirmacaoRecusada: false,
    revalidando: false,
    revalidarIdentidade: async () => {},
  }) as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;
let noServidor: Chamado;

const montarPagina = async (conta: Conta, extra: Partial<Chamado> = {}) => {
  noServidor = { ...BASE, ...extra } as Chamado;
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(conta)}>
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

const montarModal = async (conta: Conta, extra: Partial<Chamado> = {}) => {
  noServidor = { ...BASE, ...extra } as Chamado;
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(conta)}>
        <ThemeProvider>
          <ChamadosProvider>
            <MemoryRouter>
              <ChamadoModal chamadoId={1} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </MemoryRouter>
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
};

const remontar = () => {
  act(() => root.unmount());
  root = createRoot(host);
};

const botoes = () => Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
const tem = (t: string) => botoes().includes(t);
const texto = () => document.body.textContent ?? '';
const campoDeComentario = () => document.querySelector('textarea[aria-label="Novo comentário"]');
const opcaoInterno = () =>
  Array.from(document.querySelectorAll('label')).some((l) => l.textContent?.includes('Comentário interno'));

beforeEach(() => {
  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async () => noServidor);
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 405,
    dados: { detail: 'Method Not Allowed' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([
    { id: ATENDENTE_DA_QUALIDADE, nome: 'Atendente fictícia' },
  ]);
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([{ id: 2, nome: 'TI fictícia' }]);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: SOLICITANTE, nome: 'Solicitante fictícia', role_id: 3, ativo: true } as Usuario,
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

describe('C2 — chamado da TI, aberto: 13 contas × ações', () => {
  for (const [nome, conta] of Object.entries(CONTAS)) {
    const equipe = EQUIPE_TI.includes(nome);
    const solicitante = conta.id === SOLICITANTE;
    it(`${nome}: equipe ${equipe}, cancela ${equipe || solicitante}, interno ${INTERNO.includes(nome)}`, async () => {
      await montarPagina(conta);

      // Visualizar e comentar em público: todos que leem.
      expect(texto()).toContain('Chamado fictício da matriz');
      expect(campoDeComentario()).toBeTruthy();

      // Atribuir, status, prioridade e solução moram na edição e nas ações
      // rápidas — as duas são da equipe.
      expect(tem('Editar Detalhes')).toBe(equipe);
      expect(texto().includes('Ações Rápidas')).toBe(equipe);

      // Arquivar é da equipe; cancelar, da equipe e do solicitante.
      expect(tem('Arquivar')).toBe(equipe);
      expect(tem('Cancelar Chamado')).toBe(equipe || solicitante);

      // Interno: administrador humano e TI.
      expect(opcaoInterno()).toBe(INTERNO.includes(nome));

      // Excluir não aparece em chamado no fluxo, para ninguém.
      expect(tem('Excluir')).toBe(false);
    });
  }
});

describe('C2 — chamado da Qualidade: a segregação dela', () => {
  for (const [nome, conta] of Object.entries(CONTAS)) {
    const equipe = EQUIPE_QUALIDADE.includes(nome);
    it(`${nome}: edita e arquiva → ${equipe}`, async () => {
      await montarPagina(conta, { setor_destino: SetorDestinoEnum.QUALIDADE });
      expect(texto()).toContain('Chamado fictício da matriz');
      expect(tem('Editar Detalhes')).toBe(equipe);
      expect(tem('Arquivar')).toBe(equipe);
      // O interno é da equipe da Qualidade aqui, e não da TI (API-13).
      expect(opcaoInterno()).toBe(equipe);
    });
  }
});

describe('C2 — arquivado: desarquivar é da equipe', () => {
  for (const [nome, conta] of Object.entries(CONTAS)) {
    const equipe = EQUIPE_TI.includes(nome);
    it(`${nome}: desarquiva → ${equipe}; exclui → ${nome === 'administrador humano'}`, async () => {
      await montarPagina(conta, { arquivado: true });
      expect(tem('Desarquivar')).toBe(equipe);
      // Excluir: administrador HUMANO, e só fora do fluxo (`require_admin`).
      expect(tem('Excluir')).toBe(nome === 'administrador humano');
    });
  }
});

describe('C2 — resolvido: avaliar é só do solicitante', () => {
  for (const [nome, conta] of Object.entries(CONTAS)) {
    const avalia = conta.id === SOLICITANTE;
    it(`${nome}: avalia → ${avalia}`, async () => {
      await montarPagina(conta, { status: StatusEnum.RESOLVIDO, solucao: 'Resolvido de forma fictícia.' });
      const estrelas = document.querySelectorAll('[aria-label^="Avaliar com"]');
      expect(estrelas.length > 0).toBe(avalia);
    });
  }
});

describe('C2 — o modal do quadro: atribuir é da equipe', () => {
  for (const [nome, conta] of Object.entries(CONTAS)) {
    const equipe = EQUIPE_TI.includes(nome);
    it(`${nome}: seletor de responsável editável → ${equipe}`, async () => {
      await montarModal(conta);
      expect(texto()).toContain('Chamado fictício da matriz');
      const seletor = Array.from(document.querySelectorAll('[role="combobox"]')).find((s) =>
        (s.getAttribute('aria-label') ?? s.closest('div')?.textContent ?? '').includes('Respons')
      );
      expect(Boolean(seletor)).toBe(equipe);
      // A lista da API-9 só é pedida por quem pode trocar.
      expect(vi.mocked(chamadosService.listarResponsaveisTI).mock.calls.length > 0).toBe(equipe);
      remontar();
    });
  }
});

describe('C2 — sem confirmação vigente, a escrita de equipe é suspensa; a do solicitante, não', () => {
  it('técnico da TI com a revalidação falha: sem Editar, sem Arquivar', async () => {
    noServidor = BASE;
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ ...sessao(CONTAS['técnico humano TI']), falhaAoConfirmar: true }}>
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
    expect(tem('Editar Detalhes')).toBe(false);
    expect(tem('Arquivar')).toBe(false);
  });

  it('solicitante com a revalidação falha: continua podendo cancelar o que abriu', async () => {
    noServidor = BASE;
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ ...sessao(CONTAS.solicitante), falhaAoConfirmar: true }}>
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
    expect(tem('Cancelar Chamado')).toBe(true);
  });
});
