import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import toast from 'react-hot-toast';
import api from './api';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

/**
 * Os interceptors são registrados no import do módulo. Para exercitá-los sem
 * subir um servidor, pegamos os handlers direto da instância do Axios e os
 * chamamos com erros forjados — é o mesmo caminho que o Axios percorre em
 * produção quando a API responde.
 */
const handlersRequisicao = (api.interceptors.request as any).handlers;
const handlersResposta = (api.interceptors.response as any).handlers;

const aoEnviar = handlersRequisicao[0].fulfilled;
const aoFalhar = handlersResposta[0].rejected;

function erroDaApi(status: number, url = '/chamados/', data?: unknown) {
  return {
    config: { url },
    response: { status, data },
  };
}

/** Monta um JWT de mentira cujo `exp` vence daqui a `minutos`. */
function tokenQueVenceEm(minutos: number, marca = 'tok'): string {
  const exp = Math.floor((Date.now() + minutos * 60_000) / 1000);
  const payload = btoa(JSON.stringify({ sub: '1', marca, exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `cabecalho.${payload}.assinatura`;
}

describe('interceptor de requisição', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('anexa o token do localStorage no header Authorization', async () => {
    localStorage.setItem('token', tokenQueVenceEm(300));

    const config = await aoEnviar({ headers: {}, url: '/chamados/' });

    expect(config.headers.Authorization).toMatch(/^Bearer /);
  });

  it('não inventa header quando não há token guardado', async () => {
    const config = await aoEnviar({ headers: {}, url: '/chamados/' });

    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('renovação preventiva do token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('não renova enquanto o token está longe de vencer', async () => {
    const enviar = vi.spyOn(axios, 'post');
    localStorage.setItem('token', tokenQueVenceEm(300));

    await aoEnviar({ headers: {}, url: '/chamados/' });

    expect(enviar).not.toHaveBeenCalled();
  });

  it('renova quando falta pouco e passa a usar o token novo', async () => {
    const tokenNovo = tokenQueVenceEm(380, 'renovado');
    const enviar = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: tokenNovo, user_id: 1, nome: 'Rickelme', role: 'Administrador' },
    } as never);

    localStorage.setItem('token', tokenQueVenceEm(5));

    const config = await aoEnviar({ headers: {}, url: '/chamados/' });

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBe(tokenNovo);
    expect(config.headers.Authorization).toBe(`Bearer ${tokenNovo}`);
  });

  // Uma tela que dispara várias chamadas ao mesmo tempo não pode abrir uma
  // renovação por chamada — todas compartilham a mesma promessa.
  it('renova uma única vez mesmo com várias requisições simultâneas', async () => {
    const tokenNovo = tokenQueVenceEm(380, 'renovado');
    const enviar = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access_token: tokenNovo, user_id: 1, nome: 'Rickelme', role: 'Administrador' },
    } as never);

    localStorage.setItem('token', tokenQueVenceEm(5));

    await Promise.all([
      aoEnviar({ headers: {}, url: '/chamados/' }),
      aoEnviar({ headers: {}, url: '/usuarios/' }),
      aoEnviar({ headers: {}, url: '/setores/' }),
    ]);

    expect(enviar).toHaveBeenCalledTimes(1);
  });

  // A renovação é uma tentativa oportunista: se falhar, a requisição do
  // usuário segue com o token atual em vez de morrer no caminho.
  it('segue com o token atual quando a renovação falha', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('rede fora'));

    const tokenAtual = tokenQueVenceEm(5);
    localStorage.setItem('token', tokenAtual);

    const config = await aoEnviar({ headers: {}, url: '/chamados/' });

    expect(config.headers.Authorization).toBe(`Bearer ${tokenAtual}`);
    expect(localStorage.getItem('token')).toBe(tokenAtual);
  });

  it('não tenta renovar com token malformado', async () => {
    const enviar = vi.spyOn(axios, 'post');
    localStorage.setItem('token', 'isto-nao-e-um-jwt');

    const config = await aoEnviar({ headers: {}, url: '/chamados/' });

    expect(enviar).not.toHaveBeenCalled();
    expect(config.headers.Authorization).toBe('Bearer isto-nao-e-um-jwt');
  });

  // Sem esta exceção a própria renovação entraria no interceptor de novo.
  it('não dispara renovação nas rotas de autenticação', async () => {
    const enviar = vi.spyOn(axios, 'post');
    localStorage.setItem('token', tokenQueVenceEm(5));

    await aoEnviar({ headers: {}, url: '/auth/refresh' });
    await aoEnviar({ headers: {}, url: '/auth/login' });

    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('interceptor de resposta', () => {
  const localizacaoOriginal = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'abc123');
    localStorage.setItem('user', '{"id":1}');

    // jsdom não permite navegação de verdade; trocamos o objeto inteiro para
    // conseguir observar a atribuição de href.
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

  describe('401 — sessão inválida', () => {
    it('limpa a sessão e manda para o login', async () => {
      await expect(aoFalhar(erroDaApi(401))).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    // Sem essa exceção, errar a senha limparia o storage e recarregaria a
    // própria tela de login, descartando a mensagem de erro antes de ser lida.
    it('não redireciona quando o 401 veio da própria tentativa de login', async () => {
      await expect(aoFalhar(erroDaApi(401, '/auth/login'))).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('abc123');
      expect(window.location.href).toBe('');
    });

    it('não redireciona de novo se já estiver na tela de login', async () => {
      window.location.pathname = '/login';

      await expect(aoFalhar(erroDaApi(401))).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBeNull();
      expect(window.location.href).toBe('');
    });
  });

  describe('403 — sem permissão', () => {
    it('mostra o motivo devolvido pela API', async () => {
      const erro = erroDaApi(403, '/usuarios/', {
        detail: 'Requer perfil: Administrador',
      });

      await expect(aoFalhar(erro)).rejects.toBeDefined();

      expect(toast.error).toHaveBeenCalledWith(
        'Sem permissão. Requer perfil: Administrador',
        expect.anything()
      );
    });

    it('usa mensagem genérica quando a API não explica o motivo', async () => {
      await expect(aoFalhar(erroDaApi(403, '/usuarios/', {}))).rejects.toBeDefined();

      expect(toast.error).toHaveBeenCalledWith(
        'Você não tem permissão para essa ação.',
        expect.anything()
      );
    });

    // Uma tela que dispara várias chamadas negadas de uma vez não pode
    // empilhar um toast por requisição.
    it('usa id fixo para não empilhar avisos repetidos', async () => {
      await expect(aoFalhar(erroDaApi(403))).rejects.toBeDefined();

      expect(toast.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ id: 'acesso-negado' })
      );
    });

    it('não desloga o usuário — 403 é falta de permissão, não sessão inválida', async () => {
      await expect(aoFalhar(erroDaApi(403))).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('abc123');
      expect(window.location.href).toBe('');
    });
  });

  describe('outros erros', () => {
    it('repassa o 404 sem tocar na sessão nem avisar na tela', async () => {
      await expect(aoFalhar(erroDaApi(404))).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('abc123');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('sobrevive a erro de rede, em que não existe response', async () => {
      await expect(aoFalhar({ config: { url: '/chamados/' } })).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('abc123');
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('sobrevive a erro sem config, que não tem url para inspecionar', async () => {
      await expect(aoFalhar({ response: { status: 401 } })).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
