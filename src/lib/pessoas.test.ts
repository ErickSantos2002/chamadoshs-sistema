import { describe, it, expect } from 'vitest';
import { ehDaPessoa, responsaveisDosChamados, SEM_RESPONSAVEL } from './pessoas';
import { Chamado, StatusEnum, Usuario } from '../types/api';

const chamadoDe = (id: number, responsavel?: number): Chamado =>
  ({
    id,
    status: StatusEnum.ABERTO,
    tecnico_responsavel_id: responsavel,
    titulo: `Chamado ${id}`,
  }) as Chamado;

const usuarios = {
  1: { id: 1, nome: 'Rickelme David' },
  2: { id: 2, nome: 'Ana Paula' },
  3: { id: 3, nome: 'Wanderson Lima' },
} as unknown as Record<number, Usuario>;

describe('responsaveisDosChamados', () => {
  it('lista só quem tem chamado, em ordem alfabética', () => {
    const opcoes = responsaveisDosChamados(
      [chamadoDe(1, 1), chamadoDe(2, 3), chamadoDe(3, 1)],
      usuarios
    );

    expect(opcoes).toEqual([
      { valor: '1', rotulo: 'Rickelme David' },
      { valor: '3', rotulo: 'Wanderson Lima' },
    ]);
  });

  /**
   * A opção que devolve lista vazia ensina a não confiar no filtro: se todo
   * chamado tem dono, "Sem responsável" não tem o que mostrar.
   */
  it('não oferece "Sem responsável" quando todo chamado tem dono', () => {
    const opcoes = responsaveisDosChamados([chamadoDe(1, 1)], usuarios);

    expect(opcoes.map((o) => o.valor)).toEqual(['1']);
  });

  // Primeiro, e não na letra S: é a opção de quem está distribuindo trabalho.
  it('põe "Sem responsável" na frente quando existe chamado sem ninguém', () => {
    const opcoes = responsaveisDosChamados(
      [chamadoDe(1, 3), chamadoDe(2), chamadoDe(3, 2)],
      usuarios
    );

    expect(opcoes).toEqual([
      { valor: SEM_RESPONSAVEL, rotulo: 'Sem responsável' },
      { valor: '2', rotulo: 'Ana Paula' },
      { valor: '3', rotulo: 'Wanderson Lima' },
    ]);
  });

  /**
   * Quem saiu da empresa não vem na listagem de usuários ativos, mas continua
   * responsável pelos chamados antigos. Tirá-lo daqui tornaria esses chamados
   * infiltráveis — e o índice de nomes inclui inativos justamente por isso.
   */
  it('mantém no filtro quem ainda é responsável, mesmo desconhecido', () => {
    const opcoes = responsaveisDosChamados([chamadoDe(1, 99)], usuarios);

    expect(opcoes).toEqual([{ valor: '99', rotulo: 'Usuário #99' }]);
  });
});

describe('ehDaPessoa', () => {
  it('deixa tudo passar com o filtro desligado', () => {
    expect(ehDaPessoa(chamadoDe(1, 1), '')).toBe(true);
    expect(ehDaPessoa(chamadoDe(2), '')).toBe(true);
  });

  it('casa pelo id do responsável', () => {
    expect(ehDaPessoa(chamadoDe(1, 1), '1')).toBe(true);
    expect(ehDaPessoa(chamadoDe(2, 2), '1')).toBe(false);
  });

  it('casa o chamado sem dono só em "Sem responsável"', () => {
    expect(ehDaPessoa(chamadoDe(1), SEM_RESPONSAVEL)).toBe(true);
    expect(ehDaPessoa(chamadoDe(2, 1), SEM_RESPONSAVEL)).toBe(false);
    expect(ehDaPessoa(chamadoDe(3), '1')).toBe(false);
  });
});
