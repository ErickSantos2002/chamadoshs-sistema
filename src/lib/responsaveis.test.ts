import { describe, it, expect } from 'vitest';
import {
  ListaDeResponsaveisInvalida,
  ROTULO_FORA_DA_EQUIPE,
  ehRecusaDoResponsavel,
  mensagemDaRecusaDoResponsavel,
  motivoDaFalhaDaLista,
  opcoesDeResponsavelDaTI,
  validarResponsaveisTI,
} from './responsaveis';

/**
 * A lista de responsáveis da TI (API-9) do lado da tela: o contrato que se
 * aceita, o que cada falha quer dizer, e as opções do seletor — sem regra de
 * elegibilidade nenhuma, que é da API.
 */

describe('validarResponsaveisTI: o contrato [{id, nome}]', () => {
  it('aceita a lista e mantém a ordem da API', () => {
    expect(
      validarResponsaveisTI([
        { id: 65, nome: 'aaa.tecnico.ti' },
        { id: 10, nome: 'tecnico.ti' },
      ])
    ).toEqual([
      { id: 65, nome: 'aaa.tecnico.ti' },
      { id: 10, nome: 'tecnico.ti' },
    ]);
  });

  it('lista vazia é lista válida', () => {
    expect(validarResponsaveisTI([])).toEqual([]);
  });

  it('fica só com id e nome — campo a mais não passa adiante', () => {
    expect(validarResponsaveisTI([{ id: 1, nome: 'x', senha_hash: 'h', ativo: false }])).toEqual([
      { id: 1, nome: 'x' },
    ]);
  });

  for (const [rotulo, dados] of [
    ['objeto em vez de lista', { id: 1, nome: 'x' }],
    ['null', null],
    ['texto', 'x'],
    ['item nulo', [null]],
    ['id em texto', [{ id: '1', nome: 'x' }]],
    ['id zero', [{ id: 0, nome: 'x' }]],
    ['id negativo', [{ id: -3, nome: 'x' }]],
    ['id fracionário', [{ id: 1.5, nome: 'x' }]],
    ['sem nome', [{ id: 1 }]],
    ['nome vazio', [{ id: 1, nome: '  ' }]],
    ['nome numérico', [{ id: 1, nome: 7 }]],
    ['id repetido', [{ id: 1, nome: 'a' }, { id: 1, nome: 'b' }]],
    ['um item ruim no meio', [{ id: 1, nome: 'a' }, { id: 'x' }, { id: 3, nome: 'c' }]],
    ['o detail de um 422 com status 200', { detail: [{ loc: ['path', 'chamado_id'] }] }],
  ] as Array<[string, unknown]>) {
    it(`recusa: ${rotulo}`, () => {
      expect(validarResponsaveisTI(dados)).toBeNull();
    });
  }
});

describe('motivoDaFalhaDaLista: nenhum leva a fallback', () => {
  const comStatus = (status: number) => ({ response: { status } });

  it.each([
    [401, 'sessao'],
    [403, 'sem-permissao'],
    [404, 'indisponivel'],
    [405, 'indisponivel'],
    [422, 'incompativel'],
    [500, 'falhou'],
    [502, 'falhou'],
    [503, 'falhou'],
  ])('%i → %s', (status, motivo) => {
    expect(motivoDaFalhaDaLista(comStatus(status))).toBe(motivo);
  });

  it('rede, sem resposta → falhou', () => {
    expect(motivoDaFalhaDaLista({ request: {}, message: 'Network Error' })).toBe('falhou');
    expect(motivoDaFalhaDaLista(undefined)).toBe('falhou');
  });

  it('resposta fora do contrato → incompatível', () => {
    expect(motivoDaFalhaDaLista(new ListaDeResponsaveisInvalida())).toBe('incompativel');
  });
});

describe('opcoesDeResponsavelDaTI', () => {
  const LISTA = [
    { id: 65, nome: 'aaa.tecnico.ti' },
    { id: 10, nome: 'tecnico.ti' },
  ];

  it('"Sem atribuição" e a lista da API, na ordem dela', () => {
    expect(opcoesDeResponsavelDaTI(LISTA, null, null)).toEqual([
      { valor: '', rotulo: 'Sem atribuição' },
      { valor: '65', rotulo: 'aaa.tecnico.ti' },
      { valor: '10', rotulo: 'tecnico.ti' },
    ]);
  });

  it('o atual que está na lista não se repete nem ganha marca', () => {
    const opcoes = opcoesDeResponsavelDaTI(LISTA, 10, 'tecnico.ti');
    expect(opcoes.filter((o) => o.valor === '10')).toEqual([{ valor: '10', rotulo: 'tecnico.ti' }]);
  });

  it('o atual fora da lista aparece "(fora da equipe)", desabilitado, com o id de sempre', () => {
    const opcoes = opcoesDeResponsavelDaTI(LISTA, 56, 'tecnico.inativo');
    expect(opcoes[1]).toEqual({
      valor: '56',
      rotulo: `tecnico.inativo ${ROTULO_FORA_DA_EQUIPE}`,
      desabilitada: true,
    });
    // Não vira escolha válida e não some.
    expect(opcoes.filter((o) => !o.desabilitada).map((o) => o.valor)).toEqual(['', '65', '10']);
  });

  it('sem nome conhecido, o id — nunca um nome inventado', () => {
    expect(opcoesDeResponsavelDaTI(LISTA, 56, undefined)[1].rotulo).toBe(
      `Usuário #56 ${ROTULO_FORA_DA_EQUIPE}`
    );
  });

  it('lista que não veio: só "Sem atribuição" e o atual, para continuar visível', () => {
    expect(opcoesDeResponsavelDaTI(null, 10, 'tecnico.ti')).toEqual([
      { valor: '', rotulo: 'Sem atribuição' },
      { valor: '10', rotulo: `tecnico.ti ${ROTULO_FORA_DA_EQUIPE}`, desabilitada: true },
    ]);
    expect(opcoesDeResponsavelDaTI(null, null, null)).toEqual([
      { valor: '', rotulo: 'Sem atribuição' },
    ]);
  });
});

describe('a recusa do responsável no PUT', () => {
  const erro = (status: number, detail: unknown) => ({ response: { status, data: { detail } } });

  it.each([
    'Técnico responsável está inativo',
    'Técnico responsável não é da equipe da TI',
    'Técnico responsável não encontrado',
    'Não é possível atribuir um chamado a uma conta de serviço',
  ])('400 "%s" é recusa do responsável', (detail) => {
    expect(ehRecusaDoResponsavel(erro(400, detail))).toBe(true);
  });

  it('outros erros não são', () => {
    expect(ehRecusaDoResponsavel(erro(400, 'Solução muito curta'))).toBe(false);
    expect(ehRecusaDoResponsavel(erro(409, 'Técnico responsável está inativo'))).toBe(false);
    expect(ehRecusaDoResponsavel(erro(403, 'Requer perfil'))).toBe(false);
    expect(ehRecusaDoResponsavel(undefined)).toBe(false);
  });

  it('a mensagem traz o detail do backend e diz que nada foi salvo', () => {
    const texto = mensagemDaRecusaDoResponsavel(erro(400, 'Técnico responsável está inativo'));
    expect(texto).toContain('Técnico responsável está inativo');
    expect(texto).toContain('Nada foi salvo');
  });

  it('sem detail utilizável, uma mensagem própria', () => {
    expect(mensagemDaRecusaDoResponsavel(erro(400, ['lista']))).toContain(
      'não pode receber este chamado'
    );
  });
});
