import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import { chamadosService } from '../services/chamadoshsapi';
import { PrioridadeEnum, SetorDestinoEnum } from '../types/api';
import {
  MENSAGEM_INDISPONIVEL_NO_ENVIO,
  MENSAGEM_RESPONSAVEL,
  classificarFalha,
  consultarQualidade,
  interpretarErroDaQualidade,
  lerAtendentes,
  montarCorpoQualidade,
  montarCorpoTI,
  validarQualidade,
} from './qualidade';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

/** O erro do axios como ele chega: com `response` quando houve resposta. */
const erroHttp = (status: number, detail?: unknown) => ({
  isAxiosError: true,
  response: { status, data: detail === undefined ? {} : { detail } },
});

const ATENDENTES = [
  { id: 21, nome: 'Ana' },
  { id: 22, nome: 'Bruno' },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('serviço', () => {
  it('a lista de atendentes vem do endpoint da Qualidade', async () => {
    get.mockResolvedValue({ data: ATENDENTES } as never);
    expect(await chamadosService.listarAtendentesQualidade()).toEqual(ATENDENTES);
    expect(get).toHaveBeenCalledWith('/chamados/atendentes-qualidade');
  });

  it('a abertura da Qualidade usa o mesmo POST da TI', async () => {
    post.mockResolvedValue({ data: { id: 1 } } as never);
    const corpo = montarCorpoQualidade({
      descricao: 'Desvio na calibração da balança 3.',
      prioridade: PrioridadeEnum.MEDIA,
      solicitante_id: 7,
      tecnico_responsavel_id: 21,
    });
    await chamadosService.criar(corpo);
    expect(post).toHaveBeenCalledWith('/chamados/', corpo);
  });
});

describe('classificarFalha — a resposta de erro da consulta', () => {
  /**
   * O 503 é a API-2 de pé e a Qualidade desligada pela configuração. Não é
   * "não há atendentes" — é "ninguém ligou isto" —, e as duas coisas pedem
   * respostas diferentes de quem administra.
   */
  it('503 é indisponível', () => {
    expect(classificarFalha(erroHttp(503))).toBe('indisponivel');
  });

  /**
   * 404, 405 e 422 são o backend que não conhece a rota. A API no ar hoje
   * responde 422: a palavra "atendentes-qualidade" cai em `/{chamado_id}` e
   * não vira número.
   */
  it('404, 405 e 422 são backend sem a rota', () => {
    for (const status of [404, 405, 422]) {
      expect(classificarFalha(erroHttp(status)), String(status)).toBe('nao-suportado');
    }
  });

  it('rede, timeout e os demais 5xx são falha', () => {
    expect(classificarFalha(new Error('Network Error'))).toBe('falhou');
    expect(classificarFalha({ isAxiosError: true, code: 'ECONNABORTED' })).toBe('falhou');
    for (const status of [500, 502, 504]) {
      expect(classificarFalha(erroHttp(status)), String(status)).toBe('falhou');
    }
  });

  // O 401 é do interceptor, que leva ao login. Aqui só não pode virar
  // "Qualidade disponível".
  it('401 é falha — a sessão é com o interceptor', () => {
    expect(classificarFalha(erroHttp(401))).toBe('falhou');
  });

  it('erro que nem objeto é não quebra', () => {
    expect(classificarFalha(undefined)).toBe('falhou');
    expect(classificarFalha('x')).toBe('falhou');
  });
});

describe('lerAtendentes — a lista que veio', () => {
  it('aceita a lista do contrato', () => {
    expect(lerAtendentes(ATENDENTES)).toEqual(ATENDENTES);
  });

  it('lista vazia é lista, e não falha', () => {
    expect(lerAtendentes([])).toEqual([]);
  });

  /**
   * A lista é o que decide quem pode ser escolhido. Um item fora do formato
   * não vira opção — mostrar "undefined" ou mandar um id que não é número
   * seria pior que deixá-lo de fora.
   */
  it('item fora do formato fica de fora', () => {
    expect(
      lerAtendentes([
        { id: 21, nome: 'Ana' },
        { id: '22', nome: 'Bruno' },
        { id: 23 },
        null,
        { id: 24, nome: '' },
      ])
    ).toEqual([{ id: 21, nome: 'Ana' }]);
  });

  it('o que não é lista é contrato quebrado', () => {
    expect(lerAtendentes({ atendentes: [] })).toBeNull();
    expect(lerAtendentes(null)).toBeNull();
  });

  it('não carrega campo além de id e nome', () => {
    expect(lerAtendentes([{ id: 21, nome: 'Ana', email: 'ana@x' }])).toEqual([
      { id: 21, nome: 'Ana' },
    ]);
  });
});

describe('consultarQualidade — a consulta inteira', () => {
  it('200 com gente: disponível, com a lista', async () => {
    get.mockResolvedValue({ data: ATENDENTES } as never);
    expect(await consultarQualidade()).toEqual({ estado: 'disponivel', atendentes: ATENDENTES });
  });

  it('200 vazio: sem atendentes, e não indisponível', async () => {
    get.mockResolvedValue({ data: [] } as never);
    expect(await consultarQualidade()).toEqual({ estado: 'sem-atendentes', atendentes: [] });
  });

  it('200 fora do contrato: falha', async () => {
    get.mockResolvedValue({ data: { erro: 'x' } } as never);
    expect((await consultarQualidade()).estado).toBe('falhou');
  });

  it('nunca lança: cada erro vira um estado', async () => {
    const casos: Array<[unknown, string]> = [
      [erroHttp(503), 'indisponivel'],
      [erroHttp(422), 'nao-suportado'],
      [erroHttp(404), 'nao-suportado'],
      [erroHttp(405), 'nao-suportado'],
      [erroHttp(500), 'falhou'],
      [erroHttp(401), 'falhou'],
      [new Error('Network Error'), 'falhou'],
    ];
    for (const [erro, estado] of casos) {
      get.mockRejectedValueOnce(erro);
      expect(await consultarQualidade(), estado).toEqual({ estado, atendentes: [] });
    }
  });

  /**
   * O aviso é para quem administra, e sem dado pessoal. A API antiga, que é
   * o estado normal hoje, não avisa: avisaria em toda abertura de chamado.
   */
  it('avisa no console no 503 e na falha, e cala no backend antigo', async () => {
    const aviso = vi.mocked(console.warn);

    get.mockRejectedValueOnce(erroHttp(422));
    await consultarQualidade();
    expect(aviso).not.toHaveBeenCalled();

    get.mockRejectedValueOnce(erroHttp(503));
    await consultarQualidade();
    get.mockRejectedValueOnce(new Error('Network Error'));
    await consultarQualidade();
    expect(aviso).toHaveBeenCalledTimes(2);
    expect(aviso.mock.calls[0][0]).toContain('[qualidade]');
  });

  it('o aviso não leva nome de atendente', async () => {
    get.mockResolvedValue({ data: { erro: 'Ana' } } as never);
    await consultarQualidade();
    const texto = vi.mocked(console.warn).mock.calls.map((c) => c.join(' ')).join(' ');
    expect(texto).not.toContain('Ana');
  });
});

describe('montarCorpoTI — o corpo de sempre', () => {
  const base = {
    titulo: '  Impressora do RH sem papel  ',
    descricao: '  A impressora do RH parou de puxar papel.  ',
    prioridade: PrioridadeEnum.ALTA,
    categoriaId: 4 as number | undefined,
  };

  it('Usuario: para si, sem responsável — as seis chaves', () => {
    const corpo = montarCorpoTI({ ...base, ehEquipe: false, usuarioId: 7, solicitanteId: undefined });
    expect(corpo).toStrictEqual({
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: 'A impressora do RH parou de puxar papel.',
      prioridade: PrioridadeEnum.ALTA,
      categoria_id: 4,
      tecnico_responsavel_id: undefined,
    });
  });

  it('equipe: o solicitante escolhido e ela como responsável', () => {
    const corpo = montarCorpoTI({ ...base, ehEquipe: true, usuarioId: 3, solicitanteId: 8 });
    expect(corpo).toMatchObject({ solicitante_id: 8, tecnico_responsavel_id: 3 });
  });

  it('não leva setor_destino', () => {
    const corpo = montarCorpoTI({ ...base, ehEquipe: false, usuarioId: 7, solicitanteId: undefined });
    expect(corpo).not.toHaveProperty('setor_destino');
  });
});

describe('montarCorpoQualidade — só o que a Qualidade aceita', () => {
  const corpo = montarCorpoQualidade({
    descricao: '  Desvio na calibração da balança 3.  ',
    prioridade: PrioridadeEnum.MEDIA,
    solicitante_id: 7,
    tecnico_responsavel_id: 21,
  });

  /**
   * A API recusa com 422 a PRESENÇA de `titulo` ou `categoria_id`, mesmo com
   * null. `undefined` o axios descartaria — mas a garantia não pode depender
   * de quem serializa: a chave simplesmente não existe.
   */
  it('exatamente as cinco chaves do contrato', () => {
    expect(Object.keys(corpo).sort()).toEqual(
      ['descricao', 'prioridade', 'setor_destino', 'solicitante_id', 'tecnico_responsavel_id'].sort()
    );
    expect('titulo' in corpo).toBe(false);
    expect('categoria_id' in corpo).toBe(false);
  });

  it('o formato exato, com a descrição aparada', () => {
    expect(corpo).toStrictEqual({
      setor_destino: SetorDestinoEnum.QUALIDADE,
      descricao: 'Desvio na calibração da balança 3.',
      prioridade: PrioridadeEnum.MEDIA,
      solicitante_id: 7,
      tecnico_responsavel_id: 21,
    });
  });

  it('sobrevive à serialização sem as chaves proibidas', () => {
    const viagem = JSON.parse(JSON.stringify(corpo));
    expect(viagem).not.toHaveProperty('titulo');
    expect(viagem).not.toHaveProperty('categoria_id');
  });
});

describe('validarQualidade — na ordem da tela', () => {
  const ok = {
    descricao: 'Desvio na calibração da balança 3.',
    ehEquipe: false,
    solicitanteId: undefined as number | undefined,
    responsavelId: 21 as number | undefined,
    atendentes: ATENDENTES,
  };

  it('tudo certo: nenhum problema', () => {
    expect(validarQualidade(ok)).toBeNull();
  });

  // As mesmas mensagens da TI, saídas da mesma função.
  it('descrição primeiro, com a mensagem de sempre', () => {
    expect(validarQualidade({ ...ok, descricao: '   ', responsavelId: undefined })).toBe(
      'Descrição é obrigatório.'
    );
    expect(validarQualidade({ ...ok, descricao: 'Parou de novo' })).toBe(
      'Descrição precisa de mais 7 caracteres.'
    );
  });

  it('a equipe sem solicitante, antes do responsável', () => {
    expect(validarQualidade({ ...ok, ehEquipe: true, responsavelId: undefined })).toBe(
      'Selecione o solicitante.'
    );
  });

  it('sem responsável: "Selecione o responsável."', () => {
    expect(MENSAGEM_RESPONSAVEL).toBe('Selecione o responsável.');
    expect(validarQualidade({ ...ok, responsavelId: undefined })).toBe(MENSAGEM_RESPONSAVEL);
  });

  /** Um id que não está na lista carregada não é escolha válida. */
  it('responsável fora da lista carregada também é recusado', () => {
    expect(validarQualidade({ ...ok, responsavelId: 999 })).toBe(MENSAGEM_RESPONSAVEL);
    expect(validarQualidade({ ...ok, atendentes: [] })).toBe(MENSAGEM_RESPONSAVEL);
  });
});

describe('interpretarErroDaQualidade — o erro do envio', () => {
  it('503: mensagem própria e a Qualidade some', () => {
    expect(MENSAGEM_INDISPONIVEL_NO_ENVIO).toBe(
      'A abertura para a Qualidade ficou indisponível. Abra para a TI ou tente mais tarde.'
    );
    expect(interpretarErroDaQualidade(erroHttp(503, 'qualquer'))).toEqual({
      mensagem: MENSAGEM_INDISPONIVEL_NO_ENVIO,
      recarregarAtendentes: false,
      indisponivel: true,
    });
  });

  it('400: o detail da API, e a lista recarrega', () => {
    expect(
      interpretarErroDaQualidade(erroHttp(400, 'Atendente não é elegível para a Qualidade'))
    ).toEqual({
      mensagem: 'Atendente não é elegível para a Qualidade',
      recarregarAtendentes: true,
      indisponivel: false,
    });
  });

  it('422: o texto que o interceptor já normalizou', () => {
    expect(
      interpretarErroDaQualidade(erroHttp(422, 'descricao: String should have at least 20 characters'))
        .mensagem
    ).toBe('descricao: String should have at least 20 characters');
  });

  it('sem detail: a mensagem genérica de sempre', () => {
    expect(interpretarErroDaQualidade(new Error('rede')).mensagem).toBe(
      'Erro ao criar chamado. Tente novamente.'
    );
    expect(interpretarErroDaQualidade(erroHttp(400)).mensagem).toBe(
      'Erro ao criar chamado. Tente novamente.'
    );
  });
});
