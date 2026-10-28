import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import api from '../services/api';
import { chamadosService, TIMEOUT_DA_SONDA_MS } from '../services/chamadoshsapi';
import { Chamado, SetorDestinoEnum, StatusEnum } from '../types/api';
import {
  MENSAGEM_QUALIDADE_INDISPONIVEL,
  MENSAGEM_ROTA_INDISPONIVEL,
  MENSAGEM_SEM_RESPOSTA,
  ROTULO_FORA_DOS_ATENDENTES,
  classificarSonda,
  ehAtribuidoNaQualidade,
  interpretarErroDaReatribuicao,
  interpretarErroDoAtendimento,
  montarCorpoAtendimento,
  opcoesDeResponsavelDaQualidade,
  podeAtenderPelaRota,
  podeReatribuirNaQualidade,
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

describe('podeAtenderPelaRota', () => {
  const chamado = {
    setor_destino: SetorDestinoEnum.QUALIDADE,
    tecnico_responsavel_id: 7,
    cancelado: false,
    arquivado: false,
  };
  const ok = { suporte: 'suportado' as const, disponibilidade: 'disponivel', atendentes: [{ id: 7 }] };

  it('com as seis condições: sim', () => {
    expect(podeAtenderPelaRota(chamado, 7, ok)).toBe(true);
  });

  const casos: Array<[string, Parameters<typeof podeAtenderPelaRota>]> = [
    ['API sem a rota', [chamado, 7, { ...ok, suporte: 'nao-suportado' }]],
    ['sonda falhou', [chamado, 7, { ...ok, suporte: 'falhou' }]],
    ['ainda verificando', [chamado, 7, { ...ok, suporte: 'verificando' }]],
    ['atendentes com 503', [chamado, 7, { ...ok, disponibilidade: 'indisponivel', atendentes: [] }]],
    ['atendentes falharam', [chamado, 7, { ...ok, disponibilidade: 'falhou' }]],
    ['fora da lista de atendentes', [chamado, 7, { ...ok, atendentes: [{ id: 3 }] }]],
    ['chamado da TI', [{ ...chamado, setor_destino: SetorDestinoEnum.TI }, 7, ok]],
    ['chamado sem setor', [{ ...chamado, setor_destino: undefined }, 7, ok]],
    ['outro responsável', [{ ...chamado, tecnico_responsavel_id: 3 }, 7, { ...ok, atendentes: [{ id: 3 }, { id: 7 }] }]],
    ['cancelado', [{ ...chamado, cancelado: true }, 7, ok]],
    ['arquivado', [{ ...chamado, arquivado: true }, 7, ok]],
    ['sem usuário', [chamado, undefined, ok]],
  ];
  for (const [nome, args] of casos) {
    it(`${nome}: não`, () => {
      expect(podeAtenderPelaRota(...args)).toBe(false);
    });
  }
});

describe('montarCorpoAtendimento', () => {
  it('iniciar e aguardar: só o status, sem a chave solucao', () => {
    expect(montarCorpoAtendimento(StatusEnum.EM_ANDAMENTO, 'texto que sobrou')).toStrictEqual({
      status: StatusEnum.EM_ANDAMENTO,
    });
    expect(montarCorpoAtendimento(StatusEnum.AGUARDANDO)).toStrictEqual({
      status: StatusEnum.AGUARDANDO,
    });
  });

  it('resolver: status e solução sem espaço nas pontas', () => {
    expect(montarCorpoAtendimento(StatusEnum.RESOLVIDO, '  Calibrei o paquímetro.  ')).toStrictEqual({
      status: StatusEnum.RESOLVIDO,
      solucao: 'Calibrei o paquímetro.',
    });
  });
});

describe('interpretarErroDoAtendimento', () => {
  const resp = (status: number, detail?: unknown) => ({ response: { status, data: { detail } } });

  const casos: Array<[string, unknown, string, boolean, string | null]> = [
    ['404 do roteador', resp(404, 'Not Found'), 'rota-indisponivel', false, MENSAGEM_ROTA_INDISPONIVEL],
    ['405', resp(405, 'Method Not Allowed'), 'rota-indisponivel', false, MENSAGEM_ROTA_INDISPONIVEL],
    ['404 do chamado', resp(404, 'Chamado não encontrado'), 'chamado-inexistente', true, 'Chamado não encontrado'],
    ['404 sem texto', resp(404), 'chamado-inexistente', true, 'Chamado não encontrado.'],
    ['401', resp(401, 'x'), 'sessao', false, null],
    ['403', resp(403, 'Só o responsável atual pode atender este chamado'), 'sem-permissao', true, null],
    ['409', resp(409, 'Chamado cancelado não pode ser atendido'), 'conflito', true, 'Chamado cancelado não pode ser atendido'],
    ['422', resp(422, 'solucao_obrigatoria'), 'invalido', false, 'solucao_obrigatoria'],
    ['503', resp(503, 'Abertura de chamados para a Qualidade não está disponível neste ambiente'), 'qualidade-indisponivel', false, MENSAGEM_QUALIDADE_INDISPONIVEL],
    ['500', resp(500, 'Erro interno'), 'outro', false, 'Erro interno'],
    ['rede', new Error('Network Error'), 'rede', false, MENSAGEM_SEM_RESPOSTA],
    ['nada', undefined, 'rede', false, MENSAGEM_SEM_RESPOSTA],
  ];
  for (const [nome, erro, tipo, recarregar, mensagem] of casos) {
    it(`${nome}: ${tipo}`, () => {
      expect(interpretarErroDoAtendimento(erro)).toStrictEqual({ tipo, recarregar, mensagem });
    });
  }
});

describe('reatribuição na Qualidade', () => {
  const ATENDENTES = [
    { id: 7, nome: 'Ana' },
    { id: 3, nome: 'Bia' },
  ];

  it('podeReatribuirNaQualidade: só com a API-3 e os atendentes respondendo 200', () => {
    const base = { suporte: 'suportado' as const, disponibilidade: 'disponivel', atendentes: [] };
    expect(podeReatribuirNaQualidade(base)).toBe(true);
    expect(podeReatribuirNaQualidade({ ...base, disponibilidade: 'sem-atendentes' })).toBe(true);
    expect(podeReatribuirNaQualidade({ ...base, disponibilidade: 'indisponivel' })).toBe(false);
    expect(podeReatribuirNaQualidade({ ...base, disponibilidade: 'falhou' })).toBe(false);
    expect(podeReatribuirNaQualidade({ ...base, disponibilidade: 'verificando' })).toBe(false);
    expect(podeReatribuirNaQualidade({ ...base, suporte: 'nao-suportado' })).toBe(false);
    expect(podeReatribuirNaQualidade({ ...base, suporte: 'falhou' })).toBe(false);
  });

  it('opções: os atendentes, sem opção vazia', () => {
    expect(opcoesDeResponsavelDaQualidade(ATENDENTES, 7, 'Ana')).toStrictEqual([
      { valor: '7', rotulo: 'Ana' },
      { valor: '3', rotulo: 'Bia' },
    ]);
  });

  it('o atual fora da lista fica, marcado, no topo', () => {
    expect(opcoesDeResponsavelDaQualidade(ATENDENTES, 12, 'Caio')).toStrictEqual([
      { valor: '12', rotulo: `Caio ${ROTULO_FORA_DOS_ATENDENTES}` },
      { valor: '7', rotulo: 'Ana' },
      { valor: '3', rotulo: 'Bia' },
    ]);
  });

  it('sem responsável atual, nada é inventado', () => {
    expect(opcoesDeResponsavelDaQualidade(ATENDENTES, null, 'x')).toHaveLength(2);
    expect(opcoesDeResponsavelDaQualidade([], undefined, 'x')).toEqual([]);
  });

  const resp = (status: number, detail?: string) => ({ response: { status, data: { detail } } });

  it('erro 400: o detail, e recarrega os atendentes', () => {
    expect(interpretarErroDaReatribuicao(resp(400, 'Atendente não é elegível para a Qualidade'))).toStrictEqual({
      mensagem: 'Atendente não é elegível para a Qualidade',
      recarregarAtendentes: true,
      indisponivel: false,
    });
  });

  it('erro 503: Qualidade indisponível', () => {
    expect(interpretarErroDaReatribuicao(resp(503, 'x'))).toStrictEqual({
      mensagem: MENSAGEM_QUALIDADE_INDISPONIVEL,
      recarregarAtendentes: false,
      indisponivel: true,
    });
  });

  it('erro 403: quem avisa é o interceptor', () => {
    expect(interpretarErroDaReatribuicao(resp(403, 'x')).mensagem).toBeNull();
  });

  it('rede: mensagem genérica, sem recarga', () => {
    expect(interpretarErroDaReatribuicao(new Error('rede'))).toStrictEqual({
      mensagem: 'Não foi possível atribuir o responsável.',
      recarregarAtendentes: false,
      indisponivel: false,
    });
  });
});
