import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import api from '../services/api';
import { chamadosService, TIMEOUT_DA_SONDA_MS } from '../services/chamadoshsapi';
import { Chamado, SetorDestinoEnum } from '../types/api';
import {
  classificarSonda,
  ehAtribuidoNaQualidade,
  sondarSuporte,
  unirChamados,
} from './atendimento';

/**
 * A sonda do atendimento. As respostas de referência são as que a aplicação
 * de cada versão da API deu ao GET `/chamados/0/atendimento`, com e sem token
 * (auditoria da D-6): main, API-1 e API-2 dão 404 `Not Found`; API-3 dá 405
 * `Method Not Allowed`.
 */

describe('classificarSonda', () => {
  it('405 Method Not Allowed: suportado (API-3)', () => {
    expect(classificarSonda({ status: 405, dados: { detail: 'Method Not Allowed' } })).toBe(
      'suportado'
    );
  });

  it('404 Not Found: não suportado (main, API-1, API-2)', () => {
    expect(classificarSonda({ status: 404, dados: { detail: 'Not Found' } })).toBe(
      'nao-suportado'
    );
  });

  const falhas: Array<[string, number, unknown]> = [
    ['404 de chamado inexistente', 404, { detail: 'Chamado não encontrado' }],
    ['405 de outra origem', 405, { detail: 'Método não permitido' }],
    ['405 com detail em outra caixa', 405, { detail: 'method not allowed' }],
    ['404 em HTML de proxy', 404, '<html><body>Not Found</body></html>'],
    ['405 em texto', 405, 'Method Not Allowed'],
    ['404 com lista', 404, [{ detail: 'Not Found' }]],
    ['404 sem corpo', 404, undefined],
    ['405 com corpo nulo', 405, null],
    ['200', 200, { detail: 'Method Not Allowed' }],
    ['307 da barra final', 307, null],
    ['401', 401, { detail: 'Not authenticated' }],
    ['403', 403, { detail: 'Not Found' }],
    ['422', 422, { detail: [] }],
    ['429', 429, { detail: 'Too Many Requests' }],
    ['500', 500, { detail: 'Not Found' }],
    ['502 do proxy', 502, '<html>Bad Gateway</html>'],
    ['503', 503, { detail: 'Method Not Allowed' }],
  ];

  for (const [nome, status, dados] of falhas) {
    it(`${nome}: falhou`, () => {
      expect(classificarSonda({ status, dados })).toBe('falhou');
    });
  }

  it('sem resposta: falhou', () => {
    expect(classificarSonda(null)).toBe('falhou');
  });
});

describe('sondarAtendimento — a requisição', () => {
  beforeEach(() => {
    for (const verbo of ['get', 'post', 'put', 'patch', 'delete'] as const) {
      vi.spyOn(api, verbo).mockRejectedValue(new Error(`rede bloqueada no teste: ${verbo}`));
    }
  });
  afterEach(() => vi.restoreAllMocks());

  it('GET pelo axios puro, sem barra final, sem token, com timeout curto', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockResolvedValue({ status: 405, data: { detail: 'Method Not Allowed' } });

    const resposta = await chamadosService.sondarAtendimento();

    expect(resposta).toStrictEqual({ status: 405, dados: { detail: 'Method Not Allowed' } });
    expect(get).toHaveBeenCalledTimes(1);
    const [url, config] = get.mock.calls[0];
    expect(url).toMatch(/^https?:\/\/[^/]+\/api\/v1\/chamados\/0\/atendimento$/);
    expect(config?.timeout).toBe(TIMEOUT_DA_SONDA_MS);
    expect(TIMEOUT_DA_SONDA_MS).toBe(5_000);
    expect(config?.headers).toBeUndefined();
    expect(config?.method).toBeUndefined();
    // Todo status chega como resposta, para o 404 e o 405 serem lidos.
    expect(config?.validateStatus?.(404)).toBe(true);
    expect(config?.validateStatus?.(500)).toBe(true);
    // A instância com token e interceptors não é usada.
    expect(vi.mocked(api.get)).not.toHaveBeenCalled();
  });
});

describe('sondarSuporte', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('lê a resposta da sonda', async () => {
    vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
      status: 404,
      dados: { detail: 'Not Found' },
    });
    expect(await sondarSuporte()).toBe('nao-suportado');
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('timeout ou rede: falhou, sem lançar, e avisa sem o corpo', async () => {
    vi.spyOn(chamadosService, 'sondarAtendimento').mockRejectedValue(
      Object.assign(new Error('timeout of 5000ms exceeded'), { code: 'ECONNABORTED' })
    );
    expect(await sondarSuporte()).toBe('falhou');
    expect(vi.mocked(console.warn).mock.calls[0][0]).toContain('sem resposta');
  });

  it('resposta que não diz nada: falhou, com o status no aviso', async () => {
    vi.spyOn(chamadosService, 'sondarAtendimento').mockResolvedValue({
      status: 502,
      dados: '<html>segredo</html>',
    });
    expect(await sondarSuporte()).toBe('falhou');
    const aviso = String(vi.mocked(console.warn).mock.calls[0][0]);
    expect(aviso).toContain('502');
    expect(aviso).not.toContain('segredo');
  });

  it('uma chamada por sondagem, sem repetir', async () => {
    const sonda = vi.spyOn(chamadosService, 'sondarAtendimento').mockRejectedValue(new Error('x'));
    await sondarSuporte();
    expect(sonda).toHaveBeenCalledTimes(1);
  });
});

describe('ehAtribuidoNaQualidade', () => {
  it('Qualidade com a pessoa de responsável: sim', () => {
    expect(
      ehAtribuidoNaQualidade({ setor_destino: SetorDestinoEnum.QUALIDADE, tecnico_responsavel_id: 7 }, 7)
    ).toBe(true);
  });

  it('TI, sem setor, setor estranho, outro responsável, sem responsável ou sem usuário: não', () => {
    expect(ehAtribuidoNaQualidade({ setor_destino: SetorDestinoEnum.TI, tecnico_responsavel_id: 7 }, 7)).toBe(false);
    expect(ehAtribuidoNaQualidade({ tecnico_responsavel_id: 7 }, 7)).toBe(false);
    expect(
      ehAtribuidoNaQualidade({ setor_destino: 'qualidade' as SetorDestinoEnum, tecnico_responsavel_id: 7 }, 7)
    ).toBe(false);
    expect(ehAtribuidoNaQualidade({ setor_destino: SetorDestinoEnum.QUALIDADE, tecnico_responsavel_id: 3 }, 7)).toBe(false);
    expect(ehAtribuidoNaQualidade({ setor_destino: SetorDestinoEnum.QUALIDADE, tecnico_responsavel_id: null } as never, 7)).toBe(false);
    expect(ehAtribuidoNaQualidade({ setor_destino: SetorDestinoEnum.QUALIDADE, tecnico_responsavel_id: undefined }, undefined)).toBe(false);
  });
});

describe('unirChamados', () => {
  const c = (id: number) => ({ id }) as Chamado;

  it('sem atribuídos novos, a lista de antes, como veio', () => {
    const proprios = [c(2), c(9), c(4)];
    expect(unirChamados(proprios, [])).toBe(proprios);
    expect(unirChamados(proprios, [c(9)])).toBe(proprios);
  });

  it('com atribuídos, sem repetir e por id decrescente', () => {
    expect(unirChamados([c(2), c(9)], [c(9), c(5), c(5), c(12)]).map((x) => x.id)).toEqual([12, 9, 5, 2]);
  });
});
