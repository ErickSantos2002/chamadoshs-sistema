import { describe, it, expect } from 'vitest';
import {
  ehAdministrador,
  integraEquipeTI,
  podeAdministrar,
  podeAdministrarUsuarios,
} from './permissoes';

/**
 * A regra de interface da administração (FE-5, F5-3): administrador pelo
 * perfil, ou técnico que o backend diz ser da TI — e nada antes da
 * identidade confirmada. Cada perfil abaixo é uma conta que existe na HS.
 */

const PERFIS = {
  administrador: { role: 'Administrador', role_id: 1, integra_equipe_ti: true },
  administradorForaDaTI: { role: 'Administrador', role_id: 1, integra_equipe_ti: false },
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

  it('o administrador administra pelo perfil, mesmo com o campo falso ou ausente', () => {
    expect(podeAdministrar({ role: 'Administrador' }, true)).toBe(true);
    expect(podeAdministrar({ role_id: 1 }, true)).toBe(true);
    expect(podeAdministrar({ role: 'Administrador', integra_equipe_ti: null }, true)).toBe(true);
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
