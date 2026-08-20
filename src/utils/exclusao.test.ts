import { describe, it, expect } from 'vitest';
import { confirmacaoConfere, podeExcluir } from './exclusao';

/**
 * Excluir é a única ação do sistema que não tem volta. Cancelar, arquivar e
 * mudar status são todas reversíveis; esta apaga o chamado e leva junto tudo
 * que pendurava nele.
 *
 * Por isso a regra vive numa função só, com teste. O sistema já tem o caso
 * contrário para olhar: a regra de "não agir em chamado fora do fluxo" foi
 * escrita duas vezes — em `AcoesRapidas` e no `getBotoesAcao` da página — e só
 * uma das cópias recebeu a manutenção. Uma regra que apaga dados não pode
 * entrar nessa armadilha.
 */
const chamado = (arquivado = false, cancelado = false) => ({
  arquivado,
  cancelado,
});

describe('podeExcluir', () => {
  it('deixa o administrador excluir chamado cancelado', () => {
    expect(podeExcluir(chamado(false, true), 'Administrador')).toBe(true);
  });

  it('deixa o administrador excluir chamado arquivado', () => {
    expect(podeExcluir(chamado(true, false), 'Administrador')).toBe(true);
  });

  it('deixa o administrador excluir o que está cancelado e arquivado', () => {
    expect(podeExcluir(chamado(true, true), 'Administrador')).toBe(true);
  });

  /**
   * O chamado ativo é trabalho de alguém, e ninguém deveria conseguir fazê-lo
   * sumir com dois cliques. Quem quer apagar um chamado vivo cancela primeiro —
   * e esse cancelamento fica registrado, com motivo e autor.
   */
  it('não deixa excluir chamado que ainda está no fluxo', () => {
    expect(podeExcluir(chamado(false, false), 'Administrador')).toBe(false);
  });

  /**
   * Técnico cancela e arquiva — as duas ações que dão para desfazer. A que não
   * dá fica com quem responde pelo sistema.
   */
  it('não deixa o técnico excluir, nem chamado cancelado', () => {
    expect(podeExcluir(chamado(false, true), 'Tecnico')).toBe(false);
  });

  it('não deixa o usuário comum excluir', () => {
    expect(podeExcluir(chamado(false, true), 'Usuario')).toBe(false);
  });

  // Enquanto a sessão não carregou, `role` é undefined. O padrão tem que ser
  // "não pode": um botão que pisca na tela durante o carregamento de uma ação
  // irreversível é convite a clique acidental.
  it('não deixa excluir enquanto o perfil não carregou', () => {
    expect(podeExcluir(chamado(false, true), undefined)).toBe(false);
  });

  // Perfil que este código não conhece não herda permissão de ninguém.
  it('não deixa excluir com perfil desconhecido', () => {
    expect(podeExcluir(chamado(false, true), 'Supervisor')).toBe(false);
  });
});

describe('confirmacaoConfere', () => {
  it('confere quando a pessoa digita o protocolo', () => {
    expect(confirmacaoConfere('CHAM-2026-0107', 'CHAM-2026-0107')).toBe(true);
  });

  // O protocolo está na tela em maiúsculas. Reprovar quem digitou minúsculo
  // não protege dado nenhum — só empurra a pessoa para o copiar e colar.
  it('não briga com a caixa nem com espaço sobrando', () => {
    expect(confirmacaoConfere('cham-2026-0107', 'CHAM-2026-0107')).toBe(true);
    expect(confirmacaoConfere('  CHAM-2026-0107  ', 'CHAM-2026-0107')).toBe(true);
  });

  it('não confere com protocolo de outro chamado', () => {
    expect(confirmacaoConfere('CHAM-2026-0108', 'CHAM-2026-0107')).toBe(false);
  });

  it('não confere com o começo do protocolo', () => {
    expect(confirmacaoConfere('CHAM-2026', 'CHAM-2026-0107')).toBe(false);
  });

  /**
   * O furo que este caso existe para impedir. Escrita inline no JSX, a
   * comparação usava `(chamado?.protocolo ?? '')` — e com chamado nulo virava
   * `'' === ''`, verdadeiro. O botão só não abria porque o modal não renderiza
   * sem chamado: a trava dependia de outra condição para não falhar.
   */
  it('nunca confere com campo em branco, nem sem protocolo', () => {
    expect(confirmacaoConfere('', 'CHAM-2026-0107')).toBe(false);
    expect(confirmacaoConfere('   ', 'CHAM-2026-0107')).toBe(false);
    expect(confirmacaoConfere('', '')).toBe(false);
    expect(confirmacaoConfere('', undefined)).toBe(false);
    expect(confirmacaoConfere('qualquer coisa', undefined)).toBe(false);
  });
});
