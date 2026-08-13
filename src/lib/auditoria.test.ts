import { describe, expect, it } from 'vitest';
import { descreverEvento, momentoDoEvento, tituloGenerico } from './auditoria';
import type { EventoDeAuditoria } from '../types/api';

function evento(campos: Partial<EventoDeAuditoria> = {}): EventoDeAuditoria {
  return {
    chave: 'conta:1',
    id: 1,
    alvo_tipo: 'conta',
    alvo_id: 10,
    alvo_nome: 'Gabriel',
    ator_id: 2,
    ator_nome: 'Rickelme',
    acao: 'alteracao_de_setor',
    valor_anterior: 'TI',
    valor_novo: 'Financeiro',
    origem: 'PUT /api/v1/usuarios/{id}',
    created_at: '2026-08-13T09:12:29-03:00',
    ...campos,
  };
}

describe('descreverEvento', () => {
  it('traduz a ação para linguagem de gente', () => {
    expect(descreverEvento(evento()).titulo).toBe('Setor alterado');
  });

  it('separa troca da própria senha de redefinição por administrador', () => {
    // A API grava as duas com a mesma `acao`; o que as distingue é o par de
    // ids. São coisas diferentes para quem audita: a primeira é rotina, a
    // segunda é intervenção de terceiro sobre a conta de alguém.
    const propria = evento({ acao: 'alteracao_de_senha', ator_id: 10, alvo_id: 10 });
    const redefinida = evento({ acao: 'alteracao_de_senha', ator_id: 2, alvo_id: 10 });

    expect(descreverEvento(propria).titulo).toBe('Senha alterada pelo próprio usuário');
    expect(descreverEvento(redefinida).titulo).toBe('Senha redefinida por administrador');
  });

  it('mostra o autor como "o próprio usuário" quando ator e alvo são o mesmo', () => {
    const proprio = evento({ ator_id: 10, alvo_id: 10 });
    expect(descreverEvento(proprio).autor).toBe('o próprio usuário');
  });

  it('sobrevive a ator removido', () => {
    // A trilha existe para não sumir junto com o que descreve. Quebrar aqui
    // apagaria da tela exatamente o registro que se quis preservar.
    const semAtor = evento({ ator_nome: null });
    expect(descreverEvento(semAtor).autor).toBe('usuário removido');
  });

  it('não inventa mudança quando falta um dos lados', () => {
    // "→ Tecnico" sem o antes sugere que antes não havia nada, o que é
    // diferente de "não foi registrado o valor anterior".
    expect(descreverEvento(evento({ valor_anterior: null })).mudanca).toBeUndefined();
    expect(descreverEvento(evento({ valor_novo: null })).mudanca).toBeUndefined();
  });

  it('mostra a mudança quando os dois lados existem', () => {
    expect(descreverEvento(evento()).mudanca).toEqual({ de: 'TI', para: 'Financeiro' });
  });

  it('aceita string vazia como valor legítimo', () => {
    // Apagar a descrição de alguém é uma mudança. Com checagem de veracidade
    // no lugar de comparação com null, o evento sumiria da tela.
    const apagou = evento({ valor_anterior: 'TI', valor_novo: '' });
    expect(descreverEvento(apagou).mudanca).toEqual({ de: 'TI', para: '' });
  });

  it('descreve ação desconhecida em vez de escondê-la', () => {
    // A API pode ganhar eventos novos sem este arquivo saber. Um painel de
    // auditoria que omite o que não reconhece esconde justamente o mais novo.
    const nova = descreverEvento(evento({ acao: 'bloqueio_por_tentativas' }));
    expect(nova.titulo).toBe('Bloqueio por tentativas');
  });
});

describe('tituloGenerico', () => {
  it('troca underscore por espaço e capitaliza', () => {
    expect(tituloGenerico('alteracao_de_coisa')).toBe('Alteracao de coisa');
  });

  it('não devolve string vazia', () => {
    expect(tituloGenerico('')).toBe('Evento sem descrição');
    expect(tituloGenerico('   ')).toBe('Evento sem descrição');
  });
});

describe('momentoDoEvento', () => {
  it('formata a data no padrão brasileiro', () => {
    const texto = momentoDoEvento('2026-08-13T09:12:29-03:00');
    expect(texto).toMatch(/^13\/08\/2026/);
  });

  it('devolve null sem data, em vez de inventar agora', () => {
    // A coluna é anulável no banco. Carimbar "agora" numa linha sem data
    // mentiria num painel cuja única função é dizer quando as coisas foram.
    expect(momentoDoEvento(null)).toBeNull();
    expect(momentoDoEvento(undefined)).toBeNull();
  });

  it('devolve null com data inválida', () => {
    expect(momentoDoEvento('nem data é')).toBeNull();
  });
});
