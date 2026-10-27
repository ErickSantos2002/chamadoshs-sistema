import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useChamados } from '../hooks/useChamados';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, StatusEnum, Usuario } from '../types/api';
import toast from 'react-hot-toast';
import { MENSAGEM_QUALIDADE_INDISPONIVEL } from '../lib/atendimento';
import ChamadoModal from './ChamadoModal';

/**
 * A janela do chamado montada sobre o contexto de verdade.
 *
 * O que se prova aqui é a FIAÇÃO, que nenhum teste de unidade alcança: mudar o
 * status pela janela precisa mover o card no quadro atrás dela. O defeito
 * relatado era exatamente esta fiação faltando — a janela salvava pelo serviço,
 * o quadro lia do contexto, e as duas verdades só se encontravam num F5. A
 * mutação de cortar o aviso ao quadro sobrevivia ao teste do contexto sozinho.
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
  tecnico_responsavel_id: null,
  cancelado: false,
  arquivado: false,
} as unknown as Chamado;

const SESSAO = {
  user: { id: 1, username: 'rickelme', role: 'Administrador' },
  token: 'token-de-teste',
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
} as React.ContextType<typeof AuthContext>;

/** O quadro: o que a lista do contexto contém. */
let quadro: Array<{ id: number; status: StatusEnum }> = [];

const Sonda: React.FC = () => {
  const { chamados, carregarChamados } = useChamados();
  quadro = chamados.map((c) => ({ id: c.id, status: c.status }));
  // Guarda para o teste disparar a carga inicial.
  (Sonda as unknown as { carregar: () => Promise<void> }).carregar = carregarChamados;
  return null;
};

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([CHAMADO]);
  // Chamado da Qualidade faz o front sondar o atendimento (FE-3). Sem mock,
  // a sonda iria ao VITE_API_URL do `.env` — que é a produção.
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 404,
    dados: { detail: 'Not Found' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([]);
  // O modal monta antes de a lista carregar; o cache-miss cai em `buscar`.
  vi.spyOn(chamadosService, 'buscar').mockResolvedValue(CHAMADO);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
  ]);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root.render(
      <AuthContext.Provider value={SESSAO}>
        <ThemeProvider>
          <ChamadosProvider>
            <Sonda />
            <ChamadoModal chamadoId={1} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });

  await act(async () => {
    await (Sonda as unknown as { carregar: () => Promise<void> }).carregar();
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ChamadoModal e o quadro', () => {
  it('o quadro parte do status original', () => {
    expect(quadro).toEqual([{ id: 1, status: StatusEnum.EM_ANDAMENTO }]);
  });

  // O relato do usuário: "preciso carregar a página para ele se mover".
  it('mudar o status pela janela move o card no quadro, sem recarga', async () => {
    const resolvido = { ...CHAMADO, status: StatusEnum.AGUARDANDO } as Chamado;
    vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(resolvido);

    // O botão "Aguardando retorno" das ações rápidas, clicado de verdade.
    const botao = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Aguardando retorno')
    );
    expect(botao, 'botão de ação rápida não apareceu').toBeTruthy();

    await act(async () => {
      botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(quadro).toEqual([{ id: 1, status: StatusEnum.AGUARDANDO }]);
  });

  it('atribuir responsável pela janela também chega ao quadro', async () => {
    const atribuido = { ...CHAMADO, tecnico_responsavel_id: 1 } as Chamado;
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockResolvedValue(atribuido);

    // Abre o seletor de responsável e escolhe a única pessoa da lista.
    //
    // Procurado pelo NOME ACESSÍVEL, resolvido como o navegador resolve, e não
    // por um atributo específico. A primeira versão procurava
    // `aria-label === 'Responsável'` e quebrou quando o `Seletor` deixou de
    // usar `aria-label` — que era justamente o conserto, porque `aria-label`
    // apagava o valor escolhido do nome.
    //
    // Um teste que procura pela costura reprova quando a costura melhora. Este
    // procura pelo que a pessoa ouviria.
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

    const seletor = Array.from(
      document.querySelectorAll('[role="combobox"]')
    ).find((b) => nomeAcessivel(b).includes('Responsável')) as
      | HTMLElement
      | undefined;
    expect(seletor, 'seletor de responsável não apareceu').toBeTruthy();

    await act(async () => {
      seletor!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const opcao = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.includes('rickelme')
    );
    expect(opcao, 'opção de técnico não apareceu').toBeTruthy();

    await act(async () => {
      opcao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(atualizar).toHaveBeenCalledWith(1, { tecnico_responsavel_id: 1 });
  });

  /** Na TI, tirar o responsável é escolha válida, e viaja como `null`. */
  it('"Sem atribuição" manda null', async () => {
    vi.spyOn(chamadosService, 'buscar').mockResolvedValue({
      ...CHAMADO,
      id: 3,
      tecnico_responsavel_id: 1,
    } as Chamado);
    const atualizar = vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(CHAMADO);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={SESSAO}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={3} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });

    const seletor = Array.from(document.querySelectorAll('[role="combobox"]')).find((b) =>
      (b.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .some((i) => document.getElementById(i)?.textContent?.includes('Responsável'))
    ) as HTMLElement | undefined;
    expect(seletor, 'seletor de responsável não apareceu').toBeTruthy();
    await act(async () => {
      seletor!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const opcao = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.trim() === 'Sem atribuição'
    );
    expect(opcao, 'opção "Sem atribuição" não apareceu').toBeTruthy();
    await act(async () => {
      opcao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(atualizar.mock.calls).toStrictEqual([[3, { tecnico_responsavel_id: null }]]);
  });
});

describe('ChamadoModal — o setor de destino', () => {
  /**
   * Reabre a janela num chamado que não está no quadro (id 2), para o
   * cache-miss cair no `buscar` com o setor da vez.
   */
  const abrirComSetor = async (extra: Record<string, unknown>) => {
    vi.spyOn(chamadosService, 'buscar').mockResolvedValue({
      ...CHAMADO,
      id: 2,
      ...extra,
    } as Chamado);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={SESSAO}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={2} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
  };

  const texto = () => document.body.textContent ?? '';

  // A janela mostra o setor SEMPRE, inclusive TI — é onde se confere.
  it('API antiga, sem o campo: mostra TI', () => {
    expect(texto()).toContain('Setor de destino: TI');
  });

  it('TI explícito: mostra TI', async () => {
    await abrirComSetor({ setor_destino: 'TI' });
    expect(texto()).toContain('Setor de destino: TI');
  });

  it('Qualidade: mostra Qualidade', async () => {
    await abrirComSetor({ setor_destino: 'QUALIDADE' });
    expect(texto()).toContain('Setor de destino: Qualidade');
    expect(texto()).not.toContain('Setor de destino: TI');
  });

  it('valor desconhecido: selo neutro com o que chegou, e não TI', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await abrirComSetor({ setor_destino: '<b>RH</b>' });
    // O selo montado avisa — e uma vez só, mesmo redesenhando.
    await abrirComSetor({ setor_destino: '<b>RH</b>' });
    const doSetor = aviso.mock.calls.filter(([m]) => String(m).startsWith('[setor]'));
    expect(doSetor).toHaveLength(1);
    expect(doSetor[0][0]).toContain('chamado 2');
    expect(texto()).toContain('Setor não reconhecido: <b>RH</b>');
    // Como texto: não virou elemento.
    expect(document.querySelector('b')).toBeNull();
    expect(texto()).not.toContain('Setor de destino: TI');
  });

  it('o selo fica junto do status e da prioridade', async () => {
    await abrirComSetor({ setor_destino: 'QUALIDADE' });
    const selo = Array.from(document.querySelectorAll('span')).find(
      (s) => s.textContent === 'Setor de destino: Qualidade'
    );
    expect(selo, 'selo de setor não apareceu').toBeTruthy();
    expect(selo!.parentElement!.textContent).toContain('Em Andamento');
    expect(selo!.parentElement!.textContent).toContain('Média');
  });
});

/**
 * FE-3: quem atende a Qualidade usa a janela como a equipe usa — o PATCH
 * restrito, e o card do quadro anda junto.
 */
describe('ChamadoModal — atendimento da Qualidade', () => {
  const QUAL = {
    ...CHAMADO,
    id: 4,
    setor_destino: 'QUALIDADE',
    tecnico_responsavel_id: 7,
  } as unknown as Chamado;

  const USUARIO = {
    ...SESSAO,
    user: { id: 7, username: 'ana', role: 'Usuario' },
  } as React.ContextType<typeof AuthContext>;

  /**
   * Recusa por algo que a janela não sabia (aqui, 409 de arquivado): ela relê
   * o chamado pela API, sem o cache do contexto, e as ações somem.
   */
  it('recusa com conflito: a janela relê o chamado e esconde as ações', async () => {
    act(() => root.unmount());
    root = createRoot(host);
    vi.mocked(chamadosService.listarTodos).mockResolvedValue([]);
    vi.mocked(chamadosService.buscar).mockResolvedValue(QUAL);
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 405,
      dados: { detail: 'Method Not Allowed' },
    });
    vi.mocked(chamadosService.listarAtendentesQualidade).mockResolvedValue([{ id: 7, nome: 'Ana' }]);
    vi.spyOn(chamadosService, 'atender').mockRejectedValue({
      response: { status: 409, data: { detail: 'Chamado arquivado não pode ser atendido' } },
    });
    vi.spyOn(toast, 'error').mockImplementation(() => '');

    await act(async () => {
      root.render(
        <AuthContext.Provider value={USUARIO}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={4} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
    // Outra pessoa arquivou depois que a janela abriu.
    vi.mocked(chamadosService.buscar).mockResolvedValue({ ...QUAL, arquivado: true } as Chamado);
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    const botao = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aguardando retorno'
    );
    expect(botao, 'ação do atendimento não apareceu').toBeTruthy();
    await act(async () => {
      botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leituras + 1);
    expect(document.body.textContent).toContain('Arquivado');
    expect(
      Array.from(document.querySelectorAll('button')).some(
        (b) => b.textContent?.trim() === 'Aguardando retorno'
      )
    ).toBe(false);
  });

  it('o usuário responsável atende pela janela, e o quadro acompanha', async () => {
    act(() => root.unmount());
    root = createRoot(host);
    vi.mocked(chamadosService.listarTodos).mockResolvedValue([QUAL]);
    vi.mocked(chamadosService.buscar).mockResolvedValue(QUAL);
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 405,
      dados: { detail: 'Method Not Allowed' },
    });
    vi.mocked(chamadosService.listarAtendentesQualidade).mockResolvedValue([{ id: 7, nome: 'Ana' }]);
    const atender = vi
      .spyOn(chamadosService, 'atender')
      .mockResolvedValue({ ...QUAL, status: StatusEnum.AGUARDANDO } as Chamado);
    const atualizar = vi.spyOn(chamadosService, 'atualizar');

    await act(async () => {
      root.render(
        <AuthContext.Provider value={USUARIO}>
          <ThemeProvider>
            <ChamadosProvider>
              <Sonda />
              <ChamadoModal chamadoId={4} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
    await act(async () => {
      await (Sonda as unknown as { carregar: () => Promise<void> }).carregar();
    });

    const botao = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aguardando retorno'
    );
    expect(botao, 'ação do atendimento não apareceu').toBeTruthy();
    await act(async () => {
      botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(atender.mock.calls).toStrictEqual([[4, { status: StatusEnum.AGUARDANDO }]]);
    expect(atualizar).not.toHaveBeenCalled();
    expect(quadro).toEqual([{ id: 4, status: StatusEnum.AGUARDANDO }]);
  });
});

/**
 * FE-3: na Qualidade o seletor de responsável é o dos atendentes. Sem
 * "Sem atribuição", sem null, e o responsável atual fora da lista continua
 * como escolha até alguém trocar.
 */
describe('ChamadoModal — reatribuição na Qualidade', () => {
  const QUAL = {
    ...CHAMADO,
    id: 5,
    setor_destino: 'QUALIDADE',
    tecnico_responsavel_id: 7,
  } as unknown as Chamado;

  const abrir = async (extra: Partial<Chamado> = {}) => {
    vi.mocked(chamadosService.buscar).mockResolvedValue({ ...QUAL, ...extra } as Chamado);
    act(() => root.unmount());
    root = createRoot(host);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={SESSAO}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={5} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
  };

  const seletorDoResponsavel = () =>
    Array.from(document.querySelectorAll('[role="combobox"]')).find((b) =>
      (b.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .some((i) => document.getElementById(i)?.textContent?.includes('Responsável'))
    ) as HTMLElement | undefined;

  const abrirOpcoes = async () => {
    const s = seletorDoResponsavel();
    expect(s, 'seletor de responsável não apareceu').toBeTruthy();
    await act(async () => {
      s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    return Array.from(document.querySelectorAll('[role="option"]'));
  };

  const escolherOpcao = async (texto: string) => {
    const alvo = (await abrirOpcoes()).find((o) => o.textContent?.trim() === texto);
    expect(alvo, `opção "${texto}" não apareceu`).toBeTruthy();
    await act(async () => {
      alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  let atualizar: MockInstance<typeof chamadosService.atualizar>;
  let erro: MockInstance<typeof toast.error>;

  beforeEach(() => {
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 405,
      dados: { detail: 'Method Not Allowed' },
    });
    vi.mocked(chamadosService.listarAtendentesQualidade).mockResolvedValue([
      { id: 7, nome: 'Ana' },
      { id: 3, nome: 'Bia' },
    ]);
    atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (_id, d) => ({ ...QUAL, ...d }) as Chamado);
    erro = vi.spyOn(toast, 'error').mockImplementation(() => '');
  });

  it('as opções são os atendentes, sem "Sem atribuição"', async () => {
    await abrir();
    const opcoes = (await abrirOpcoes()).map((o) => o.textContent?.trim());
    expect(opcoes).toEqual(['Ana', 'Bia']);
  });

  it('trocar manda só o novo responsável', async () => {
    await abrir();
    await escolherOpcao('Bia');
    expect(atualizar.mock.calls).toStrictEqual([[5, { tecnico_responsavel_id: 3 }]]);
  });

  it('escolher quem já está não faz requisição', async () => {
    await abrir();
    await escolherOpcao('Ana');
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('responsável fora dos atendentes: continua marcado, sem troca automática', async () => {
    await abrir({ tecnico_responsavel_id: 12 });
    expect(seletorDoResponsavel()?.textContent).toContain('Usuário #12 (fora dos atendentes)');
    const opcoes = (await abrirOpcoes()).map((o) => o.textContent?.trim());
    expect(opcoes).toEqual(['Usuário #12 (fora dos atendentes)', 'Ana', 'Bia']);
    expect(atualizar).not.toHaveBeenCalled();
  });

  it('400: mostra o motivo e recarrega os atendentes', async () => {
    atualizar.mockRejectedValue({
      response: { status: 400, data: { detail: 'Atendente não é elegível para a Qualidade' } },
    });
    await abrir();
    const antes = vi.mocked(chamadosService.listarAtendentesQualidade).mock.calls.length;
    await escolherOpcao('Bia');
    expect(erro).toHaveBeenCalledWith('Atendente não é elegível para a Qualidade');
    expect(vi.mocked(chamadosService.listarAtendentesQualidade).mock.calls.length).toBe(antes + 1);
  });

  it('503: avisa e o campo vira só leitura', async () => {
    atualizar.mockRejectedValue({ response: { status: 503, data: { detail: 'x' } } });
    await abrir();
    await escolherOpcao('Bia');
    expect(erro).toHaveBeenCalledWith(MENSAGEM_QUALIDADE_INDISPONIVEL);
    expect(seletorDoResponsavel()).toBeUndefined();
  });

  it('API sem a rota: só leitura, sem seletor', async () => {
    vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
      status: 404,
      dados: { detail: 'Not Found' },
    });
    await abrir();
    expect(document.body.textContent).toContain('Setor de destino: Qualidade');
    expect(seletorDoResponsavel()).toBeUndefined();
  });

  it('chamado da TI: o seletor de sempre, com "Sem atribuição"', async () => {
    await abrir({ setor_destino: 'TI' } as Partial<Chamado>);
    const opcoes = (await abrirOpcoes()).map((o) => o.textContent?.trim());
    expect(opcoes[0]).toBe('Sem atribuição');
    expect(chamadosService.sondarAtendimento).not.toHaveBeenCalled();
  });
});
