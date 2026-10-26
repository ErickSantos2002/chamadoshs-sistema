import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { computeAccessibleName } from 'dom-accessibility-api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useChamados } from '../hooks/useChamados';
import {
  categoriasService,
  chamadosService,
  tarefasRecorrentesService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, PrioridadeEnum, StatusEnum, Usuario } from '../types/api';
import { _esquecerAvisos } from '../lib/setor';
import Chamados from './Chamados';

/**
 * O quadro montado de verdade, e o filtro por setor dentro da cadeia que já
 * existia.
 *
 * O filtro novo é mais UMA condição: não pode mexer em prioridade, categoria,
 * responsável, busca nem no escopo de arquivados e cancelados. Por isso os
 * casos aqui combinam o setor com cada um deles, em vez de testá-lo sozinho.
 *
 * E o quadro contra a API antiga — que é a que está no ar — tem que sair
 * igual ao de antes: sem seletor novo, com as mesmas contagens.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const base = {
  descricao: 'x',
  status: StatusEnum.ABERTO,
  solicitante_id: 1,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
};

/** Um chamado por combinação que os filtros precisam separar. */
const ti = { ...base, id: 1, protocolo: 'P-1', titulo: 'Impressora', prioridade: PrioridadeEnum.ALTA, categoria_id: 1, tecnico_responsavel_id: 3, setor_destino: 'TI' };
const antigo = { ...base, id: 2, protocolo: 'P-2', titulo: 'Rede lenta', prioridade: PrioridadeEnum.BAIXA, categoria_id: 2 };
const qualAlta = { ...base, id: 3, protocolo: 'P-3', titulo: 'Auditoria ISO', prioridade: PrioridadeEnum.ALTA, categoria_id: 1, tecnico_responsavel_id: 3, setor_destino: 'QUALIDADE' };
const qualBaixa = { ...base, id: 4, protocolo: 'P-4', titulo: 'Calibração', prioridade: PrioridadeEnum.BAIXA, categoria_id: 2, setor_destino: 'QUALIDADE' };
const estranho = { ...base, id: 5, protocolo: 'P-5', titulo: 'Setor estranho', prioridade: PrioridadeEnum.ALTA, categoria_id: 1, setor_destino: 'RH' };
const qualCancelado = { ...base, id: 6, protocolo: 'P-6', titulo: 'Desvio cancelado', prioridade: PrioridadeEnum.ALTA, categoria_id: 1, cancelado: true, setor_destino: 'QUALIDADE' };

const MISTURADO = [ti, antigo, qualAlta, qualBaixa, estranho, qualCancelado] as unknown as Chamado[];

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
let listarTodos: MockInstance<typeof chamadosService.listarTodos>;
let recarregar: () => Promise<void>;

const Sonda: React.FC = () => {
  recarregar = useChamados().carregarChamados;
  return null;
};

const montar = async (chamados: Chamado[], role = 'Administrador') => {
  listarTodos.mockResolvedValue(chamados);
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(role)}>
        <ThemeProvider>
          <ChamadosProvider>
            <MemoryRouter>
              <Sonda />
              <Chamados />
            </MemoryRouter>
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
};

/** Os títulos dos cartões na tela, em ordem de protocolo. */
const naTela = (): string[] => {
  const titulos = Array.from(document.querySelectorAll('article h4')).map(
    (h) => h.textContent ?? ''
  );
  return MISTURADO.filter((c) => titulos.some((t) => t.includes(c.titulo))).map(
    (c) => c.titulo
  );
};

const seletor = (nome: string): HTMLElement | undefined =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="combobox"]')).find((s) =>
    computeAccessibleName(s).includes(nome)
  );

const escolher = async (nome: string, opcao: string) => {
  const gatilho = seletor(nome);
  expect(gatilho, `seletor "${nome}" não apareceu`).toBeTruthy();
  await act(async () => {
    gatilho!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.trim() === opcao
  );
  expect(alvo, `opção "${opcao}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const buscar = async (termo: string) => {
  const campo = document.querySelector<HTMLInputElement>('input[type="search"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, termo);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const clicar = async (texto: string) => {
  const botao = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto
  );
  expect(botao, `botão "${texto}" não apareceu`).toBeTruthy();
  await act(async () => {
    botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const cabecalho = () => document.querySelector('h1')?.nextElementSibling?.textContent ?? '';

beforeEach(() => {
  _esquecerAvisos();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  listarTodos = vi.spyOn(chamadosService, 'listarTodos');
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([
    { id: 1, nome: 'Hardware', ativo: true },
    { id: 2, nome: 'Rede', ativo: true },
  ] as never);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 3, nome: 'Lidisay', role_id: 2, ativo: true } as Usuario,
  ]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(tarefasRecorrentesService, 'listar').mockResolvedValue([]);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('quadro contra a API antiga (cenário A)', () => {
  const SEM_CAMPO = [antigo, { ...antigo, id: 7, protocolo: 'P-7', titulo: 'Outro' }] as unknown as Chamado[];

  it('não mostra seletor de setor', async () => {
    await montar(SEM_CAMPO);
    expect(seletor('Filtrar por categoria'), 'a página não montou').toBeTruthy();
    expect(seletor('setor')).toBeUndefined();
  });

  it('a contagem do cabeçalho não muda', async () => {
    await montar(SEM_CAMPO);
    expect(cabecalho()).toBe('2 chamados');
  });

  it('nenhum cartão ganha selo de setor', async () => {
    await montar(SEM_CAMPO);
    expect(document.body.textContent).not.toContain('Setor');
  });

  /** FD-3: o filtro é do navegador. A API no ar ignoraria o parâmetro. */
  it('a requisição não leva setor_destino', async () => {
    await montar(SEM_CAMPO);
    for (const [params] of listarTodos.mock.calls) {
      expect(params).not.toHaveProperty('setor_destino');
    }
  });
});

describe('quadro com TI explícito (cenário B)', () => {
  it('igual ao antigo: sem seletor, sem selo', async () => {
    await montar([ti, { ...ti, id: 8, protocolo: 'P-8' }] as unknown as Chamado[]);
    expect(seletor('Filtrar por categoria')).toBeTruthy();
    expect(seletor('setor')).toBeUndefined();
    expect(document.body.textContent).not.toContain('Qualidade');
  });
});

describe('quadro com TI e Qualidade (cenário C)', () => {
  it('mostra o seletor de setor', async () => {
    await montar(MISTURADO);
    expect(seletor('Filtrar por setor')).toBeTruthy();
  });

  it('"todos" mostra os dois setores e o desconhecido; fora do fluxo segue fora', async () => {
    await montar(MISTURADO);
    expect(naTela()).toEqual(['Impressora', 'Rede lenta', 'Auditoria ISO', 'Calibração', 'Setor estranho']);
  });

  it('Qualidade não traz TI, nem antigo, nem desconhecido', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    expect(naTela()).toEqual(['Auditoria ISO', 'Calibração']);
  });

  it('TI traz o explícito e o antigo, e não Qualidade nem desconhecido', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'TI');
    expect(naTela()).toEqual(['Impressora', 'Rede lenta']);
  });

  it('a contagem do cabeçalho acompanha o recorte', async () => {
    await montar(MISTURADO);
    expect(cabecalho()).toBe('5 chamados');
    await escolher('Filtrar por setor', 'Qualidade');
    expect(cabecalho()).toBe('2 de 5 chamados');
  });

  it('combina com prioridade', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    await escolher('Filtrar por prioridade', PrioridadeEnum.ALTA);
    expect(naTela()).toEqual(['Auditoria ISO']);
  });

  it('combina com categoria', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'TI');
    await escolher('Filtrar por categoria', 'Rede');
    expect(naTela()).toEqual(['Rede lenta']);
  });

  it('combina com responsável', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    await escolher('Filtrar por responsável', 'Lidisay');
    expect(naTela()).toEqual(['Auditoria ISO']);
  });

  it('combina com a busca', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'TI');
    await buscar('rede');
    expect(naTela()).toEqual(['Rede lenta']);
  });

  /**
   * A busca atravessa o escopo — é a regra que já existia, e o setor não a
   * desfaz: buscar um protocolo cancelado de Qualidade com o filtro em
   * Qualidade continua achando o chamado.
   */
  it('a busca segue atravessando o escopo, com o setor ligado', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    await buscar('P-6');
    expect(naTela()).toEqual(['Desvio cancelado']);

    await escolher('Filtrar por setor', 'TI');
    expect(naTela()).toEqual([]);
  });

  it('combina com o interruptor de arquivados e cancelados', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    await clicar('Mostrar arquivados e cancelados');
    expect(naTela()).toEqual(['Auditoria ISO', 'Calibração', 'Desvio cancelado']);
  });

  it('"Limpar" volta o setor para todos e não mexe no interruptor', async () => {
    await montar(MISTURADO);
    await clicar('Mostrar arquivados e cancelados');
    await escolher('Filtrar por setor', 'Qualidade');
    await escolher('Filtrar por prioridade', PrioridadeEnum.ALTA);

    await clicar('Limpar');

    expect(computeAccessibleName(seletor('Filtrar por setor')!)).toContain('Todos os setores');
    expect(naTela()).toEqual(MISTURADO.map((c) => c.titulo));
    expect(
      Array.from(document.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Ocultar arquivados e cancelados'
      )
    ).toBe(true);
  });

  it('só o setor ligado já acende o "Limpar"', async () => {
    await montar(MISTURADO);
    expect(document.body.textContent).not.toContain('Limpar');
    await escolher('Filtrar por setor', 'Qualidade');
    expect(document.body.textContent).toContain('Limpar');
  });

  it('o seletor não some quando o recorte zera', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    await buscar('nada com este nome');
    expect(naTela()).toEqual([]);
    expect(seletor('Filtrar por setor')).toBeTruthy();
  });

  /**
   * O caso que a visibilidade "só quando há mistura" erraria: o filtro está
   * em Qualidade e a recarga traz só TI. Sem seletor, a pessoa olharia um
   * quadro vazio sem ter como desligar o recorte que o esvaziou.
   */
  it('com o filtro ligado, o seletor fica mesmo se a mistura acabar', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');

    listarTodos.mockResolvedValue([ti, antigo] as unknown as Chamado[]);
    await act(async () => {
      await recarregar();
    });

    expect(naTela()).toEqual([]);
    expect(seletor('Filtrar por setor')).toBeTruthy();
    expect(document.body.textContent).toContain('Limpar');
  });

  it('a requisição não leva setor_destino, nem com o filtro ligado', async () => {
    await montar(MISTURADO);
    await escolher('Filtrar por setor', 'Qualidade');
    await act(async () => {
      await recarregar();
    });
    expect(listarTodos.mock.calls.length).toBeGreaterThan(0);
    for (const [params] of listarTodos.mock.calls) {
      expect(params).not.toHaveProperty('setor_destino');
    }
  });
});

describe('perfil Usuario', () => {
  it('continua pedindo só os próprios chamados, e o setor filtra por cima', async () => {
    await montar(MISTURADO, 'Usuario');
    for (const [params] of listarTodos.mock.calls) {
      expect(params).toMatchObject({ solicitante_id: 1 });
      expect(params).not.toHaveProperty('setor_destino');
    }
    await escolher('Filtrar por setor', 'Qualidade');
    expect(naTela()).toEqual(['Auditoria ISO', 'Calibração']);
  });

  it('não ganha o filtro por responsável', async () => {
    await montar(MISTURADO, 'Usuario');
    expect(seletor('Filtrar por responsável')).toBeUndefined();
  });
});
