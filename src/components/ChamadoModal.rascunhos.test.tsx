import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { useChamados } from '../hooks/useChamados';
import {
  chamadosService,
  comentariosService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, Comentario, SetorDestinoEnum, StatusEnum, Usuario } from '../types/api';
import { MENSAGEM_SEM_ACESSO } from '../lib/acesso';
import ChamadoModal from './ChamadoModal';

/**
 * Os rascunhos do modal durante as atualizações do quadro (FE-5).
 *
 * O defeito: o efeito de carga do modal dependia de `buscarChamado`, que
 * muda de identidade a cada mudança da lista do contexto. Mudar o status na
 * própria janela, salvar outro card ou reler o quadro refazia a carga — e o
 * comentário digitado, a solução do passo de resolução e a escolha de
 * interno iam embora.
 *
 * A política: o rascunho vale para esta abertura deste chamado. Fica nas
 * atualizações do mesmo chamado; sai ao enviar, ao abrir outro chamado e
 * ao fechar. Depois da perda de acesso, só ele fica, para copiar.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const base = {
  descricao: 'Descrição protegida',
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: 1,
  categoria_id: null,
  solucao: null,
  setor_destino: SetorDestinoEnum.TI,
  cancelado: false,
  arquivado: false,
  data_abertura: '2026-09-01T10:00:00',
};
const UM = { ...base, id: 1, titulo: 'Impressora do RH', protocolo: 'CHAM-2026-0301', status: StatusEnum.EM_ANDAMENTO } as unknown as Chamado;
const DOIS = { ...base, id: 2, titulo: 'Rede do almoxarifado', protocolo: 'CHAM-2026-0302', status: StatusEnum.ABERTO } as unknown as Chamado;

const ADMIN = {
  user: { id: 1, username: 'admin.ficticio', role: 'Administrador' },
  token: 'token-de-teste',
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
  identidadeConfirmada: true,
  falhaAoConfirmar: false,
  revalidarIdentidade: async () => {},
} as React.ContextType<typeof AuthContext>;

const NAO_ENCONTRADO = { response: { status: 404, data: { detail: 'Chamado não encontrado' } } };

let host: HTMLDivElement;
let root: Root;
let noServidor: Record<number, Chamado>;
let acessivel: boolean;
let atualizar: MockInstance<typeof chamadosService.atualizar>;
let criar: MockInstance<typeof comentariosService.criar>;
let contexto: ReturnType<typeof useChamados>;
let abrir: (id: number | null) => void;

const Sonda: React.FC = () => {
  contexto = useChamados();
  return null;
};

/** O quadro: escolhe qual chamado a janela mostra, como o `Chamados.tsx`. */
const Quadro: React.FC = () => {
  const [aberto, setAberto] = useState<number | null>(1);
  abrir = setAberto;
  return <ChamadoModal chamadoId={aberto} aoFechar={() => setAberto(null)} aoAbrirEmPagina={() => {}} />;
};

const montar = async () => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={ADMIN}>
        <ChamadosProvider>
          <Sonda />
          <Quadro />
        </ChamadosProvider>
      </AuthContext.Provider>
    );
  });
  await act(async () => {
    await contexto.carregarChamados();
  });
};

const campo = () =>
  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Novo comentário"]');

const digitarEm = async (el: HTMLTextAreaElement | null, valor: string) => {
  expect(el, 'campo não apareceu').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(el, valor);
    el!.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const clicar = async (texto: string) => {
  const alvo = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto
  );
  expect(alvo, `botão "${texto}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const caixaInterno = () =>
  Array.from(document.querySelectorAll('label'))
    .find((l) => l.textContent?.includes('Comentário interno'))
    ?.querySelector('input') as HTMLInputElement | undefined;

const texto = () => document.body.textContent ?? '';

beforeEach(() => {
  noServidor = { 1: { ...UM }, 2: { ...DOIS } };
  acessivel = true;
  for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
  }
  vi.spyOn(chamadosService, 'listarTodos').mockImplementation(async () => [noServidor[1], noServidor[2]]);
  vi.spyOn(chamadosService, 'buscar').mockImplementation(async (id: number) => {
    if (id === 1 && !acessivel) throw NAO_ENCONTRADO;
    return noServidor[id];
  });
  vi.spyOn(chamadosService, 'listarResponsaveisTI').mockResolvedValue([{ id: 1, nome: 'admin.ficticio' }]);
  atualizar = vi.spyOn(chamadosService, 'atualizar').mockImplementation(async (id, d) => {
    noServidor[id] = { ...noServidor[id], ...d } as Chamado;
    return noServidor[id];
  });
  criar = vi
    .spyOn(comentariosService, 'criar')
    .mockImplementation(async (d) => ({ id: 77, ...d, usuario_id: 1, created_at: '2026-09-02T10:00:00' }) as unknown as Comentario);
  vi.spyOn(comentariosService, 'listarPorChamado').mockImplementation(async (id: number) => {
    if (id === 1 && !acessivel) throw NAO_ENCONTRADO;
    return [];
  });
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'admin.ficticio', role_id: 1, ativo: true } as Usuario,
    { id: 2, nome: 'solicitante.ficticio', role_id: 3, ativo: true } as Usuario,
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

describe('modal — o rascunho nas atualizações do mesmo chamado', () => {
  it('mudar o status na própria janela: o comentário digitado fica', async () => {
    await montar();
    await digitarEm(campo(), 'Troquei o cabo, aguardando retorno');
    await clicar('Aguardando retorno');

    expect(atualizar).toHaveBeenCalledTimes(1);
    // O quadro recebeu a mudança…
    expect(contexto.chamados.find((c) => c.id === 1)?.status).toBe(StatusEnum.AGUARDANDO);
    // …e o texto ficou.
    expect(campo()?.value).toBe('Troquei o cabo, aguardando retorno');
  });

  it('o quadro relido: o comentário fica', async () => {
    await montar();
    await digitarEm(campo(), 'Rascunho em andamento');
    await act(async () => {
      await contexto.carregarChamados();
    });
    expect(campo()?.value).toBe('Rascunho em andamento');
  });

  it('outro card atualizado: o comentário fica, e o chamado da janela não troca', async () => {
    await montar();
    await digitarEm(campo(), 'Não perca isto');
    await act(async () => {
      contexto.aplicarChamado({ ...DOIS, status: StatusEnum.EM_ANDAMENTO });
    });
    expect(campo()?.value).toBe('Não perca isto');
    expect(texto()).toContain(UM.titulo);
    expect(texto()).not.toContain(DOIS.titulo);
  });

  it('versão nova do mesmo chamado no quadro: a janela a mostra, e o comentário fica', async () => {
    await montar();
    await digitarEm(campo(), 'Comentário pela metade');
    noServidor[1] = { ...noServidor[1], status: StatusEnum.AGUARDANDO } as Chamado;
    await act(async () => {
      await contexto.carregarChamados();
    });
    expect(campo()?.value).toBe('Comentário pela metade');
    // Os botões são os do status novo.
    const botoes = Array.from(document.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(botoes).toContain('Retomar atendimento');
    expect(botoes).not.toContain('Aguardando retorno');
  });

  it('nenhuma releitura do chamado a cada atualização do quadro', async () => {
    await montar();
    const leituras = vi.mocked(comentariosService.listarPorChamado).mock.calls.length;
    await act(async () => {
      await contexto.carregarChamados();
      contexto.aplicarChamado({ ...DOIS, status: StatusEnum.EM_ANDAMENTO });
    });
    expect(vi.mocked(comentariosService.listarPorChamado).mock.calls.length).toBe(leituras);
  });

  it('a solução no passo de resolução fica quando o quadro muda', async () => {
    await montar();
    await clicar('Marcar como resolvido');
    await digitarEm(document.querySelector<HTMLTextAreaElement>('#solucao-rapida'), 'Cabo de rede trocado no rack 2');
    await act(async () => {
      await contexto.carregarChamados();
    });
    expect(document.querySelector<HTMLTextAreaElement>('#solucao-rapida')?.value).toBe(
      'Cabo de rede trocado no rack 2'
    );
  });

  it('a escolha de interno fica quando o quadro muda', async () => {
    await montar();
    await act(async () => {
      caixaInterno()!.click();
    });
    await act(async () => {
      await contexto.carregarChamados();
    });
    expect(caixaInterno()?.checked).toBe(true);
  });
});

describe('modal — quando o rascunho sai', () => {
  it('envio confirmado: o campo limpa', async () => {
    await montar();
    await digitarEm(campo(), 'Enviado de verdade');
    await clicar('Comentar');
    expect(criar).toHaveBeenCalledTimes(1);
    expect(campo()?.value).toBe('');
  });

  it('erro no envio: o texto fica', async () => {
    await montar();
    await digitarEm(campo(), 'Vai falhar');
    criar.mockRejectedValueOnce({ response: { status: 500, data: { detail: 'Erro interno' } } });
    await clicar('Comentar');
    expect(campo()?.value).toBe('Vai falhar');
  });

  it('outro chamado: o rascunho não vai junto, nem volta', async () => {
    await montar();
    await digitarEm(campo(), 'Rascunho do chamado 1');
    await act(async () => abrir(2));
    expect(texto()).toContain(DOIS.titulo);
    expect(campo()?.value).toBe('');
    await act(async () => abrir(1));
    expect(texto()).toContain(UM.titulo);
    expect(campo()?.value).toBe('');
  });

  it('a resposta atrasada do chamado anterior não ocupa a janela do novo', async () => {
    let soltar!: (c: Chamado) => void;
    await montar();
    await act(async () => abrir(null));
    vi.mocked(chamadosService.buscar).mockImplementationOnce(() => new Promise((r) => (soltar = r)));
    // O 1 sai do cache do quadro para a busca passar pela API.
    await act(async () => contexto.removerChamado(1));
    await act(async () => abrir(1));
    await act(async () => abrir(2));
    await act(async () => soltar({ ...UM }));
    expect(texto()).toContain(DOIS.titulo);
    expect(texto()).not.toContain(UM.titulo);
  });

  it('perda de acesso: os dados do chamado saem, e o rascunho fica só para copiar', async () => {
    await montar();
    await digitarEm(campo(), 'Texto meu');
    acessivel = false;
    atualizar.mockRejectedValueOnce(NAO_ENCONTRADO);
    await clicar('Aguardando retorno');

    expect(texto()).toContain(MENSAGEM_SEM_ACESSO);
    expect(texto()).not.toContain(UM.titulo);
    expect(texto()).not.toContain('Descrição protegida');
    const copia = document.querySelector<HTMLTextAreaElement>('textarea[id^="rascunho-preservado"]');
    expect(copia?.value).toBe('Texto meu');
    expect(copia?.readOnly).toBe(true);
    expect(campo()).toBeNull();
  });
});
