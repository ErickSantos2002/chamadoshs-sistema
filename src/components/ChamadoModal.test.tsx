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
import { MENSAGEM_ATRIBUICAO_MUDOU, MENSAGEM_QUALIDADE_INDISPONIVEL } from '../lib/atendimento';
import { MENSAGEM_SEM_VERSAO } from '../lib/versao';
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
  user: { id: 1, username: 'rickelme', role: 'Administrador', conta_de_servico: false },
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
  // A lista do seletor da TI vem da API-9 (FE-5), não mais de `GET /usuarios/`.
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([{ id: 1, nome: 'rickelme' }]);
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
    versao: 3,
  } as unknown as Chamado;

  const USUARIO = {
    ...SESSAO,
    user: { id: 7, username: 'ana', role: 'Usuario', conta_de_servico: false },
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

    expect(atender.mock.calls).toStrictEqual([[4, { status: StatusEnum.AGUARDANDO, versao_esperada: 3 }]]);
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
    versao: 3,
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

  /** O interno é da equipe do setor do chamado: a dica não fala da TI aqui. */
  it('a dica do comentário interno fala da equipe da Qualidade', async () => {
    await abrir();
    expect(document.body.textContent).toContain(
      'Visível só para administradores e para a equipe da Qualidade.'
    );
    expect(document.body.textContent).not.toContain('para a equipe da TI.');
  });

  it('chamado da TI: a dica do comentário interno segue a da TI', async () => {
    await abrir({ setor_destino: 'TI' } as Partial<Chamado>);
    expect(document.body.textContent).toContain(
      'Visível só para administradores e para a equipe da TI.'
    );
  });

  it('as opções são os atendentes, sem "Sem atribuição"', async () => {
    await abrir();
    const opcoes = (await abrirOpcoes()).map((o) => o.textContent?.trim());
    expect(opcoes).toEqual(['Ana', 'Bia']);
  });

  it('trocar manda só o novo responsável', async () => {
    await abrir();
    await escolherOpcao('Bia');
    expect(atualizar.mock.calls).toStrictEqual([[5, { tecnico_responsavel_id: 3, versao_esperada: 3 }]]);
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

  /**
   * FE-4: outra pessoa trocou o responsável depois que a janela abriu. A API
   * recusa a troca velha com 409; a janela relê e mostra quem está agora, e
   * a troca não é repetida.
   */
  it('409 de versão: avisa, relê o responsável atual e não repete', async () => {
    await abrir();
    vi.mocked(chamadosService.buscar).mockResolvedValue({ ...QUAL, tecnico_responsavel_id: 3, versao: 4 } as Chamado);
    atualizar.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'x', codigo: 'versao_desatualizada', versao_atual: 4 } },
    });
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    await escolherOpcao('Bia');
    await act(async () => {});

    expect(atualizar.mock.calls).toStrictEqual([[5, { tecnico_responsavel_id: 3, versao_esperada: 3 }]]);
    expect(erro).toHaveBeenCalledWith(MENSAGEM_ATRIBUICAO_MUDOU);
    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leituras + 1);
    expect(seletorDoResponsavel()?.textContent).toContain('Bia');
  });

  it('sem versão válida: a troca não sai', async () => {
    await abrir({ versao: undefined });
    await escolherOpcao('Bia');
    expect(atualizar).not.toHaveBeenCalled();
    expect(erro).toHaveBeenCalledWith(MENSAGEM_SEM_VERSAO);
  });

  /**
   * A fila da Qualidade (1.9.0): o chamado nasce sem responsável. A janela
   * mostra "Aguardando atribuição" — no seletor de quem distribui, como valor
   * de partida que não se escolhe —, e não oferece início de atendimento.
   */
  describe('aguardando atribuição', () => {
    // `null`, como a API manda; o tipo do front só conhece a ausência.
    const NA_FILA = {
      status: StatusEnum.ABERTO,
      tecnico_responsavel_id: null as never,
    } as Partial<Chamado>;
    const botoes = () =>
      Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

    it('o seletor parte de "Aguardando atribuição", desabilitada, e ninguém é atribuído sozinho', async () => {
      await abrir(NA_FILA);
      expect(seletorDoResponsavel()?.textContent).toContain('Aguardando atribuição');
      const opcoes = await abrirOpcoes();
      expect(opcoes.map((o) => o.textContent?.trim())).toEqual(['Aguardando atribuição', 'Ana', 'Bia']);
      expect(opcoes[0].getAttribute('aria-disabled')).toBe('true');
      expect(atualizar).not.toHaveBeenCalled();
    });

    it('clicar em "Aguardando atribuição" não faz requisição', async () => {
      await abrir(NA_FILA);
      await escolherOpcao('Aguardando atribuição');
      expect(atualizar).not.toHaveBeenCalled();
    });

    it('escolher um atendente atribui, só com o responsável e a versão', async () => {
      await abrir(NA_FILA);
      await escolherOpcao('Bia');
      expect(atualizar.mock.calls).toStrictEqual([
        [5, { tecnico_responsavel_id: 3, versao_esperada: 3 }],
      ]);
    });

    it('nenhuma ação de status na janela, e a orientação de atribuir', async () => {
      await abrir(NA_FILA);
      expect(botoes()).not.toContain('Iniciar atendimento');
      expect(document.body.textContent).toContain('Defina o responsável para liberar o atendimento.');
    });

    it('409 ao atribuir: avisa, relê quem ficou, e não repete', async () => {
      await abrir(NA_FILA);
      vi.mocked(chamadosService.buscar).mockResolvedValue({
        ...QUAL,
        status: StatusEnum.ABERTO,
        tecnico_responsavel_id: 7,
        versao: 4,
      } as Chamado);
      atualizar.mockRejectedValueOnce({
        response: { status: 409, data: { detail: 'x', codigo: 'versao_desatualizada', versao_atual: 4 } },
      });
      await escolherOpcao('Bia');
      await act(async () => {});

      expect(atualizar).toHaveBeenCalledTimes(1);
      expect(erro).toHaveBeenCalledWith(MENSAGEM_ATRIBUICAO_MUDOU);
      expect(seletorDoResponsavel()?.textContent).toContain('Ana');
    });

    it('API sem a rota: só leitura, com "Aguardando atribuição" no lugar do nome', async () => {
      vi.mocked(chamadosService.sondarAtendimento).mockResolvedValue({
        status: 404,
        dados: { detail: 'Not Found' },
      });
      await abrir(NA_FILA);
      expect(seletorDoResponsavel()).toBeUndefined();
      expect(document.body.textContent).toContain('Aguardando atribuição');
      expect(document.body.textContent).not.toContain('Sem atribuição');
    });
  });

  // API-12: a troca da TI leva a versão do chamado desta janela.
  it('chamado da TI com versão: a troca leva a versao_esperada dele', async () => {
    await abrir({ setor_destino: 'TI', versao: 9 } as Partial<Chamado>);
    await escolherOpcao('Sem atribuição');
    expect(atualizar.mock.calls).toStrictEqual([
      [5, { tecnico_responsavel_id: null, versao_esperada: 9 }],
    ]);
  });
});

/**
 * O responsável da TI com versão (API-12), e as respostas que chegam depois
 * de a janela trocar de chamado.
 */
describe('ChamadoModal — responsável da TI com versão (API-12)', () => {
  const TI = {
    ...CHAMADO,
    id: 5,
    titulo: 'Impressora do RH parada',
    setor_destino: 'TI',
    tecnico_responsavel_id: 1,
    versao: 9,
  } as unknown as Chamado;
  const OUTRO = { ...TI, id: 6, titulo: 'VPN do financeiro caiu', versao: 2 } as Chamado;
  const CONFLITO = {
    response: { status: 409, data: { detail: 'versão', codigo: 'versao_desatualizada', versao_atual: 10 } },
  };

  let noServidor: Record<number, Chamado>;
  const render = async (id: number) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={SESSAO}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={id} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
  };
  const abrir = async (id = 5) => {
    act(() => root.unmount());
    root = createRoot(host);
    await render(id);
  };

  const seletorDoResponsavel = () =>
    Array.from(document.querySelectorAll('[role="combobox"]')).find((b) =>
      (b.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .some((i) => document.getElementById(i)?.textContent?.includes('Responsável'))
    ) as HTMLElement | undefined;
  const escolherOpcao = async (texto: string) => {
    const s = seletorDoResponsavel();
    expect(s, 'seletor de responsável não apareceu').toBeTruthy();
    await act(async () => {
      s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.trim() === texto
    );
    expect(alvo, `opção "${texto}" não apareceu`).toBeTruthy();
    await act(async () => {
      alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };
  const texto = () => document.body.textContent ?? '';

  let atualizar: MockInstance<typeof chamadosService.atualizar>;
  let erro: MockInstance<typeof toast.error>;

  beforeEach(() => {
    noServidor = { 5: TI, 6: OUTRO };
    vi.mocked(chamadosService.buscar).mockImplementation(async (id: number) => noServidor[id]);
    vi.mocked(chamadosService.listarResponsaveisTI).mockResolvedValue([
      { id: 1, nome: 'rickelme' },
      { id: 3, nome: 'tecnica' },
    ]);
    vi.mocked(usuariosService.listarTodos).mockResolvedValue([
      { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
      { id: 3, nome: 'tecnica', role_id: 2, ativo: true } as Usuario,
    ]);
    atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockImplementation(async (id, d) => ({ ...noServidor[id], ...d, versao: 99 }) as Chamado);
    erro = vi.spyOn(toast, 'error').mockImplementation(() => '');
  });

  it('409: nada se repete, a janela e a lista são relidas, e a troca nova leva a versão relida', async () => {
    await abrir();
    const leiturasDaLista = vi.mocked(chamadosService.listarResponsaveisTI).mock.calls.length;
    atualizar.mockRejectedValueOnce(CONFLITO);
    // Outra pessoa trocou o responsável enquanto esta janela estava aberta.
    noServidor[5] = { ...TI, tecnico_responsavel_id: 3, versao: 10 } as Chamado;
    await escolherOpcao('Sem atribuição');

    expect(atualizar.mock.calls).toStrictEqual([[5, { tecnico_responsavel_id: null, versao_esperada: 9 }]]);
    expect(erro).toHaveBeenCalledWith(MENSAGEM_ATRIBUICAO_MUDOU);
    expect(vi.mocked(chamadosService.listarResponsaveisTI).mock.calls.length).toBeGreaterThan(leiturasDaLista);
    // A janela mostra o responsável de agora — a escolha anterior não ficou
    // selecionada como se tivesse valido.
    expect(seletorDoResponsavel()?.textContent).toContain('tecnica');

    await escolherOpcao('rickelme');
    expect(atualizar.mock.calls[1]).toStrictEqual([5, { tecnico_responsavel_id: 1, versao_esperada: 10 }]);
    expect(atualizar).toHaveBeenCalledTimes(2);
  });

  it('timeout: "não confirmado", sem reenviar, e a janela relê', async () => {
    await abrir();
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    atualizar.mockRejectedValueOnce({ code: 'ECONNABORTED', request: {}, message: 'timeout' });
    await escolherOpcao('tecnica');

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(erro).toHaveBeenCalledWith(
      'Não foi possível confirmar se a alteração foi salva (servidor ou conexão). Nada foi reenviado. Confira o chamado antes de tentar de novo.'
    );
    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBeGreaterThan(leituras);
  });

  it('a resposta atrasada do chamado anterior não toma o lugar do aberto', async () => {
    await abrir();
    let soltar: (c: Chamado) => void = () => {};
    atualizar.mockImplementationOnce(() => new Promise<Chamado>((r) => (soltar = r)));
    await escolherOpcao('tecnica');
    await render(6);
    expect(texto()).toContain('VPN do financeiro caiu');

    await act(async () => soltar({ ...TI, tecnico_responsavel_id: 3, versao: 10 } as Chamado));
    expect(texto()).toContain('VPN do financeiro caiu');
    expect(texto()).not.toContain('Impressora do RH parada');
  });

  it('a escrita que responde depois do 404 não traz o chamado de volta', async () => {
    await abrir();
    let soltar: (c: Chamado) => void = () => {};
    atualizar.mockImplementationOnce(() => new Promise<Chamado>((r) => (soltar = r)));
    const status = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aguardando retorno'
    );
    expect(status, 'ação de status').toBeTruthy();
    await act(async () => {
      status!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // Enquanto o status não volta, a troca de responsável dá 404: acabou o acesso.
    atualizar.mockRejectedValueOnce({ response: { status: 404, data: { detail: 'Chamado não encontrado' } } });
    await escolherOpcao('tecnica');
    expect(texto()).toContain('Chamado indisponível');

    await act(async () => soltar({ ...TI, status: StatusEnum.AGUARDANDO, versao: 10 } as Chamado));
    expect(texto()).toContain('Chamado indisponível');
    expect(texto()).not.toContain('Impressora do RH parada');
  });

  it('o 404 atrasado do chamado anterior não encerra o aberto', async () => {
    await abrir();
    let falhar: (e: unknown) => void = () => {};
    atualizar.mockImplementationOnce(() => new Promise<Chamado>((_, f) => (falhar = f)));
    await escolherOpcao('tecnica');
    await render(6);

    await act(async () => falhar({ response: { status: 404, data: { detail: 'Chamado não encontrado' } } }));
    expect(texto()).toContain('VPN do financeiro caiu');
    expect(texto()).not.toContain('Chamado indisponível');
  });
});
