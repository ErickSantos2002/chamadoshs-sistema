import { describe, it, expect } from 'vitest';
import {
  ROLE_MAP,
  getRoleName,
  getRoleId,
  isAdmin,
  isTecnico,
  isUsuario,
  podeAtenderChamado,
  podeSerResponsavel,
} from './roleMapper';

describe('roleMapper', () => {
  describe('getRoleName', () => {
    it('converte cada role_id conhecido no nome correspondente', () => {
      expect(getRoleName(1)).toBe('Administrador');
      expect(getRoleName(2)).toBe('Tecnico');
      expect(getRoleName(3)).toBe('Usuario');
    });

    // O fallback é uma decisão de segurança, não conveniência: diante de um
    // role_id desconhecido o sistema precisa assumir o MENOR privilégio. Se
    // alguém trocar o fallback para 'Administrador', este teste quebra.
    it('cai no perfil de menor privilégio quando o role_id é desconhecido', () => {
      expect(getRoleName(99)).toBe('Usuario');
      expect(getRoleName(0)).toBe('Usuario');
      expect(getRoleName(-1)).toBe('Usuario');
    });

    it('nunca promove a Administrador por acidente', () => {
      const desconhecidos = [0, -1, 4, 99, 1.5, NaN, Infinity];
      for (const id of desconhecidos) {
        expect(getRoleName(id)).not.toBe('Administrador');
      }
    });
  });

  describe('getRoleId', () => {
    it('converte cada nome conhecido no role_id correspondente', () => {
      expect(getRoleId('Administrador')).toBe(1);
      expect(getRoleId('Tecnico')).toBe(2);
      expect(getRoleId('Usuario')).toBe(3);
    });

    it('cai no perfil de menor privilégio quando o nome é desconhecido', () => {
      expect(getRoleId('Gerente')).toBe(3);
      expect(getRoleId('')).toBe(3);
    });

    // A comparação é literal: a API grava "Tecnico" sem acento (ver
    // schema_chamados.sql) e o backend normaliza acentos antes de comparar,
    // mas o frontend não. Este teste fixa o formato esperado — se a tabela
    // `roles` mudar para "Técnico", ele quebra e avisa antes da produção.
    it('depende da grafia exata gravada na tabela roles', () => {
      expect(getRoleId('Tecnico')).toBe(2);
      expect(getRoleId('tecnico')).toBe(3);
      expect(getRoleId('Técnico')).toBe(3);
    });
  });

  describe('ida e volta', () => {
    it('preserva o valor ao converter id -> nome -> id', () => {
      for (const id of [1, 2, 3]) {
        expect(getRoleId(getRoleName(id))).toBe(id);
      }
    });

    it('ROLE_MAP cobre exatamente os três perfis do sistema', () => {
      expect(Object.keys(ROLE_MAP)).toEqual(['1', '2', '3']);
    });
  });

  describe('verificações de perfil', () => {
    it('identifica o administrador apenas pelo id 1', () => {
      expect(isAdmin(1)).toBe(true);
      expect(isAdmin(2)).toBe(false);
      expect(isAdmin(3)).toBe(false);
      expect(isAdmin(99)).toBe(false);
    });

    it('identifica o técnico apenas pelo id 2', () => {
      expect(isTecnico(2)).toBe(true);
      expect(isTecnico(1)).toBe(false);
      expect(isTecnico(3)).toBe(false);
    });

    it('identifica o usuário comum apenas pelo id 3', () => {
      expect(isUsuario(3)).toBe(true);
      expect(isUsuario(1)).toBe(false);
      expect(isUsuario(2)).toBe(false);
    });

    // A equipe de TI da HS administra o sistema E atende chamado. Filtrar a
    // lista de atribuição só por técnico deixaria os administradores de fora.
    it('administrador e técnico podem ser responsáveis por chamado', () => {
      expect(podeAtenderChamado(1)).toBe(true);
      expect(podeAtenderChamado(2)).toBe(true);
    });

    it('usuário comum não pode ser responsável por chamado', () => {
      expect(podeAtenderChamado(3)).toBe(false);
      expect(podeAtenderChamado(99)).toBe(false);
    });

    it('as três verificações são mutuamente exclusivas', () => {
      for (const id of [1, 2, 3]) {
        const positivas = [isAdmin(id), isTecnico(id), isUsuario(id)].filter(Boolean);
        expect(positivas).toHaveLength(1);
      }
    });
  });

  describe('podeSerResponsavel', () => {
    it('aceita pessoa com perfil de administrador ou técnico', () => {
      expect(podeSerResponsavel({ role_id: 1, conta_de_servico: false })).toBe(true);
      expect(podeSerResponsavel({ role_id: 2, conta_de_servico: false })).toBe(true);
    });

    // O painel de TV da sala e o login do FortiPAM têm perfil de técnico para
    // conseguir enxergar os chamados, mas atribuir chamado a eles não diz quem
    // é o responsável.
    it('recusa conta de serviço mesmo com perfil que atenderia', () => {
      expect(podeSerResponsavel({ role_id: 1, conta_de_servico: true })).toBe(false);
      expect(podeSerResponsavel({ role_id: 2, conta_de_servico: true })).toBe(false);
    });

    it('recusa usuário comum, com ou sem a marca', () => {
      expect(podeSerResponsavel({ role_id: 3 })).toBe(false);
      expect(podeSerResponsavel({ role_id: 3, conta_de_servico: true })).toBe(false);
    });

    // Enquanto a API não expuser o campo, o comportamento tem que ser o de
    // hoje — é o que permite os dois repositórios subirem em qualquer ordem.
    it('trata campo ausente como pessoa', () => {
      expect(podeSerResponsavel({ role_id: 1 })).toBe(true);
      expect(podeSerResponsavel({ role_id: 2 })).toBe(true);
    });
  });

  describe('exclusividade dos perfis', () => {
    it('continua mutuamente exclusiva', () => {
      for (const id of [1, 2, 3]) {
        const positivas = [isAdmin(id), isTecnico(id), isUsuario(id)].filter(Boolean);
        expect(positivas).toHaveLength(1);
      }
    });
  });
});
