import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, useContext } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import api, { MENSAGEM_SESSAO_ALTERADA, SessaoAlteradaError } from '../services/api';
import {
  categoriasService,
  chamadosService,
  slaConfigsService,
  usuariosService,
} from '../services/chamadoshsapi';
import { AuthContext, AuthProvider } from './AuthContext';
import { ChamadosProvider } from './ChamadosContext';
import { ThemeProvider } from './ThemeContext';
import NovoChamadoForm from '../components/NovoChamadoForm';

/**
 * A sessão entre abas (AUTH-01).
 *
 * ── O defeito que este arquivo trava ─────────────────────────────────
 *
 * O `localStorage` é um só para todas as abas; a identidade da tela é de cada
 * aba. Até a correção, outra aba que entrava com outra conta trocava o token
 * de todas, e a aba antiga seguia mostrando a conta A enquanto requisitava
 * como B. Reproduzido em 24/11/2026: o formulário de novo chamado, aberto
 * como A, preparava `solicitante_id` de A com o token de B — e a API aceita
 * esse corpo quando B é administrador.
 *
 * ── Como as abas são simuladas ───────────────────────────────────────
 *
 * A aba 1 é a árvore React montada aqui. A aba 2 é escrever no
 * `localStorage` e disparar o evento `storage`, que é o que o navegador
 * entrega à aba 1. Nada sai para a rede: a instância `api` usa um adaptador
 * em memória que registra o que SERIA enviado, e o axios puro, o `fetch` e o
 * `XMLHttpRequest` contam a tentativa e falham.
 *
 * O jsdom não tem abas de verdade: o que se prova aqui é a reação ao evento
 * e a guarda das requisições, não o navegador.
 */

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Contas fictícias. A: usuário comum. B: administrador humano.
const ME_A = { id: 7, nome: 'usuario.ficticio.a', setor_id: 1, role_id: 3, ativo: true };
const ME_B = { id: 1, nome: 'admin.ficticio.b', setor_id: 1, role_id: 1, ativo: true };

const TOKEN_A = 'token-ficticio-A';
const TOKEN_A2 = 'token-ficticio-A-renovado';
const TOKEN_B = 'token-ficticio-B';

// De quem é cada token, como a API responderia no `/auth/me`.
let donos: Record<string, typeof ME_A>;

type Pedido = { metodo: string; url: string; autorizacao: string | null; corpo: unknown };
let pedidos: Pedido[] = [];
let tentativasDeRede = 0;
/** Quando definido, o próximo `/auth/me` espera por esta promessa. */
let seguraMe: Promise<void> | null = null;
/** Quando verdadeiro, o `/auth/me` falha como rede. */
let meForaDoAr = false;
/** A próxima requisição para a URL espera por esta promessa antes de responder. */
let seguraUrl: Record<string, Promise<void> | undefined> = {};
/** URLs a que a API responde 401. */
let responde401 = new Set<string>();
/** Tokens que a API não aceita mais: qualquer requisição com eles recebe 401. */
let tokensRecusados = new Set<string>();

const adaptador = async (config: InternalAxiosRequestConfig) => {
  const autorizacao = (config.headers?.get?.('Authorization') as string | undefined) ?? null;
  const url = config.url ?? '';
  const metodo = (config.method ?? 'get').toLowerCase();
  const corpo = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? null);
  pedidos.push({ metodo, url, autorizacao, corpo });

  if (seguraUrl[url]) {
    const espera = seguraUrl[url];
    delete seguraUrl[url];
    await espera;
  }
  if (responde401.has(url) || tokensRecusados.has((autorizacao ?? '').replace('Bearer ', ''))) {
    throw new AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', config, null, {
      status: 401,
      statusText: 'Unauthorized',
      data: { detail: 'Token inválido' },
      headers: {},
      config,
    } as never);
  }

  let data: unknown = [];
  if (url === '/auth/me') {
    if (meForaDoAr) throw new Error('Network Error');
    if (seguraMe) {
      const espera = seguraMe;
      seguraMe = null;
      await espera;
    }
    data = donos[(autorizacao ?? '').replace('Bearer ', '')] ?? ME_A;
  } else if (url === '/auth/login') {
    data = { access_token: TOKEN_B, token_type: 'bearer', user_id: ME_B.id, nome: ME_B.nome, role: 'Administrador' };
  } else if (url.startsWith('/usuarios/')) {
    data = { id: ME_B.id, conta_de_servico: false };
  } else if (metodo === 'post' && url === '/chamados/') {
    data = { id: 99, protocolo: 'CHAM-FICTICIO', ...(corpo as object) };
  }

  return { data, status: 200, statusText: 'OK', headers: {}, config };
};

type Contexto = React.ContextType<typeof AuthContext>;
let visto: Contexto;
const Leitor: React.FC = () => {
  visto = useContext(AuthContext);
  return null;
};

let host: HTMLDivElement;
let root: Root;
let aoCriar: ReturnType<typeof vi.fn>;

const assentar = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const montar = async (comFormulario = false) => {
  await act(async () => {
    root.render(
      <AuthProvider>
        <Leitor />
        {comFormulario && (
          <ThemeProvider>
            <ChamadosProvider>
              <NovoChamadoForm aoCriar={aoCriar} aoCancelar={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        )}
      </AuthProvider>
    );
  });
  await assentar();
};

const guardarSessaoA = (token = TOKEN_A) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({ id: ME_A.id, nome: ME_A.nome, role: 'Usuario' }));
};

/** O que a aba 1 recebe do navegador quando a aba 2 escreve. */
const avisar = async (key: string | null, oldValue: string | null, newValue: string | null) => {
  await act(async () => {
    window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue }));
  });
};

/** Outra aba troca o token (e a identidade guardada), com ou sem o aviso. */
const outraAbaGrava = async (
  token: string,
  dono: typeof ME_A,
  { comAviso = true }: { comAviso?: boolean } = {}
) => {
  const tokenAntes = localStorage.getItem('token');
  const userAntes = localStorage.getItem('user');
  const user = JSON.stringify({ id: dono.id, nome: dono.nome, role: 'x' });
  localStorage.setItem('token', token);
  localStorage.setItem('user', user);
  if (comAviso) {
    await avisar('token', tokenAntes, token);
    await avisar('user', userAntes, user);
    await assentar();
  }
};

/** Outra aba sai: o mesmo efeito do `authService.logout`. */
const outraAbaSai = async () => {
  const tokenAntes = localStorage.getItem('token');
  const userAntes = localStorage.getItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  await avisar('token', tokenAntes, null);
  await avisar('user', userAntes, null);
  await assentar();
};

const digitar = async (id: string, valor: string) => {
  const campo = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  expect(campo, `campo #${id} não apareceu`).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const escolherTI = async () => {
  const alvo = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (r) => r.closest('label')?.textContent?.trim().startsWith('TI')
  );
  expect(alvo, 'rádio "TI" não apareceu').toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const TITULO = 'Chamado ficticio de teste';

const preencher = async () => {
  await escolherTI();
  await digitar('titulo', TITULO);
  await digitar('descricao', 'Descricao ficticia com tamanho suficiente para validar.');
};

const enviar = async () => {
  const botao = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Abrir chamado'
  );
  expect(botao, 'botão de envio não apareceu').toBeTruthy();
  await act(async () => {
    botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await assentar();
};

const ultimo = (): Pedido | undefined => pedidos[pedidos.length - 1];
const pedidosPara = (url: string) => pedidos.filter((p) => p.url === url);
const envios = () => pedidos.filter((p) => p.metodo === 'post' && p.url === '/chamados/');

let adaptadorOriginalDaApi: typeof api.defaults.adapter;
let adaptadorOriginalDoAxios: typeof axios.defaults.adapter;

beforeEach(() => {
  pedidos = [];
  tentativasDeRede = 0;
  seguraMe = null;
  meForaDoAr = false;
  seguraUrl = {};
  responde401 = new Set();
  tokensRecusados = new Set();
  donos = { [TOKEN_A]: ME_A, [TOKEN_A2]: ME_A, [TOKEN_B]: ME_B };
  localStorage.clear();

  adaptadorOriginalDaApi = api.defaults.adapter;
  adaptadorOriginalDoAxios = axios.defaults.adapter;
  api.defaults.adapter = adaptador as never;
  axios.defaults.adapter = (async () => {
    tentativasDeRede += 1;
    throw new Error('rede bloqueada no teste');
  }) as never;
  vi.stubGlobal('fetch', () => {
    tentativasDeRede += 1;
    throw new Error('rede bloqueada no teste');
  });
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => {
    tentativasDeRede += 1;
    throw new Error('rede bloqueada no teste');
  });

  // O que o formulário consulta ao montar e não interessa aqui.
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(slaConfigsService, 'listar').mockResolvedValue([]);
  vi.spyOn(chamadosService, 'listarAtendentesQualidade').mockRejectedValue({
    isAxiosError: true,
    response: { status: 422, data: {} },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  aoCriar = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  api.defaults.adapter = adaptadorOriginalDaApi;
  axios.defaults.adapter = adaptadorOriginalDoAxios;
  vi.unstubAllGlobals();
  expect(tentativasDeRede, 'houve tentativa de rede real').toBe(0);
});

describe('sem outra aba, nada muda', () => {
  it('a tela mostra A, e leitura e escrita saem com o token de A', async () => {
    guardarSessaoA();
    await montar();

    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.identidadeConfirmada).toBe(true);
    expect(visto.sessaoAlterada).toBeNull();

    await api.get('/sonda');
    await api.post('/sonda', { x: 1 });
    expect(pedidos.slice(-2).map((p) => p.autorizacao)).toStrictEqual([
      `Bearer ${TOKEN_A}`,
      `Bearer ${TOKEN_A}`,
    ]);
  });
});

describe('outra aba entra com outra conta', () => {
  it('a aba para e diz qual conta entrou — não segue calada como A', async () => {
    guardarSessaoA();
    await montar();

    await outraAbaGrava(TOKEN_B, ME_B);

    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
    // Quem decidiu foi a API: um `/auth/me` com o token novo, e só um.
    const conferencias = pedidosPara('/auth/me').filter(
      (p) => p.autorizacao === `Bearer ${TOKEN_B}`
    );
    expect(conferencias).toHaveLength(1);
  });

  it('nada mais sai da aba: nem escrita, nem leitura, e sem perguntar de novo', async () => {
    guardarSessaoA();
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B);
    const antes = pedidos.length;

    await expect(api.post('/chamados/', { solicitante_id: ME_A.id })).rejects.toBeInstanceOf(
      SessaoAlteradaError
    );
    await expect(api.put('/chamados/5', {})).rejects.toBeInstanceOf(SessaoAlteradaError);
    await expect(api.delete('/chamados/5')).rejects.toBeInstanceOf(SessaoAlteradaError);
    await expect(api.get('/chamados/')).rejects.toThrow(MENSAGEM_SESSAO_ALTERADA);

    expect(pedidos.length).toBe(antes);
  });

  it('o `user` guardado não decide: gravar o id de A ao lado do token de B não libera', async () => {
    guardarSessaoA();
    await montar();

    // Uma aba mal-intencionada (ou um defeito) deixa o `user` de A com o token de B.
    localStorage.setItem('token', TOKEN_B);
    await avisar('token', TOKEN_A, TOKEN_B);
    await assentar();

    expect(JSON.parse(localStorage.getItem('user')!).id).toBe(ME_A.id);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
    await expect(api.post('/sonda', {})).rejects.toBeInstanceOf(SessaoAlteradaError);
  });

  it('a mesma conta volta a entrar em outra aba: a aba destrava', async () => {
    guardarSessaoA();
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B);
    expect(visto.sessaoAlterada).not.toBeNull();

    await outraAbaGrava(TOKEN_A2, ME_A);

    expect(visto.sessaoAlterada).toBeNull();
    expect(visto.user?.id).toBe(ME_A.id);
    await api.post('/sonda', {});
    expect(ultimo()?.autorizacao).toBe(`Bearer ${TOKEN_A2}`);
  });
});

describe('outra aba sai', () => {
  it('a sessão exibida acaba na hora, sem nenhuma requisição', async () => {
    guardarSessaoA();
    await montar();
    const antes = pedidos.length;

    await outraAbaSai();

    expect(visto.user).toBeNull();
    expect(visto.token).toBeNull();
    expect(visto.identidadeConfirmada).toBe(false);
    expect(visto.sessaoAlterada).toBeNull();
    expect(pedidos.length).toBe(antes);
  });

  it('`localStorage.clear()` em outra aba (evento sem chave) também encerra', async () => {
    guardarSessaoA();
    await montar();

    localStorage.clear();
    await avisar(null, null, null);
    await assentar();

    expect(visto.user).toBeNull();
  });

  it('sai mesmo com a aba parada por troca de conta', async () => {
    guardarSessaoA();
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B);

    await outraAbaSai();

    expect(visto.user).toBeNull();
    expect(visto.sessaoAlterada).toBeNull();
  });
});

describe('renovação do token da mesma conta', () => {
  it('feita por outra aba: sem logout, sem aviso, e as requisições seguem com o token novo', async () => {
    guardarSessaoA();
    await montar();

    await outraAbaGrava(TOKEN_A2, ME_A);

    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.token).toBe(TOKEN_A2);
    expect(visto.identidadeConfirmada).toBe(true);
    expect(visto.sessaoAlterada).toBeNull();

    await api.post('/sonda', {});
    expect(ultimo()?.autorizacao).toBe(`Bearer ${TOKEN_A2}`);
  });

  it('feita por outra aba, com o formulário aberto: o que foi digitado fica e o envio sai', async () => {
    guardarSessaoA();
    await montar(true);
    await preencher();

    await outraAbaGrava(TOKEN_A2, ME_A);

    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(TITULO);
    await enviar();

    expect(envios()).toHaveLength(1);
    expect((envios()[0].corpo as { solicitante_id: number }).solicitante_id).toBe(ME_A.id);
    expect(envios()[0].autorizacao).toBe(`Bearer ${TOKEN_A2}`);
    expect(aoCriar).toHaveBeenCalledTimes(1);
  });

  it('o aviso de `storage` ainda não chegou: a requisição espera a conferência e segue', async () => {
    guardarSessaoA();
    await montar();

    await outraAbaGrava(TOKEN_A2, ME_A, { comAviso: false });
    await act(async () => {
      await api.post('/sonda', {});
    });

    expect(ultimo()).toMatchObject({ url: '/sonda', autorizacao: `Bearer ${TOKEN_A2}` });
    expect(visto.sessaoAlterada).toBeNull();
  });

  it('feita por esta aba: a guarda acompanha o token novo', async () => {
    const perto = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }));
    const tokenVencendo = `c.${perto}.a`;
    donos[tokenVencendo] = ME_A;
    guardarSessaoA(tokenVencendo);
    // A renovação usa o axios puro; aqui ela responde em memória.
    const renovar = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: TOKEN_A2, user_id: ME_A.id, nome: ME_A.nome, role: 'Usuario' },
    });

    await montar();
    await act(async () => {
      await api.post('/sonda', {});
    });

    expect(renovar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBe(TOKEN_A2);
    expect(ultimo()).toMatchObject({ url: '/sonda', autorizacao: `Bearer ${TOKEN_A2}` });
    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.sessaoAlterada).toBeNull();
  });
});

describe('formulário aberto durante a troca de conta', () => {
  it('o envio não sai, ninguém é avisado de sucesso, e o que foi digitado continua', async () => {
    guardarSessaoA();
    await montar(true);
    await preencher();

    await outraAbaGrava(TOKEN_B, ME_B);
    await enviar();

    expect(envios()).toHaveLength(0);
    expect(aoCriar).not.toHaveBeenCalled();
    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(TITULO);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });

  it('mesmo se o aviso de `storage` não chegar antes do clique', async () => {
    guardarSessaoA();
    await montar(true);
    await preencher();

    await outraAbaGrava(TOKEN_B, ME_B, { comAviso: false });
    await enviar();

    expect(envios()).toHaveLength(0);
    expect(aoCriar).not.toHaveBeenCalled();
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });
});

describe('a guarda das requisições, sem o aviso de `storage`', () => {
  it('token de outra conta: a escrita é recusada depois de UMA pergunta à API', async () => {
    guardarSessaoA();
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B, { comAviso: false });

    let erro: unknown;
    await act(async () => {
      erro = await api.post('/chamados/', { solicitante_id: ME_A.id }).catch((e) => e);
    });

    expect(erro).toBeInstanceOf(SessaoAlteradaError);
    expect(envios()).toHaveLength(0);
    expect(pedidosPara('/auth/me').filter((p) => p.autorizacao === `Bearer ${TOKEN_B}`)).toHaveLength(1);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });

  it('token sumiu: a requisição não sai sem credencial, e a aba encerra a sessão', async () => {
    guardarSessaoA();
    await montar();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const antes = pedidos.length;

    let erro: unknown;
    await act(async () => {
      erro = await api.post('/sonda', {}).catch((e) => e);
    });

    // Sem sessão na aba a guarda sai do caminho; a requisição segue sem
    // credencial, e a API responderia 401 — o caminho de sempre.
    expect(erro).not.toBeInstanceOf(SessaoAlteradaError);
    expect(visto.user).toBeNull();
    expect(pedidos.length).toBe(antes + 1);
    expect(ultimo()?.autorizacao).toBeNull();
  });

  it('a API não responde à conferência: nada é liberado, e a tentativa seguinte pergunta de novo', async () => {
    guardarSessaoA();
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B, { comAviso: false });
    meForaDoAr = true;

    await expect(api.post('/sonda', {})).rejects.toBeInstanceOf(SessaoAlteradaError);
    expect(visto.sessaoAlterada).toBeNull();
    expect(pedidosPara('/sonda')).toHaveLength(0);

    // A API volta, e era a mesma conta com token novo? Não: é B. Para.
    meForaDoAr = false;
    let erro: unknown;
    await act(async () => {
      erro = await api.post('/sonda', {}).catch((e) => e);
    });
    expect(erro).toBeInstanceOf(SessaoAlteradaError);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });
});

describe('respostas atrasadas', () => {
  it('a conferência de B chega depois de a outra aba sair: não devolve sessão nem aviso', async () => {
    guardarSessaoA();
    await montar();

    let soltar!: () => void;
    seguraMe = new Promise<void>((r) => {
      soltar = r;
    });
    await outraAbaGrava(TOKEN_B, ME_B);
    expect(visto.sessaoAlterada).toBeNull(); // ainda perguntando

    await outraAbaSai();
    await act(async () => {
      soltar();
    });
    await assentar();

    expect(visto.user).toBeNull();
    expect(visto.sessaoAlterada).toBeNull();
  });

  it('o `/auth/me` de A, pendente desde antes da troca, não desfaz a parada', async () => {
    guardarSessaoA();
    await montar();

    let soltar!: () => void;
    seguraMe = new Promise<void>((r) => {
      soltar = r;
    });
    // Uma revalidação comum sai com o token de A e fica pendurada.
    let pendente!: Promise<void>;
    act(() => {
      pendente = visto.revalidarIdentidade();
    });
    await assentar();

    await outraAbaGrava(TOKEN_B, ME_B);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });

    await act(async () => {
      soltar();
      await pendente;
    });

    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
    await expect(api.post('/sonda', {})).rejects.toBeInstanceOf(SessaoAlteradaError);
  });

  it('enquanto a conferência não responde, a escrita espera — e é recusada quando a resposta é B', async () => {
    guardarSessaoA();
    await montar();

    let soltar!: () => void;
    seguraMe = new Promise<void>((r) => {
      soltar = r;
    });
    await outraAbaGrava(TOKEN_B, ME_B);

    const escrita = api.post('/chamados/', { solicitante_id: ME_A.id }).catch((e) => e);
    await assentar();
    expect(envios()).toHaveLength(0);

    await act(async () => {
      soltar();
    });
    expect(await escrita).toBeInstanceOf(SessaoAlteradaError);
    expect(envios()).toHaveLength(0);
  });
});

describe('login e logout nesta aba continuam como antes', () => {
  it('login: a aba passa a ser de quem entrou, e as escritas saem com o token dele', async () => {
    await montar();
    expect(visto.user).toBeNull();

    await act(async () => {
      await visto.login('admin.ficticio.b', 'senha-ficticia');
    });

    expect(visto.user?.id).toBe(ME_B.id);
    expect(visto.identidadeConfirmada).toBe(true);
    expect(visto.sessaoAlterada).toBeNull();
    await api.post('/sonda', {});
    expect(ultimo()?.autorizacao).toBe(`Bearer ${TOKEN_B}`);
  });

  it('trocar de conta NESTA aba não para a aba', async () => {
    guardarSessaoA();
    await montar();

    await act(async () => {
      await visto.login('admin.ficticio.b', 'senha-ficticia');
    });

    expect(visto.user?.id).toBe(ME_B.id);
    expect(visto.sessaoAlterada).toBeNull();
    await api.post('/sonda', {});
    expect(ultimo()?.autorizacao).toBe(`Bearer ${TOKEN_B}`);
  });

  it('logout: a sessão acaba, e a guarda sai do caminho', async () => {
    guardarSessaoA();
    await montar();

    act(() => visto.logout());

    expect(visto.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    await api.get('/sonda');
    expect(ultimo()?.autorizacao).toBeNull();
  });
});

/**
 * D6 — homologado em Chromium em 25/11/2026: a aba que estava na tela de
 * login ADOTAVA a sessão aberta em outra aba e ia sozinha para o painel dela.
 * Pela interface, toda troca de conta passa por aqui (a outra aba sai, depois
 * entra), então este era o caminho comum, não a exceção.
 */
describe('aba sem sessão: o login de outra aba não é adotado (D6)', () => {
  it('outra aba entra: esta continua sem sessão, e não pergunta nada à API', async () => {
    await montar();
    expect(visto.user).toBeNull();
    const antes = pedidos.length;

    await outraAbaGrava(TOKEN_B, ME_B);

    expect(visto.user).toBeNull();
    expect(visto.token).toBeNull();
    expect(visto.identidadeConfirmada).toBe(false);
    expect(visto.sessaoAlterada).toBeNull();
    expect(pedidos.length).toBe(antes);
    // A sessão da outra aba fica onde está.
    expect(localStorage.getItem('token')).toBe(TOKEN_B);
  });

  it('o token alheio não sai em requisição nenhuma desta aba', async () => {
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B);

    await api.get('/sonda');
    await api.post('/sonda', {});

    expect(pedidos.slice(-2).map((p) => p.autorizacao)).toStrictEqual([null, null]);
  });

  it('a outra aba sai e entra com outra conta: quem era A fica no login, não vira B', async () => {
    guardarSessaoA();
    await montar();
    expect(visto.user?.id).toBe(ME_A.id);

    await outraAbaSai();
    await outraAbaGrava(TOKEN_B, ME_B);

    expect(visto.user).toBeNull();
    expect(visto.sessaoAlterada).toBeNull();
    expect(pedidosPara('/auth/me').filter((p) => p.autorizacao === `Bearer ${TOKEN_B}`)).toHaveLength(0);
  });

  it('entrar NESTA aba continua funcionando depois de recusar a sessão alheia', async () => {
    await montar();
    await outraAbaGrava(TOKEN_A, ME_A);
    expect(visto.user).toBeNull();

    await act(async () => {
      await visto.login('admin.ficticio.b', 'senha-ficticia');
    });

    expect(visto.user?.id).toBe(ME_B.id);
    expect(visto.identidadeConfirmada).toBe(true);
    await api.post('/sonda', {});
    expect(ultimo()?.autorizacao).toBe(`Bearer ${TOKEN_B}`);
  });

  it('senha errada nesta aba: o token alheio continua sem ser usado, e fica intacto', async () => {
    await montar();
    await outraAbaGrava(TOKEN_A, ME_A);
    responde401.add('/auth/login');

    await act(async () => {
      await visto.login('admin.ficticio.b', 'senha-errada');
    });

    expect(visto.user).toBeNull();
    expect(visto.error).toBe('Usuário ou senha incorretos.');
    expect(localStorage.getItem('token')).toBe(TOKEN_A);
    await api.get('/sonda');
    expect(ultimo()?.autorizacao).toBeNull();
  });

  it('recarregar é a decisão explícita: a montagem restaura a sessão que está no navegador', async () => {
    localStorage.setItem('token', TOKEN_B);
    localStorage.setItem('user', JSON.stringify({ id: ME_B.id, nome: ME_B.nome, role: 'Administrador' }));

    await montar();

    expect(visto.user?.id).toBe(ME_B.id);
    expect(visto.identidadeConfirmada).toBe(true);
  });
});

/**
 * D1 — entre a guarda aprovar a sessão e o token ir para o cabeçalho havia
 * uma segunda leitura do navegador (e, na renovação, uma espera de rede).
 */
describe('o token do cabeçalho é o que foi conferido (D1)', () => {
  it('outra conta entra entre a conferência e a escolha do token: o token dela não sai', async () => {
    guardarSessaoA();
    await montar();

    // A primeira leitura (a da guarda) vê A; a troca acontece antes da segunda.
    const original = Storage.prototype.getItem;
    let leituras = 0;
    const espia = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      chave: string
    ) {
      if (chave === 'token') {
        leituras += 1;
        if (leituras === 2) {
          localStorage.setItem('token', TOKEN_B);
          localStorage.setItem('user', JSON.stringify({ id: ME_B.id, nome: ME_B.nome, role: 'x' }));
        }
      }
      return original.call(this, chave);
    });

    let erro: unknown;
    await act(async () => {
      erro = await api.post('/chamados/', { solicitante_id: ME_A.id }).catch((e) => e);
    });
    espia.mockRestore();

    expect(leituras).toBeGreaterThanOrEqual(2);
    expect(erro).toBeInstanceOf(SessaoAlteradaError);
    expect(envios()).toHaveLength(0);
    expect(pedidos.filter((p) => p.url !== '/auth/me' && p.autorizacao === `Bearer ${TOKEN_B}`)).toHaveLength(0);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });

  it('sem troca nenhuma, uma leitura a mais não muda nada: sai com o token de A', async () => {
    guardarSessaoA();
    await montar();

    await api.post('/sonda', {});

    expect(ultimo()).toMatchObject({ url: '/sonda', autorizacao: `Bearer ${TOKEN_A}` });
  });
});

/** D2 — a renovação que termina depois de a sessão do navegador ter mudado. */
describe('renovação atrasada não sobrescreve a sessão nova (D2)', () => {
  const sessaoPertoDeVencer = () => {
    const perto = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }));
    const tokenVencendo = `c.${perto}.a`;
    donos[tokenVencendo] = ME_A;
    guardarSessaoA(tokenVencendo);
    return tokenVencendo;
  };
  const respostaDaRenovacao = {
    data: { access_token: TOKEN_A2, user_id: ME_A.id, nome: ME_A.nome, role: 'Usuario' },
  };

  it('B entra em outra aba durante a renovação de A: a sessão de B fica, e a aba de A para', async () => {
    sessaoPertoDeVencer();
    const renovar = vi.spyOn(axios, 'post').mockImplementation(async () => {
      // Enquanto o pedido de renovação anda, a outra aba entra como B.
      await outraAbaGrava(TOKEN_B, ME_B, { comAviso: false });
      return respostaDaRenovacao;
    });
    await montar();

    let erro: unknown;
    await act(async () => {
      erro = await api.post('/chamados/', { solicitante_id: ME_A.id }).catch((e) => e);
    });

    expect(renovar).toHaveBeenCalledTimes(1);
    // A renovação de A não foi gravada por cima.
    expect(localStorage.getItem('token')).toBe(TOKEN_B);
    expect(JSON.parse(localStorage.getItem('user')!).id).toBe(ME_B.id);
    // E a aba de A reconhece a troca: nada sai, e ela para.
    expect(erro).toBeInstanceOf(SessaoAlteradaError);
    expect(envios()).toHaveLength(0);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });

  it('a outra aba sai durante a renovação: o token renovado não ressuscita a sessão', async () => {
    sessaoPertoDeVencer();
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return respostaDaRenovacao;
    });
    await montar();

    await act(async () => {
      await api.get('/sonda').catch(() => {});
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(visto.user).toBeNull();
  });

  it('a outra aba renova a MESMA conta durante a renovação daqui: vale o token dela, sem aviso', async () => {
    const TOKEN_A3 = 'token-ficticio-A-renovado-pela-outra';
    donos[TOKEN_A3] = ME_A;
    sessaoPertoDeVencer();
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      await outraAbaGrava(TOKEN_A3, ME_A, { comAviso: false });
      return respostaDaRenovacao;
    });
    await montar();

    await act(async () => {
      await api.post('/sonda', {});
    });

    expect(localStorage.getItem('token')).toBe(TOKEN_A3);
    expect(ultimo()).toMatchObject({ url: '/sonda', autorizacao: `Bearer ${TOKEN_A3}` });
    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.sessaoAlterada).toBeNull();
  });

  it('renovação normal, sem ninguém no meio: grava o token novo e a requisição segue com ele', async () => {
    sessaoPertoDeVencer();
    const renovar = vi.spyOn(axios, 'post').mockResolvedValue(respostaDaRenovacao);
    await montar();

    await act(async () => {
      await api.post('/sonda', {});
    });

    expect(renovar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBe(TOKEN_A2);
    expect(ultimo()).toMatchObject({ url: '/sonda', autorizacao: `Bearer ${TOKEN_A2}` });
    expect(visto.sessaoAlterada).toBeNull();
  });
});

/** D3 — o 401 de uma requisição que saiu com a sessão antiga. */
describe('401 atrasado não apaga a sessão nova (D3)', () => {
  const localizacaoOriginal = window.location;
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '', pathname: '/chamados' },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: localizacaoOriginal,
    });
  });

  it('a requisição de A responde 401 depois de B entrar: a sessão de B fica inteira, e a aba de A para', async () => {
    guardarSessaoA();
    await montar();

    let soltar!: () => void;
    seguraUrl['/lento'] = new Promise<void>((r) => {
      soltar = r;
    });
    responde401.add('/lento');
    const antiga = api.get('/lento').catch((e) => e);
    await assentar();
    expect(ultimo()).toMatchObject({ url: '/lento', autorizacao: `Bearer ${TOKEN_A}` });

    await outraAbaGrava(TOKEN_B, ME_B, { comAviso: false });
    await act(async () => {
      soltar();
      await antiga;
    });
    await assentar();

    expect(localStorage.getItem('token')).toBe(TOKEN_B);
    expect(JSON.parse(localStorage.getItem('user')!).id).toBe(ME_B.id);
    expect(window.location.href).toBe('');
    // A aba antiga reage como em qualquer troca de conta: para e avisa.
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
    await expect(api.post('/sonda', {})).rejects.toBeInstanceOf(SessaoAlteradaError);
  });

  it('401 legítimo, da sessão atual: limpa a sessão e leva ao login, como sempre', async () => {
    guardarSessaoA();
    await montar();
    responde401.add('/protegido');

    await act(async () => {
      await api.get('/protegido').catch(() => {});
    });

    expect(ultimo()).toMatchObject({ url: '/protegido', autorizacao: `Bearer ${TOKEN_A}` });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('401 de requisição sem credencial, numa aba que recusou a sessão alheia: a sessão da outra aba fica', async () => {
    await montar();
    await outraAbaGrava(TOKEN_B, ME_B);
    responde401.add('/protegido');

    await act(async () => {
      await api.get('/protegido').catch(() => {});
    });

    expect(ultimo()).toMatchObject({ url: '/protegido', autorizacao: null });
    expect(localStorage.getItem('token')).toBe(TOKEN_B);
    expect(window.location.href).toBe('');
  });
});

/**
 * O 401 atrasado do PRÓPRIO `/auth/me` de revalidação (Fase 8).
 *
 * O interceptor já não apagava a sessão nova (D3), mas o `AuthContext`
 * tratava o 401 como "a sessão desta aba acabou" e tirava a identidade da
 * tela: a aba ia para o login por causa de uma resposta que era da sessão
 * anterior, antes de a conferência dizer o que tinha acontecido.
 */
describe('401 atrasado no `/auth/me` de revalidação', () => {
  const localizacaoOriginal = window.location;
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '', pathname: '/chamados' },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: localizacaoOriginal,
    });
  });

  /** A revalidação de A sai e fica pendurada; devolve como soltá-la. */
  const revalidacaoPendente = async () => {
    let soltar!: () => void;
    seguraUrl['/auth/me'] = new Promise<void>((r) => {
      soltar = r;
    });
    let pendente!: Promise<void>;
    act(() => {
      pendente = visto.revalidarIdentidade();
    });
    await assentar();
    expect(ultimo()).toMatchObject({ url: '/auth/me', autorizacao: `Bearer ${TOKEN_A}` });
    return async () => {
      await act(async () => {
        soltar();
        await pendente;
      });
      await assentar();
    };
  };

  it('B entra antes de a resposta chegar, sem o aviso de `storage`: a aba para com o aviso, não vai ao login', async () => {
    guardarSessaoA();
    await montar();
    const soltar = await revalidacaoPendente();

    await outraAbaGrava(TOKEN_B, ME_B, { comAviso: false });
    tokensRecusados.add(TOKEN_A);
    await soltar();

    // A sessão de B fica inteira, e nada redireciona.
    expect(localStorage.getItem('token')).toBe(TOKEN_B);
    expect(JSON.parse(localStorage.getItem('user')!).id).toBe(ME_B.id);
    expect(window.location.href).toBe('');
    // A identidade da tela não é tirada por uma resposta da sessão anterior,
    // nem trocada pela de B: a aba para, mostrando A, com o aviso.
    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
    // E nada sai dela.
    await expect(api.post('/chamados/', { solicitante_id: ME_A.id })).rejects.toBeInstanceOf(
      SessaoAlteradaError
    );
    expect(envios()).toHaveLength(0);
  });

  it('B entra e o aviso de `storage` chega antes da resposta: o mesmo resultado', async () => {
    guardarSessaoA();
    await montar();
    const soltar = await revalidacaoPendente();

    await outraAbaGrava(TOKEN_B, ME_B);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
    tokensRecusados.add(TOKEN_A);
    await soltar();

    expect(localStorage.getItem('token')).toBe(TOKEN_B);
    expect(window.location.href).toBe('');
    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.sessaoAlterada).toStrictEqual({ conta: ME_B.nome });
  });

  it('a mesma conta foi renovada em outra aba e o token antigo recebe 401: a sessão segue, sem logout', async () => {
    guardarSessaoA();
    await montar();
    const soltar = await revalidacaoPendente();

    await outraAbaGrava(TOKEN_A2, ME_A, { comAviso: false });
    tokensRecusados.add(TOKEN_A);
    await soltar();

    expect(localStorage.getItem('token')).toBe(TOKEN_A2);
    expect(window.location.href).toBe('');
    expect(visto.user?.id).toBe(ME_A.id);
    expect(visto.sessaoAlterada).toBeNull();
    await api.post('/sonda', {});
    expect(ultimo()).toMatchObject({ url: '/sonda', autorizacao: `Bearer ${TOKEN_A2}` });
  });

  it('401 legítimo — o token desta aba não vale mais e ninguém trocou a sessão: sai, como sempre', async () => {
    guardarSessaoA();
    await montar();
    tokensRecusados.add(TOKEN_A);

    await act(async () => {
      await visto.revalidarIdentidade();
    });
    await assentar();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');
    expect(visto.sessaoAlterada).toBeNull();
  });
});
