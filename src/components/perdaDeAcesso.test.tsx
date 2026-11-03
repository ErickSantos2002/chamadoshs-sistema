import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigationType } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useChamados } from '../hooks/useChamados';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  historicoService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, Comentario, SetorDestinoEnum, StatusEnum, Usuario } from '../types/api';
import { MENSAGEM_ATRIBUICAO_SALVA_SEM_ACESSO, MENSAGEM_SEM_ACESSO } from '../lib/acesso';
import ChamadoDetalhes from '../pages/ChamadoDetalhes';
import ChamadoModal from './ChamadoModal';
import AcoesRapidas from './AcoesRapidas';

/**
 * Perda de acesso a um chamado que estava na tela (FE-5, `lib/acesso`).
 *
 * Desde a API-5, quem deixa de poder ver um chamado recebe 404 — por ter
 * saído do setor, por ter sido tirado da atribuição, ou por ter passado o
 * chamado a outra pessoa. A página e o modal param: nada do chamado fica na
 * tela, o card sai do quadro sem recarregá-lo, o que a pessoa digitou fica
 * para copiar, e nada é reenviado.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Desvio na calibração',
  protocolo: 'CHAM-2026-0101',
  descricao: 'Paquímetro fora da tolerância.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 7,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.QUALIDADE,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
  versao: 3,
} as unknown as Chamado;

const COMENTARIO_PROTEGIDO = {
  id: 90,
  chamado_id: 1,
  usuario_id: 2,
  comentario: 'Lote 4471 reprovado na inspeção',
  is_interno: false,
  created_at: '2026-09-01T11:00:00',
} as unknown as Comentario;

const sessao = (id: number, role: string) =>
  ({
    user: { id, username: `u${id}`, role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: true,
    falhaAoConfirmar: false,
    revalidarIdentidade: async () => {},
  }) as React.ContextType<typeof AuthContext>;

/** Responsável pela rota restrita da Qualidade. */
const USUARIO = sessao(7, 'Usuario');
/** Técnica da Qualidade: edita e troca o responsável. */
const TECNICA = sessao(7, 'Tecnico');

const NAO_ENCONTRADO = { response: { status: 404, data: { detail: 'Chamado não encontrado' } } };
const FALHA_DO_SERVIDOR = { response: { status: 500, data: { detail: 'Internal Server Error' } } };

let host: HTMLDivElement;
let root: Root;
let noServidor: Chamado;
/** Enquanto `true`, o chamado é visível para quem está na tela. */
let acessivel: boolean;
let atender: MockInstance<typeof chamadosService.atender>;
let atualizar: MockInstance<typeof chamadosService.atualizar>;
let criarComentario: MockInstance<typeof comentariosService.criar>;
let tipoDaNavegacao: string | null;

const QuandoVoltar: React.FC = () => {
  tipoDaNavegacao = useNavigationType();
  return <p>LISTA DE CHAMADOS</p>;
};

/** O que o quadro tem agora. */
let ids: number[] = [];
let contexto: ReturnType<typeof useChamados>;
const Quadro: React.FC = () => {
  contexto = useChamados();
  ids = contexto.chamados.map((c) => c.id);
  return null;
};

const textos = () =>
  Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');

const clicar = async (texto: string) => {
  const alvo = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto
  );
  expect(alvo, `botão "${texto}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const digitar = async (campo: HTMLTextAreaElement | null, valor: string) => {
  expect(campo, 'campo não apareceu').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo!.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const campoDoComentario = () =>
  Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea')).find(
    (t) => !t.readOnly && !t.id.startsWith('rascunho-preservado')
  ) ?? null;

const rascunhosNaTela = () =>
  Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[id^="rascunho-preservado"]')).map(
    (t) => ({ valor: t.value, somenteLeitura: t.readOnly })
  );

/** Nada do chamado — título, protocolo, descrição, comentário — na tela. */
const semDadosDoChamado = () => {
  const texto = document.body.textContent ?? '';
  expect(texto).not.toContain(CHAMADO.titulo);
  expect(texto).not.toContain(CHAMADO.protocolo);
  expect(texto).not.toContain(CHAMADO.descricao);
  expect(texto).not.toContain(COMENTARIO_PROTEGIDO.comentario);
};

beforeEach(() => {
  noServidor = { ...CHAMADO };
  acessivel = true;
  tipoDaNavegacao = null;
  ids = [];

  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  // A página relê forçada por aqui (`carregarDados(true)`).
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    if (url === '/chamados/1') {
      if (!acessivel) throw NAO_ENCONTRADO;
      return { data: noServidor };
    }
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([
    { ...CHAMADO },
    { ...CHAMADO, id: 2, titulo: 'Outro chamado', protocolo: 'CHAM-2026-0102' },
    { ...CHAMADO, id: 3, titulo: 'Mais um', protocolo: 'CHAM-2026-0103' },
  ] as Chamado[]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async () => {
    if (!acessivel) throw NAO_ENCONTRADO;
    return noServidor;
  });
  vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
    status: 405,
    dados: { detail: 'Method Not Allowed' },
  });
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockResolvedValue([
    { id: 7, nome: 'Ana da Qualidade' },
    { id: 1, nome: 'rickelme' },
  ]);
  atender = vi
    .spyOn(chamadosService, 'atender')
    .mockImplementation(async (_id, corpo) => ({ ...noServidor, status: corpo.status }) as Chamado);
  atualizar = vi
    .spyOn(chamadosService, 'atualizar')
    .mockImplementation(async (_id, d) => ({ ...noServidor, ...d, versao: 4 }) as Chamado);
  criarComentario = vi.spyOn(comentariosService, 'criar');
  vi.spyOn(comentariosService, 'listarPorChamado').mockImplementation(async () => {
    if (!acessivel) throw NAO_ENCONTRADO;
    return [COMENTARIO_PROTEGIDO];
  });
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([{ id: 1, nome: 'rickelme' }]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
    { id: 7, nome: 'Ana da Qualidade', role_id: 3, ativo: true } as Usuario,
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

// ── Página ──────────────────────────────────────────────────────────────

const montarPagina = async (quem: React.ContextType<typeof AuthContext>) => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
        <ThemeProvider>
          <ChamadosProvider>
            <Quadro />
            <MemoryRouter initialEntries={['/chamados', '/chamados/1']} initialIndex={1}>
              <Routes>
                <Route path="/chamados" element={<QuandoVoltar />} />
                <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
              </Routes>
            </MemoryRouter>
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
  await act(async () => {
    await contexto.carregarChamados();
  });
};

describe('página — perda de acesso', () => {
  it('trocar o responsável e perder o acesso: a troca valeu, e a página diz isso', async () => {
    await montarPagina(TECNICA);
    await clicar('Editar Detalhes');

    const seletor = Array.from(host.querySelectorAll('[role="combobox"]')).find((b) =>
      (b.getAttribute('aria-labelledby') ?? '')
        .split(/\s+/)
        .some((i) => document.getElementById(i)?.textContent?.includes('Técnico responsável'))
    ) as HTMLElement;
    await act(async () => {
      seletor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const rickelme = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.trim() === 'rickelme'
    )!;
    await act(async () => {
      rickelme.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // O PUT passa; a partir dele, o chamado não é mais desta técnica.
    atualizar.mockImplementation(async (_id, d) => {
      acessivel = false;
      return { ...noServidor, ...d, versao: 4 } as Chamado;
    });
    await clicar('Salvar');

    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0][1]).toHaveProperty('tecnico_responsavel_id', 1);
    expect(host.textContent).toContain(MENSAGEM_ATRIBUICAO_SALVA_SEM_ACESSO);
    semDadosDoChamado();
    expect(ids).toEqual([2, 3]);
  });

  it('404 inesperado ao reler: a mensagem, sem dados, e a volta é para a lista sem histórico', async () => {
    await montarPagina(USUARIO);
    expect(host.textContent).toContain(COMENTARIO_PROTEGIDO.comentario);

    atender.mockImplementation(async () => {
      acessivel = false;
      throw NAO_ENCONTRADO;
    });
    await clicar('Aguardando retorno');

    expect(host.textContent).toContain(MENSAGEM_SEM_ACESSO);
    expect(host.textContent).not.toContain(MENSAGEM_ATRIBUICAO_SALVA_SEM_ACESSO);
    semDadosDoChamado();
    // Nenhuma ação do chamado sobra na tela.
    expect(textos()).toEqual(['Voltar para Chamados']);

    await clicar('Voltar para Chamados');
    expect(host.textContent).toContain('LISTA DE CHAMADOS');
    expect(tipoDaNavegacao).toBe('REPLACE');
  });

  it('o card sai do quadro, os outros ficam, e o quadro não é recarregado', async () => {
    await montarPagina(USUARIO);
    expect(ids).toEqual([1, 2, 3]);
    const listagens = vi.mocked(chamadosService.listarTodos).mock.calls.length;

    acessivel = false;
    atender.mockRejectedValue(NAO_ENCONTRADO);
    await clicar('Aguardando retorno');

    expect(ids).toEqual([2, 3]);
    expect(vi.mocked(chamadosService.listarTodos).mock.calls.length).toBe(listagens);
  });

  it('o comentário digitado fica, só leitura, e nada é reenviado', async () => {
    await montarPagina(USUARIO);
    await digitar(campoDoComentario(), 'Segue o laudo em anexo');

    acessivel = false;
    criarComentario.mockRejectedValue(NAO_ENCONTRADO);
    await clicar('Enviar Comentário');

    expect(host.textContent).toContain(MENSAGEM_SEM_ACESSO);
    expect(rascunhosNaTela()).toEqual([{ valor: 'Segue o laudo em anexo', somenteLeitura: true }]);
    semDadosDoChamado();
    // Uma tentativa, a da pessoa. Nem o comentário, nem a leitura se repetem.
    expect(criarComentario).toHaveBeenCalledTimes(1);
    expect(textos()).not.toContain('Enviar Comentário');
  });

  it('nenhuma escrita automática: uma tentativa, uma releitura', async () => {
    await montarPagina(USUARIO);
    const leituras = vi.mocked(api.get).mock.calls.filter(([u]) => u === '/chamados/1').length;

    atender.mockImplementation(async () => {
      acessivel = false;
      throw NAO_ENCONTRADO;
    });
    await clicar('Aguardando retorno');
    // Tempo para qualquer repetição que estivesse agendada.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(atender).toHaveBeenCalledTimes(1);
    expect(atualizar).not.toHaveBeenCalled();
    expect(criarComentario).not.toHaveBeenCalled();
    expect(vi.mocked(api.get).mock.calls.filter(([u]) => u === '/chamados/1').length).toBe(leituras + 1);
  });

  it('a solução digitada numa resolução recusada fica para copiar', async () => {
    await montarPagina(USUARIO);
    await clicar('Marcar como resolvido');
    await digitar(host.querySelector<HTMLTextAreaElement>('#solucao-rapida'), 'Recalibrado com o padrão 12');

    atender.mockImplementation(async () => {
      acessivel = false;
      throw NAO_ENCONTRADO;
    });
    await clicar('Resolver');

    expect(host.textContent).toContain(MENSAGEM_SEM_ACESSO);
    expect(rascunhosNaTela()).toEqual([
      { valor: 'Recalibrado com o padrão 12', somenteLeitura: true },
    ]);
    expect(atender).toHaveBeenCalledTimes(1);
    semDadosDoChamado();
  });

  it('primeira carga com 404 não é perda de acesso: é "não encontrado", como antes', async () => {
    acessivel = false;
    vi.mocked(chamadosService.listarTodos).mockResolvedValue([]);
    await montarPagina(USUARIO);
    expect(host.textContent).not.toContain(MENSAGEM_SEM_ACESSO);
    expect(host.textContent).toContain('Chamado não encontrado');
  });

  it('erro que não é 404 na releitura não encerra o acesso', async () => {
    await montarPagina(USUARIO);
    vi.mocked(api.get).mockRejectedValue(FALHA_DO_SERVIDOR);
    atender.mockRejectedValue(NAO_ENCONTRADO);
    await clicar('Aguardando retorno');
    expect(host.textContent).not.toContain(MENSAGEM_SEM_ACESSO);
    expect(ids).toEqual([1, 2, 3]);
  });
});

// ── Modal ───────────────────────────────────────────────────────────────

const montarModal = async (quem: React.ContextType<typeof AuthContext>) => {
  const aoFechar = vi.fn();
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
        <ChamadosProvider>
          <Quadro />
          <ChamadoModal chamadoId={1} aoFechar={aoFechar} aoAbrirEmPagina={() => {}} />
        </ChamadosProvider>
      </AuthContext.Provider>
    );
  });
  await act(async () => {
    await contexto.carregarChamados();
  });
  return aoFechar;
};

describe('modal — perda de acesso', () => {
  it('a janela para: sem dados, sem ações velhas, com a mensagem e o rascunho', async () => {
    const aoFechar = await montarModal(USUARIO);
    expect(document.body.textContent).toContain(CHAMADO.descricao);
    await digitar(campoDoComentario(), 'Vou verificar amanhã');

    atender.mockImplementation(async () => {
      acessivel = false;
      throw NAO_ENCONTRADO;
    });
    await clicar('Aguardando retorno');

    expect(document.body.textContent).toContain(MENSAGEM_SEM_ACESSO);
    expect(document.body.textContent).toContain('Chamado indisponível');
    semDadosDoChamado();
    expect(textos()).not.toContain('Aguardando retorno');
    expect(textos()).not.toContain('Marcar como resolvido');
    expect(textos()).not.toContain('Comentar');
    expect(rascunhosNaTela()).toEqual([{ valor: 'Vou verificar amanhã', somenteLeitura: true }]);

    await clicar('Fechar');
    expect(aoFechar).toHaveBeenCalled();
  });

  it('o card sai do quadro, os outros ficam, sem recarga e sem nova leitura do chamado', async () => {
    await montarModal(USUARIO);
    expect(ids).toEqual([1, 2, 3]);
    const listagens = vi.mocked(chamadosService.listarTodos).mock.calls.length;

    atender.mockImplementation(async () => {
      acessivel = false;
      throw NAO_ENCONTRADO;
    });
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    await clicar('Aguardando retorno');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(ids).toEqual([2, 3]);
    expect(vi.mocked(chamadosService.listarTodos).mock.calls.length).toBe(listagens);
    // Uma releitura, a que deu 404. Tirar o card muda a lista do contexto, e
    // a janela não pede o chamado de novo por isso.
    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leituras + 1);
    expect(atender).toHaveBeenCalledTimes(1);
  });

  it('comentar e receber 404: encerra, o texto fica, e não reenvia', async () => {
    await montarModal(USUARIO);
    await digitar(campoDoComentario(), 'Peça chegou');
    acessivel = false;
    criarComentario.mockRejectedValue(NAO_ENCONTRADO);
    await clicar('Comentar');

    expect(document.body.textContent).toContain(MENSAGEM_SEM_ACESSO);
    expect(rascunhosNaTela()).toEqual([{ valor: 'Peça chegou', somenteLeitura: true }]);
    expect(criarComentario).toHaveBeenCalledTimes(1);
    expect(ids).toEqual([2, 3]);
  });

  it('409 e a releitura falha (500): a espera acaba, as ações ficam travadas, e o retry é um clique', async () => {
    await montarModal(USUARIO);
    atender.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { detail: 'Alterado', codigo: 'versao_desatualizada', versao_atual: 5 },
      },
    });
    vi.mocked(chamadosService.buscar).mockRejectedValueOnce(FALHA_DO_SERVIDOR);
    await clicar('Aguardando retorno');

    const texto = document.body.textContent ?? '';
    expect(texto).not.toContain('Atualizando os dados antes de liberar as ações');
    expect(texto).toContain('Não foi possível atualizar este chamado');
    const aguardando = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aguardando retorno'
    ) as HTMLButtonElement;
    expect(aguardando.disabled).toBe(true);
    expect(atender).toHaveBeenCalledTimes(1);

    // Nada se repete sozinho.
    const leituras = vi.mocked(chamadosService.buscar).mock.calls.length;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(vi.mocked(chamadosService.buscar).mock.calls.length).toBe(leituras);

    noServidor = { ...noServidor, versao: 5 } as Chamado;
    await clicar('Tentar de novo');
    const depois = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Aguardando retorno'
    ) as HTMLButtonElement;
    expect(depois.disabled).toBe(false);
    expect(document.body.textContent).not.toContain('Não foi possível atualizar este chamado');
    expect(atender).toHaveBeenCalledTimes(1);
  });

  it('409 e a releitura dá 404: encerra, em vez de esperar a versão para sempre', async () => {
    await montarModal(USUARIO);
    atender.mockImplementation(async () => {
      acessivel = false;
      throw { response: { status: 409, data: { detail: 'x', codigo: 'versao_desatualizada', versao_atual: 5 } } };
    });
    await clicar('Aguardando retorno');
    expect(document.body.textContent).toContain(MENSAGEM_SEM_ACESSO);
    expect(document.body.textContent).not.toContain('Atualizando os dados');
    expect(ids).toEqual([2, 3]);
  });
});

// ── Ações rápidas ───────────────────────────────────────────────────────

describe('AcoesRapidas — a espera pela versão sempre acaba', () => {
  const CONFLITO = {
    response: { status: 409, data: { detail: 'x', codigo: 'versao_desatualizada', versao_atual: 8 } },
  };

  const montarAcoes = async (
    recarregar: () => void | Promise<boolean | void>,
    quem = USUARIO,
    chamado: Chamado = CHAMADO
  ) => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={quem}>
          <ChamadosProvider>
            <AcoesRapidas chamado={chamado} aoMudar={() => {}} aoPrecisarRecarregar={recarregar} />
          </ChamadosProvider>
        </AuthContext.Provider>
      );
    });
  };

  const botao = (texto: string) =>
    Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as
      | HTMLButtonElement
      | undefined;

  it('releitura sem sucesso (false): sai do "Atualizando…", trava, e não tenta de novo', async () => {
    const recarregar = vi.fn(async () => false);
    atender.mockRejectedValue(CONFLITO);
    await montarAcoes(recarregar);
    await clicar('Aguardando retorno');

    expect(host.textContent).not.toContain('Atualizando os dados');
    expect(host.textContent).toContain('Não foi possível atualizar este chamado');
    expect(botao('Aguardando retorno')?.disabled).toBe(true);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('releitura que rejeita: o mesmo', async () => {
    const recarregar = vi.fn(() => Promise.reject(new Error('caiu')));
    atender.mockRejectedValue(CONFLITO);
    await montarAcoes(recarregar);
    await clicar('Aguardando retorno');

    expect(host.textContent).toContain('Não foi possível atualizar este chamado');
    expect(botao('Aguardando retorno')?.disabled).toBe(true);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it('travado por falha, um clique em ação não sai', async () => {
    atender.mockRejectedValue(CONFLITO);
    await montarAcoes(vi.fn(async () => false));
    await clicar('Aguardando retorno');
    expect(atender).toHaveBeenCalledTimes(1);
    await act(async () => {
      botao('Aguardando retorno')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(atender).toHaveBeenCalledTimes(1);
  });

  it('releitura com sucesso (true): a espera acaba e os botões voltam', async () => {
    atender.mockRejectedValue(CONFLITO);
    await montarAcoes(vi.fn(async () => true));
    await clicar('Aguardando retorno');
    expect(host.textContent).not.toContain('Atualizando os dados');
    expect(host.textContent).not.toContain('Não foi possível atualizar');
    expect(botao('Aguardando retorno')?.disabled).toBe(false);
  });

  it('sem promessa (como antes): espera a versão nova', async () => {
    atender.mockRejectedValue(CONFLITO);
    await montarAcoes(vi.fn());
    await clicar('Aguardando retorno');
    expect(host.textContent).toContain('Atualizando os dados');
  });

  it('PUT da equipe com 404: pede a releitura, sem toast próprio', async () => {
    const recarregar = vi.fn(async () => false);
    atualizar.mockRejectedValue(NAO_ENCONTRADO);
    const ti = { ...CHAMADO, setor_destino: SetorDestinoEnum.TI, versao: undefined } as unknown as Chamado;
    await montarAcoes(recarregar, sessao(1, 'Administrador'), ti);
    await clicar('Aguardando retorno');
    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(recarregar).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.error)).not.toHaveBeenCalled();
  });
});

// ── Contexto: resposta atrasada não ressuscita ──────────────────────────

describe('removerChamado — respostas atrasadas', () => {
  // Administrador: uma listagem só por carga, para soltar a resposta à mão.
  const montarContexto = async () => {
    await act(async () => {
      root.render(
        <AuthContext.Provider value={sessao(1, 'Administrador')}>
          <ChamadosProvider>
            <Quadro />
          </ChamadosProvider>
        </AuthContext.Provider>
      );
    });
    await act(async () => {
      await contexto.carregarChamados();
    });
  };

  it('remove só o card dele, sem requisição', async () => {
    await montarContexto();
    const listagens = vi.mocked(chamadosService.listarTodos).mock.calls.length;
    await act(async () => contexto.removerChamado(2));
    expect(ids).toEqual([1, 3]);
    expect(vi.mocked(chamadosService.listarTodos).mock.calls.length).toBe(listagens);
  });

  it('a listagem que já estava em voo não traz o removido de volta', async () => {
    await montarContexto();
    let soltar!: (c: Chamado[]) => void;
    vi.mocked(chamadosService.listarTodos).mockImplementation(
      () => new Promise<Chamado[]>((r) => (soltar = r))
    );
    let emVoo!: Promise<void>;
    await act(async () => {
      emVoo = contexto.carregarChamados();
    });
    await act(async () => contexto.removerChamado(1));
    await act(async () => {
      soltar([{ ...CHAMADO }, { ...CHAMADO, id: 2 }] as Chamado[]);
      await emVoo;
    });
    expect(ids).toEqual([2]);
  });

  it('a busca em voo não devolve nem insere o removido', async () => {
    await montarContexto();
    await act(async () => contexto.removerChamado(1));
    let soltar!: (c: Chamado) => void;
    vi.mocked(chamadosService.buscar).mockImplementation(() => new Promise<Chamado>((r) => (soltar = r)));
    let resultado: Chamado | null | undefined;
    let busca!: Promise<Chamado | null>;
    await act(async () => {
      busca = contexto.buscarChamado(1);
    });
    // Saiu de novo enquanto a busca andava (outra perda).
    await act(async () => contexto.removerChamado(1));
    await act(async () => {
      soltar({ ...CHAMADO });
      resultado = await busca;
    });
    expect(resultado).toBeNull();
    expect(ids).not.toContain(1);
  });

  it('a listagem que começa DEPOIS da remoção vale: o acesso pode ter voltado', async () => {
    await montarContexto();
    await act(async () => contexto.removerChamado(1));
    await act(async () => {
      await contexto.carregarChamados();
    });
    expect(ids).toContain(1);
  });
});
