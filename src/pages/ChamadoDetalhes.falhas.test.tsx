import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from 'react-router-dom';
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
import { MENSAGEM_CONFLITO_DE_VERSAO, MENSAGEM_VERSAO_AUSENTE } from '../lib/versao';
import { MENSAGEM_INCERTA, MENSAGEM_RECUSA } from '../lib/escrita';
import ChamadoDetalhes from './ChamadoDetalhes';

/**
 * C3 — erro recuperável de escrita não derruba a página (FE-5).
 *
 * Antes, salvar a edição da TI, mudar o status e confirmar a resolução
 * terminavam em `setError`, e a página inteira virava um aviso: o chamado e
 * o que foi digitado sumiam. Aqui, cada classe de erro da §6: a página fica,
 * o formulário fica, a mensagem vem junto da operação, nada é reenviado
 * sozinho, e a perda de acesso (o 404 do chamado) segue o fluxo dela.
 * Dados fictícios.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Chamado fictício das falhas',
  protocolo: 'CHAM-2026-0801',
  descricao: 'Descrição fictícia.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 9,
  tecnico_responsavel_id: 1,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.TI,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-11-01T10:00:00',
  versao: 2,
} as unknown as Chamado;

const SOLUCAO = 'Troquei o cabo de rede fictício e testei a conexão.';

const erro = (status: number, detail?: string) => ({
  response: { status, data: detail === undefined ? {} : { detail } },
});
const REDE = { request: {}, message: 'Network Error' };
const TIMEOUT = { request: {}, code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' };

let revalidar: ReturnType<typeof vi.fn>;
const sessao = (id = 1) =>
  ({
    user: { id, username: `conta${id}`, role: 'Administrador', conta_de_servico: false },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: true,
    falhaAoConfirmar: false,
    confirmacaoRecusada: false,
    revalidando: false,
    revalidarIdentidade: revalidar,
  }) as unknown as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;
let noServidor: Record<number, Chamado>;
let atualizar: MockInstance<typeof chamadosService.atualizar>;
let navegar: NavigateFunction;

const Navegador: React.FC = () => {
  navegar = useNavigate();
  return null;
};

const arvore = (valor: React.ContextType<typeof AuthContext>) => (
  <AuthContext.Provider value={valor}>
    <ThemeProvider>
      <ChamadosProvider>
        <MemoryRouter initialEntries={['/chamados/1']}>
          <Navegador />
          <Routes>
            <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
          </Routes>
        </MemoryRouter>
      </ChamadosProvider>
    </ThemeProvider>
  </AuthContext.Provider>
);

const montar = async (valor = sessao()) => {
  await act(async () => {
    root.render(arvore(valor));
  });
};

const texto = () => document.body.textContent ?? '';
const botao = (t: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === t) as
    | HTMLButtonElement
    | undefined;
const clicar = async (t: string) => {
  expect(botao(t), `botão "${t}" não apareceu`).toBeTruthy();
  await act(async () => {
    botao(t)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
const seletor = (rotulo: string) =>
  Array.from(document.querySelectorAll('[role="combobox"]')).find((b) => nomeAcessivel(b).startsWith(rotulo));
const escolher = async (rotulo: string, opcao: string) => {
  const s = seletor(rotulo);
  expect(s, `seletor "${rotulo}"`).toBeTruthy();
  await act(async () => {
    s!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find((o) => o.textContent?.trim() === opcao);
  expect(alvo, `opção "${opcao}"`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};
const digitarEm = async (campo: HTMLTextAreaElement | null, valor: string) => {
  expect(campo).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo!.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const campoSolucao = () => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Solução"]');
const campoResolucao = () => document.querySelector<HTMLTextAreaElement>('#solucao-resolucao');
const campoComentario = () => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]');
const dialogo = () => document.querySelector('[role="dialog"]');
/** O botão de confirmar DENTRO do modal — a ação rápida tem o mesmo rótulo. */
const confirmarNoModal = async (t: string) => {
  const alvo = Array.from(dialogo()?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent?.trim() === t
  );
  expect(alvo, `botão "${t}" no modal`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

/** A página continua de pé: o chamado na tela, nenhum aviso no lugar dela. */
const paginaDePe = () => {
  expect(texto()).toContain('Chamado fictício das falhas');
  expect(texto()).not.toContain('Erro ao atualizar chamado.');
  expect(texto()).not.toContain('Erro ao atualizar status.');
};

const editarESalvar = async (falha: unknown, preparar?: () => Promise<void>) => {
  atualizar.mockRejectedValueOnce(falha);
  await montar();
  await clicar('Editar Detalhes');
  if (preparar) await preparar();
  else await digitarEm(campoSolucao(), SOLUCAO);
  await clicar('Salvar');
};

const abrirResolucao = async () => {
  await montar();
  await clicar('Marcar como Resolvido');
  await digitarEm(campoResolucao(), SOLUCAO);
};

beforeEach(() => {
  revalidar = vi.fn(async () => {});
  noServidor = { 1: CHAMADO, 2: { ...CHAMADO, id: 2, titulo: 'Outro chamado fictício', protocolo: 'CHAM-2026-0802' } };
  for (const verbo of ['post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
    const m = /^\/chamados\/(\d+)$/.exec(url);
    if (m && noServidor[Number(m[1])]) return { data: noServidor[Number(m[1])] };
    throw new Error(`rede bloqueada no teste: get ${url}`);
  });
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async (id) => noServidor[id]);
  atualizar = vi.spyOn(chamadosService, 'atualizar');
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([
    { id: 1, nome: 'Admin fictício' },
    { id: 3, nome: 'Técnica fictícia' },
  ]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'Admin fictício', role_id: 1, ativo: true } as Usuario,
    { id: 3, nome: 'Técnica fictícia', role_id: 2, ativo: true } as Usuario,
  ]);
  vi.spyOn(toast, 'error').mockImplementation(() => '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.clear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('C3 — cada classe de erro', () => {
  it('1. 400: a edição fica aberta, com a mensagem da API junto dela, sem reenvio', async () => {
    await editarESalvar(erro(400, 'Categoria inativa'));
    paginaDePe();
    expect(botao('Salvar')).toBeTruthy();
    expect(campoSolucao()?.value).toBe(SOLUCAO);
    expect(texto()).toContain('Categoria inativa Nada foi salvo.');
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('2. 422: idem, com a mensagem padrão quando a API não diz o campo', async () => {
    await editarESalvar(erro(422));
    paginaDePe();
    expect(campoSolucao()?.value).toBe(SOLUCAO);
    expect(texto()).toContain('A API recusou os dados enviados');
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('3. 403: não é perda de acesso — texto fica, Salvar trava, permissões relidas, sem reenvio', async () => {
    await editarESalvar(erro(403, 'Você não altera este chamado'));
    paginaDePe();
    expect(texto()).not.toContain('não está mais disponível');
    expect(campoSolucao()?.value).toBe(SOLUCAO);
    expect(texto()).toContain(MENSAGEM_RECUSA);
    expect(botao('Salvar')?.disabled).toBe(true);
    expect(revalidar).toHaveBeenCalledTimes(1);
    await clicar('Salvar');
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('4. 404 do chamado: o fluxo de perda de acesso, com o texto digitado para copiar', async () => {
    await editarESalvar(erro(404, 'Chamado não encontrado'));
    expect(texto()).toContain('não está mais disponível');
    expect(texto()).not.toContain('Chamado fictício das falhas');
    const preservados = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[readonly]'));
    expect(preservados.map((t) => t.value)).toContain(SOLUCAO);
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('5. 404 que não é do chamado ("Not Found", rota): a página fica', async () => {
    await editarESalvar(erro(404, 'Not Found'));
    paginaDePe();
    expect(texto()).not.toContain('não está mais disponível');
    expect(campoSolucao()?.value).toBe(SOLUCAO);
    expect(texto()).toContain('Not Found');
  });

  it('6. 409 na mudança de status: o fluxo de versão de sempre, sem reenvio', async () => {
    atualizar.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Versão desatualizada', codigo: 'versao_desatualizada', versao_atual: 3 } },
    });
    await montar();
    await clicar('Aguardando Retorno');
    paginaDePe();
    expect(toast.error).toHaveBeenCalledWith(MENSAGEM_CONFLITO_DE_VERSAO);
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('7. 428 na resolução: o modal fecha, a solução fica guardada para a próxima', async () => {
    atualizar.mockRejectedValueOnce(erro(428, 'versao_esperada obrigatória'));
    await abrirResolucao();
    await confirmarNoModal('Marcar como Resolvido');
    paginaDePe();
    expect(toast.error).toHaveBeenCalledWith(MENSAGEM_VERSAO_AUSENTE);
    await clicar('Marcar como Resolvido');
    expect(campoResolucao()?.value).toBe(SOLUCAO);
  });

  it('8. 500 na mudança de status: a página fica, resultado incerto, conferir é um clique', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    atualizar.mockRejectedValueOnce(erro(500, 'Erro interno'));
    await montar();
    await clicar('Aguardando Retorno');
    paginaDePe();
    expect(texto()).toContain(MENSAGEM_INCERTA);
    await act(async () => {
      vi.advanceTimersByTime(120_000);
    });
    expect(atualizar).toHaveBeenCalledTimes(1);
    const leiturasAntes = vi.mocked(api.get).mock.calls.length;
    await clicar('Conferir o chamado');
    expect(vi.mocked(api.get).mock.calls.length).toBe(leiturasAntes + 1);
    expect(texto()).not.toContain(MENSAGEM_INCERTA);
    expect(atualizar).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('9. timeout na resolução: o modal fica aberto com a solução, resultado incerto', async () => {
    atualizar.mockRejectedValueOnce(TIMEOUT);
    await abrirResolucao();
    await confirmarNoModal('Marcar como Resolvido');
    paginaDePe();
    expect(dialogo()).toBeTruthy();
    expect(campoResolucao()?.value).toBe(SOLUCAO);
    expect(dialogo()?.textContent).toContain(MENSAGEM_INCERTA);
    expect(atualizar).toHaveBeenCalledTimes(1);
  });

  it('10. rede caída ao salvar a edição: a edição fica, sem conferência que apagaria os campos', async () => {
    await editarESalvar(REDE);
    paginaDePe();
    expect(campoSolucao()?.value).toBe(SOLUCAO);
    expect(texto()).toContain(MENSAGEM_INCERTA);
    expect(botao('Conferir o chamado')).toBeUndefined();
    expect(atualizar).toHaveBeenCalledTimes(1);
  });
});

describe('C3 — onde o erro acontece, e o que é preservado', () => {
  it('11. erro com o modal aberto (422): o modal não fecha, a mensagem fica dentro dele', async () => {
    atualizar.mockRejectedValueOnce(erro(422, 'Solução curta demais'));
    await abrirResolucao();
    await confirmarNoModal('Marcar como Resolvido');
    expect(dialogo()).toBeTruthy();
    expect(dialogo()?.textContent).toContain('Solução curta demais');
    expect(campoResolucao()?.value).toBe(SOLUCAO);
  });

  it('12. erro com o detalhe aberto: descrição, título e comentários continuam na página', async () => {
    atualizar.mockRejectedValueOnce(erro(503, 'Indisponível'));
    await montar();
    await digitarEm(campoComentario(), 'Comentário fictício em andamento');
    await clicar('Aguardando Retorno');
    paginaDePe();
    expect(texto()).toContain('Descrição fictícia.');
    expect(campoComentario()?.value).toBe('Comentário fictício em andamento');
  });

  it('13. rascunho de comentário: 500 no envio mantém o texto, sem reenvio', async () => {
    const criar = vi.spyOn(comentariosService, 'criar').mockRejectedValueOnce(erro(500, 'Erro interno'));
    await montar();
    await digitarEm(campoComentario(), 'Comentário fictício');
    await clicar('Enviar Comentário');
    paginaDePe();
    expect(campoComentario()?.value).toBe('Comentário fictício');
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('14. rascunho de solução: 500 na resolução, fechar e reabrir devolve o texto', async () => {
    atualizar.mockRejectedValueOnce(erro(500));
    await abrirResolucao();
    await confirmarNoModal('Marcar como Resolvido');
    await confirmarNoModal('Cancelar');
    await clicar('Marcar como Resolvido');
    expect(campoResolucao()?.value).toBe(SOLUCAO);
  });

  it('15. seleção de responsável: depois do 500, o escolhido continua no seletor', async () => {
    await editarESalvar(erro(500), async () => {
      await escolher('Técnico responsável', 'Técnica fictícia');
    });
    paginaDePe();
    expect(seletor('Técnico responsável')?.textContent).toContain('Técnica fictícia');
    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(atualizar.mock.calls[0][1]).toMatchObject({ tecnico_responsavel_id: 3 });
  });

  it('16. alteração de prioridade: depois do 422, a prioridade escolhida continua', async () => {
    await editarESalvar(erro(422, 'Prioridade inválida'), async () => {
      await escolher('Prioridade', 'Alta');
    });
    paginaDePe();
    expect(seletor('Prioridade')?.textContent).toContain('Alta');
  });

  it('17. rascunho próprio após perda de acesso: o comentário fica para copiar, nada do chamado', async () => {
    vi.spyOn(comentariosService, 'criar').mockRejectedValueOnce(erro(404, 'Chamado não encontrado'));
    await montar();
    await digitarEm(campoComentario(), 'Meu comentário fictício');
    await clicar('Enviar Comentário');
    expect(texto()).toContain('não está mais disponível');
    expect(texto()).not.toContain('Descrição fictícia.');
    const preservados = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea[readonly]'));
    expect(preservados.map((t) => t.value)).toContain('Meu comentário fictício');
  });

  it('18. nova tentativa manual: só pelo clique, e o sucesso apaga o aviso', async () => {
    atualizar.mockRejectedValueOnce(erro(500)).mockImplementationOnce(async (_id, dados) => {
      noServidor[1] = { ...noServidor[1], ...dados } as Chamado;
      return noServidor[1];
    });
    await montar();
    await clicar('Editar Detalhes');
    await digitarEm(campoSolucao(), SOLUCAO);
    await clicar('Salvar');
    expect(atualizar).toHaveBeenCalledTimes(1);
    expect(texto()).toContain(MENSAGEM_INCERTA);
    await clicar('Salvar');
    expect(atualizar).toHaveBeenCalledTimes(2);
    expect(texto()).not.toContain(MENSAGEM_INCERTA);
    expect(botao('Editar Detalhes')).toBeTruthy();
  });

  it('19. troca de chamado: a falha e a recusa do anterior não acompanham', async () => {
    atualizar.mockRejectedValueOnce(erro(403));
    await montar();
    await clicar('Aguardando Retorno');
    expect(texto()).toContain(MENSAGEM_RECUSA);
    await act(async () => navegar('/chamados/2'));
    expect(texto()).toContain('Outro chamado fictício');
    expect(texto()).not.toContain(MENSAGEM_RECUSA);
    expect(botao('Aguardando Retorno')?.disabled).toBe(false);
  });

  it('20. troca de usuário ou logout: nada digitado vai para o armazenamento, e a outra conta não vê', async () => {
    await editarESalvar(erro(500));
    expect(campoSolucao()?.value).toBe(SOLUCAO);
    const guardado = Object.keys(localStorage)
      .map((k) => localStorage.getItem(k) ?? '')
      .join('|');
    expect(guardado).not.toContain(SOLUCAO);
    // Outra conta (a tela é remontada, como no logout seguido de login).
    act(() => root.unmount());
    root = createRoot(host);
    await montar(sessao(1));
    expect(campoSolucao()).toBeNull();
    expect(texto()).not.toContain(SOLUCAO);
    expect(texto()).not.toContain(MENSAGEM_INCERTA);
  });
});

describe('C4 na página — a primeira leitura recusada e a confirmação que volta', () => {
  // Achado da homologação real (API-11 local): conta desativada restaurada,
  // GET do chamado 403, aviso no lugar da página; a conta é reativada, a
  // confirmação dá certo por um clique, e a página ficava no aviso velho.
  const semConfirmacao = () =>
    ({
      ...sessao(),
      identidadeConfirmada: false,
      falhaAoConfirmar: true,
      confirmacaoRecusada: true,
    }) as unknown as React.ContextType<typeof AuthContext>;

  it('21. depois da confirmação que volta, a página relê o chamado uma vez', async () => {
    const buscar = vi.mocked(chamadosService.buscar);
    buscar.mockRejectedValueOnce(erro(403, 'Usuário inativo'));
    await montar(semConfirmacao());
    expect(texto()).not.toContain('Chamado fictício das falhas');
    const antes = buscar.mock.calls.length;
    await montar(sessao());
    paginaDePe();
    expect(buscar.mock.calls.length).toBe(antes + 1);
    // Outra confirmação, já com o chamado na tela, não relê por conta própria.
    await montar(sessao());
    expect(buscar.mock.calls.length).toBe(antes + 1);
  });

  it('22. sem a confirmação voltar, nada é relido sozinho', async () => {
    const buscar = vi.mocked(chamadosService.buscar);
    buscar.mockRejectedValueOnce(erro(403, 'Usuário inativo'));
    await montar(semConfirmacao());
    const antes = buscar.mock.calls.length;
    await montar(semConfirmacao());
    expect(buscar.mock.calls.length).toBe(antes);
    expect(texto()).not.toContain('Chamado fictício das falhas');
  });
});
