import { describe, expect, it, vi, afterEach } from 'vitest';
import axios from 'axios';
import {
  EstadoDoSistema,
  INTERVALO_MS,
  TEXTO_DO_ESTADO,
  TIMEOUT_MS,
  classificarResposta,
  consultarSaude,
} from './saude';

vi.mock('axios');
const get = vi.mocked(axios.get);

afterEach(() => {
  vi.resetAllMocks();
});

describe('classificarResposta', () => {
  it('trata 200 como saudável', () => {
    expect(classificarResposta(200)).toBe('ok');
  });

  it('trata o 503 documentado como banco fora', () => {
    // É a distinção que justifica o endpoint existir: a API responde, o banco
    // não. Colapsar isso em "fora do ar" jogaria fora a informação útil.
    expect(classificarResposta(503)).toBe('degradado');
  });

  it.each([500, 502, 504, 404, 401])('não afirma nada sobre o banco em %i', (status) => {
    // Um 502 costuma vir do proxy na frente da API, não da API. Dizer "banco
    // fora" a partir dele seria inventar um diagnóstico.
    expect(classificarResposta(status)).toBe('sem-resposta');
  });

  it('trata ausência de código como sem resposta', () => {
    expect(classificarResposta(undefined)).toBe('sem-resposta');
  });
});

describe('consultarSaude', () => {
  it('não lança quando a rede falha', async () => {
    // A sonda roda em laço. Se ela propagasse erro, uma queda de rede viraria
    // uma rejeição não tratada por minuto no console do usuário.
    get.mockRejectedValueOnce(new Error('Network Error'));
    await expect(consultarSaude()).resolves.toBe('sem-resposta');
  });

  it('devolve o estado correspondente ao código', async () => {
    get.mockResolvedValueOnce({ status: 503 });
    await expect(consultarSaude()).resolves.toBe('degradado');
  });

  it('aceita o 503 como resposta em vez de exceção', async () => {
    await consultarSaude().catch(() => undefined);

    const opcoes = get.mock.calls[0]?.[1];
    // Sem isto, o axios transforma 503 em exceção e o estado "degradado" nunca
    // seria alcançado — cairia no catch como "sem-resposta".
    expect(opcoes?.validateStatus?.(503)).toBe(true);
  });

  it('usa timeout curto e não manda credencial', async () => {
    await consultarSaude().catch(() => undefined);

    const [url, opcoes] = get.mock.calls[0] ?? [];
    expect(url).toContain('/api/v1/health');
    expect(opcoes?.timeout).toBe(TIMEOUT_MS);
    // A rota é pública. Mandar Authorization entregaria o token a um endpoint
    // que não pede — e a sonda roda antes mesmo de existir login.
    expect(opcoes?.headers?.Authorization).toBeUndefined();
  });
});

describe('constantes', () => {
  it('espera menos do que o intervalo entre consultas', () => {
    // Se o timeout passasse do intervalo, uma consulta lenta ainda estaria
    // aberta quando a próxima fosse marcada.
    expect(TIMEOUT_MS).toBeLessThan(INTERVALO_MS);
  });

  it('tem texto para todos os estados', () => {
    const estados: EstadoDoSistema[] = ['verificando', 'ok', 'degradado', 'sem-resposta'];
    for (const estado of estados) {
      expect(TEXTO_DO_ESTADO[estado]).toBeTruthy();
    }
  });
});
