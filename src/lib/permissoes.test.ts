import { describe, it, expect } from 'vitest';
import {
  ehAdministrador,
  integraEquipeTI,
  ehAdministradorHumano,
  podeAdministrar,
  podeAdministrarUsuarios,
  podeAlterarComoEquipe,
  podeEscolherSolicitante,
} from './permissoes';

/**
 * A regra de interface da administração (FE-5, F5-3): administrador pelo
 * perfil, ou técnico que o backend diz ser da TI — e nada antes da
 * identidade confirmada. Cada perfil abaixo é uma conta que existe na HS.
 */

const PERFIS = {
  administrador: { role: 'Administrador', role_id: 1, integra_equipe_ti: true, conta_de_servico: false },
  administradorForaDaTI: {
    role: 'Administrador',
    role_id: 1,
    integra_equipe_ti: false,
    conta_de_servico: false,
  },
  tecnicoDaTI: { role: 'Tecnico', role_id: 2, integra_equipe_ti: true },
  tecnicoDaQualidade: { role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
  tecnicoDeOutroSetor: { role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
  tecnicoSemSetor: { role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
  usuarioComum: { role: 'Usuario', role_id: 3, integra_equipe_ti: false },
  perfilDesconhecido: { role: 'Auditor', role_id: 4, integra_equipe_ti: false },
} as const;

describe('podeAdministrar, com a identidade confirmada', () => {
  const esperado: Record<keyof typeof PERFIS, boolean> = {
    administrador: true,
    administradorForaDaTI: true,
    tecnicoDaTI: true,
    tecnicoDaQualidade: false,
    tecnicoDeOutroSetor: false,
    tecnicoSemSetor: false,
    usuarioComum: false,
    perfilDesconhecido: false,
  };

  for (const [nome, usuario] of Object.entries(PERFIS)) {
    it(`${nome} → ${esperado[nome as keyof typeof PERFIS]}`, () => {
      expect(podeAdministrar(usuario, true)).toBe(esperado[nome as keyof typeof PERFIS]);
    });
  }

  it('o administrador humano administra pelo perfil, mesmo com integra_equipe_ti falso ou ausente', () => {
    expect(podeAdministrar({ role: 'Administrador', conta_de_servico: false }, true)).toBe(true);
    expect(podeAdministrar({ role_id: 1, conta_de_servico: false }, true)).toBe(true);
    expect(
      podeAdministrar({ role: 'Administrador', integra_equipe_ti: null, conta_de_servico: false }, true)
    ).toBe(true);
  });

  it('o perfil sozinho não basta: sem conta_de_servico === false, não administra (API-11)', () => {
    for (const marca of [undefined, null, true, 'false', 0, 1]) {
      const conta = { role: 'Administrador', role_id: 1, conta_de_servico: marca };
      expect(podeAdministrar(conta, true)).toBe(false);
      expect(podeAdministrarUsuarios(conta, true)).toBe(false);
      expect(ehAdministradorHumano(conta)).toBe(false);
    }
  });

  it('ser Técnico não basta: sem o campo verdadeiro, não administra', () => {
    expect(podeAdministrar({ role: 'Tecnico', role_id: 2 }, true)).toBe(false);
  });
});

describe('integra_equipe_ti: só o booleano true reconhece a TI', () => {
  const tecnico = (valor: unknown) => ({ role: 'Tecnico', role_id: 2, integra_equipe_ti: valor });

  it('true reconhece', () => {
    expect(integraEquipeTI(tecnico(true))).toBe(true);
    expect(podeAdministrar(tecnico(true), true)).toBe(true);
  });

  for (const [rotulo, valor] of [
    ['ausente', undefined],
    ['null', null],
    ['false', false],
    ['a string "true"', 'true'],
    ['o número 1', 1],
    ['um objeto', {}],
    ['uma lista', [true]],
  ] as Array<[string, unknown]>) {
    it(`${rotulo} não reconhece`, () => {
      expect(integraEquipeTI(tecnico(valor))).toBe(false);
      expect(podeAdministrar(tecnico(valor), true)).toBe(false);
    });
  }

  it('o campo ausente no objeto não reconhece', () => {
    expect(podeAdministrar({ role: 'Tecnico' }, true)).toBe(false);
  });
});

describe('identidade ainda não confirmada', () => {
  for (const [nome, usuario] of Object.entries(PERFIS)) {
    it(`${nome}: ninguém administra antes do /auth/me`, () => {
      expect(podeAdministrar(usuario, false)).toBe(false);
      expect(podeAdministrarUsuarios(usuario, false)).toBe(false);
    });
  }

  it('sem usuário, nunca', () => {
    expect(podeAdministrar(null, true)).toBe(false);
    expect(podeAdministrar(undefined, true)).toBe(false);
  });

  it('a confirmação também é lida ao pé da letra', () => {
    expect(podeAdministrar(PERFIS.administrador, 'true' as unknown as boolean)).toBe(false);
    expect(podeAdministrar(PERFIS.administrador, 1 as unknown as boolean)).toBe(false);
  });
});

describe('a aba de Usuários continua só do administrador', () => {
  it('administrador sim, técnico da TI não', () => {
    expect(podeAdministrarUsuarios(PERFIS.administrador, true)).toBe(true);
    expect(podeAdministrarUsuarios(PERFIS.administradorForaDaTI, true)).toBe(true);
    expect(podeAdministrarUsuarios(PERFIS.tecnicoDaTI, true)).toBe(false);
    expect(podeAdministrarUsuarios(PERFIS.usuarioComum, true)).toBe(false);
  });

  it('ehAdministrador lê o nome canônico ou o id', () => {
    expect(ehAdministrador({ role: 'Administrador' })).toBe(true);
    expect(ehAdministrador({ role_id: 1 })).toBe(true);
    expect(ehAdministrador({ role: 'administrador' })).toBe(false);
    expect(ehAdministrador(null)).toBe(false);
  });
});

describe('podeAlterarComoEquipe: a regra pode_alterar_como_equipe da API (C2)', () => {
  const TI = { setor_destino: 'TI' };
  const QUALIDADE = { setor_destino: 'QUALIDADE' };
  const SEM_SETOR = {};
  const ESTRANHO = { setor_destino: 'RH' };
  const atendentes = [{ id: 21 }, { id: 22 }];

  const contas = {
    adminHumano: { id: 1, role: 'Administrador', role_id: 1, conta_de_servico: false },
    adminDeServico: { id: 2, role: 'Administrador', role_id: 1, conta_de_servico: true },
    adminSemMarca: { id: 3, role: 'Administrador', role_id: 1 },
    tecnicoDaTI: { id: 10, role: 'Tecnico', role_id: 2, integra_equipe_ti: true },
    tecnicoDaQualidade: { id: 21, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    tecnicoQualidadeForaDaLista: { id: 23, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    tecnicoDeOutroSetor: { id: 30, role: 'Tecnico', role_id: 2, integra_equipe_ti: false },
    tecnicoDeServico: { id: 31, role: 'Tecnico', role_id: 2, integra_equipe_ti: false, conta_de_servico: true },
    usuarioNaListaDaQualidade: { id: 22, role: 'Usuario', role_id: 3, integra_equipe_ti: false },
    usuarioComum: { id: 40, role: 'Usuario', role_id: 3 },
  } as const;

  // [TI, QUALIDADE, sem setor, setor estranho]
  const esperado: Record<keyof typeof contas, [boolean, boolean, boolean, boolean]> = {
    adminHumano: [true, true, true, true],
    adminDeServico: [false, false, false, false],
    adminSemMarca: [false, false, false, false],
    tecnicoDaTI: [true, true, true, false],
    tecnicoDaQualidade: [false, true, false, false],
    tecnicoQualidadeForaDaLista: [false, false, false, false],
    tecnicoDeOutroSetor: [false, false, false, false],
    tecnicoDeServico: [false, false, false, false],
    usuarioNaListaDaQualidade: [false, false, false, false],
    usuarioComum: [false, false, false, false],
  };

  for (const [nome, conta] of Object.entries(contas)) {
    it(`${nome}: ${esperado[nome as keyof typeof contas].join(', ')}`, () => {
      const r = [TI, QUALIDADE, SEM_SETOR, ESTRANHO].map((c) =>
        podeAlterarComoEquipe(conta, true, c, atendentes)
      );
      expect(r).toEqual(esperado[nome as keyof typeof contas]);
    });
  }

  it('sem a identidade confirmada (ou com a confirmação suspensa), ninguém', () => {
    for (const conta of Object.values(contas)) {
      expect(podeAlterarComoEquipe(conta, false, TI, atendentes)).toBe(false);
      expect(podeAlterarComoEquipe(conta, false, QUALIDADE, atendentes)).toBe(false);
    }
  });

  it('lista da Qualidade ainda não lida: o técnico da Qualidade não altera', () => {
    expect(podeAlterarComoEquipe(contas.tecnicoDaQualidade, true, QUALIDADE, null)).toBe(false);
    expect(podeAlterarComoEquipe(contas.tecnicoDaQualidade, true, QUALIDADE, [])).toBe(false);
  });

  it('o vínculo não entra: ser o responsável ou o solicitante não dá edição', () => {
    const chamado = { setor_destino: 'TI', tecnico_responsavel_id: 21, solicitante_id: 21 };
    expect(podeAlterarComoEquipe(contas.tecnicoDaQualidade, true, chamado, atendentes)).toBe(false);
  });

  it('sem chamado ou sem usuário, não', () => {
    expect(podeAlterarComoEquipe(contas.adminHumano, true, null, atendentes)).toBe(false);
    expect(podeAlterarComoEquipe(null, true, TI, atendentes)).toBe(false);
  });
});

describe('podeEscolherSolicitante: a regra da criação na API (T-2)', () => {
  it('só o administrador humano, e só confirmado', () => {
    expect(podeEscolherSolicitante(PERFIS.administrador, true)).toBe(true);
    expect(podeEscolherSolicitante(PERFIS.administradorForaDaTI, true)).toBe(true);
    expect(podeEscolherSolicitante(PERFIS.administrador, false)).toBe(false);
  });

  it('a conta de serviço administradora e o administrador sem a marca lida não escolhem', () => {
    expect(podeEscolherSolicitante({ ...PERFIS.administrador, conta_de_servico: true }, true)).toBe(false);
    expect(podeEscolherSolicitante({ role: 'Administrador', role_id: 1 }, true)).toBe(false);
    expect(podeEscolherSolicitante({ ...PERFIS.administrador, conta_de_servico: 'false' }, true)).toBe(false);
  });

  it('nenhum outro perfil escolhe, nem o técnico da TI', () => {
    for (const [nome, perfil] of Object.entries(PERFIS)) {
      if (nome.startsWith('administrador')) continue;
      expect(podeEscolherSolicitante(perfil, true), nome).toBe(false);
    }
    expect(podeEscolherSolicitante(null, true)).toBe(false);
  });
});
