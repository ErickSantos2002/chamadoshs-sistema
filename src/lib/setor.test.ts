import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chamado, SetorDestinoEnum } from '../types/api';
import {
  LIMITE_DO_RECEBIDO,
  OPCOES_DE_SETOR,
  _esquecerAvisos,
  avisarSetorInesperado,
  casaComFiltroDeSetor,
  lerSetor,
  rotuloDoSetor,
  setorDoChamado,
  temSetoresMisturados,
} from './setor';

/**
 * O setor de destino, e a fronteira entre o que a API mandou e o que a tela
 * conclui.
 *
 * O caso que estes testes existem para travar é o do valor que NÃO é TI nem
 * Qualidade. O jeito fácil de tratá-lo é o `?? 'TI'` — e ele esconde o defeito
 * duas vezes: o chamado aparece como TI na tela e entra no filtro de TI. Quem
 * investigasse depois veria um chamado "de TI" que a API diz ser de outra
 * coisa.
 */

const chamado = (setor_destino?: unknown): Chamado =>
  ({ id: 1, setor_destino } as unknown as Chamado);

/** Chamado de API antiga: a chave nem existe no objeto. */
const chamadoSemCampo = (): Chamado => ({ id: 1 } as unknown as Chamado);

describe('lerSetor — as três origens', () => {
  it('campo ausente é TI, e diz que veio da ausência', () => {
    expect(lerSetor(undefined)).toEqual({
      origem: 'ausente',
      setor: SetorDestinoEnum.TI,
    });
  });

  it('TI e QUALIDADE são válidos', () => {
    expect(lerSetor('TI')).toEqual({ origem: 'valido', setor: SetorDestinoEnum.TI });
    expect(lerSetor('QUALIDADE')).toEqual({
      origem: 'valido',
      setor: SetorDestinoEnum.QUALIDADE,
    });
  });

  /**
   * O contrato é o valor do enum, exato. Aceitar "qualidade" ou " TI " seria
   * adivinhar o que a API quis dizer — e a adivinhação é o que esconde o
   * defeito do outro lado.
   */
  it('não normaliza caixa nem espaço: o contrato é o valor exato', () => {
    for (const quase of ['qualidade', 'Qualidade', 'ti', ' TI', 'TI ']) {
      const leitura = lerSetor(quase);
      expect(leitura.origem, quase).toBe('inesperado');
      expect(leitura.setor, quase).toBeNull();
    }
  });

  it('valor desconhecido não vira TI nem Qualidade, e guarda o que veio', () => {
    expect(lerSetor('RH')).toEqual({ origem: 'inesperado', setor: null, recebido: 'RH' });
  });

  it('string vazia é inesperada, e não ausente', () => {
    const leitura = lerSetor('');
    expect(leitura.origem).toBe('inesperado');
    expect(leitura.setor).toBeNull();
    expect(leitura.origem === 'inesperado' && leitura.recebido).toBe('(vazio)');
  });

  /**
   * `null` não é ausência: a API antiga OMITE o campo, e a nova manda um dos
   * dois valores. Um `null` é a API dizendo algo que nenhuma das duas diz.
   */
  it('null é inesperado, e não vira TI', () => {
    const leitura = lerSetor(null);
    expect(leitura.setor).toBeNull();
    expect(leitura.origem === 'inesperado' && leitura.recebido).toBe('(nulo)');
  });

  it('entrada que não é string é inesperada e descrita sem quebrar', () => {
    const casos: Array<[unknown, string]> = [
      [42, '42'],
      [true, 'true'],
      [{ nome: 'TI' }, '(objeto)'],
      [['TI'], '(lista)'],
    ];
    for (const [valor, esperado] of casos) {
      const leitura = lerSetor(valor);
      expect(leitura.setor).toBeNull();
      expect(leitura.origem === 'inesperado' && leitura.recebido).toBe(esperado);
    }
  });
});

describe('lerSetor — a representação do valor recebido', () => {
  const recebido = (valor: unknown) => {
    const leitura = lerSetor(valor);
    if (leitura.origem !== 'inesperado') throw new Error('devia ser inesperado');
    return leitura.recebido;
  };

  it('corta o que é longo demais, e avisa que cortou', () => {
    const texto = recebido('X'.repeat(500));
    expect(texto.length).toBeLessThanOrEqual(LIMITE_DO_RECEBIDO);
    expect(texto.endsWith('…')).toBe(true);
  });

  it('tira caractere de controle e junta o espaço', () => {
    expect(recebido('RH\n\t\u0000 novo')).toBe('RH novo');
  });

  it('string só de espaço é tratada como vazia', () => {
    expect(recebido('   ')).toBe('(vazio)');
  });

  /**
   * HTML chega como TEXTO. Quem garante que não vira marcação é o React, que
   * escapa todo filho de texto; o trabalho daqui é não transformar o valor em
   * outra coisa no caminho — nem apagar os sinais, que são o diagnóstico.
   */
  it('marcação passa como texto, sem ser interpretada nem apagada', () => {
    expect(recebido('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('setorDoChamado', () => {
  it('chamado de API antiga, sem a chave, é TI por ausência', () => {
    expect(setorDoChamado(chamadoSemCampo())).toEqual({
      origem: 'ausente',
      setor: SetorDestinoEnum.TI,
    });
  });

  it('lê o campo do chamado', () => {
    expect(setorDoChamado(chamado('QUALIDADE')).setor).toBe(SetorDestinoEnum.QUALIDADE);
  });
});

describe('rótulos', () => {
  it('TI é TI e QUALIDADE é Qualidade', () => {
    expect(rotuloDoSetor(SetorDestinoEnum.TI)).toBe('TI');
    expect(rotuloDoSetor(SetorDestinoEnum.QUALIDADE)).toBe('Qualidade');
  });

  it('as opções do filtro cobrem todo setor do enum, com "todos" na frente', () => {
    expect(OPCOES_DE_SETOR[0]).toEqual({ valor: '', rotulo: 'Todos os setores' });
    expect(OPCOES_DE_SETOR.slice(1).map((o) => o.valor).sort()).toEqual(
      Object.values(SetorDestinoEnum).sort()
    );
  });
});

describe('casaComFiltroDeSetor', () => {
  const ti = chamado('TI');
  const antigo = chamadoSemCampo();
  const qualidade = chamado('QUALIDADE');
  const estranho = chamado('RH');
  const todos = [ti, antigo, qualidade, estranho];

  it('"todos" deixa tudo passar, inclusive o desconhecido', () => {
    expect(todos.filter((c) => casaComFiltroDeSetor(c, ''))).toEqual(todos);
  });

  it('TI pega o explícito e o da API antiga, e mais nada', () => {
    expect(todos.filter((c) => casaComFiltroDeSetor(c, SetorDestinoEnum.TI))).toEqual([
      ti,
      antigo,
    ]);
  });

  it('Qualidade pega só Qualidade', () => {
    expect(
      todos.filter((c) => casaComFiltroDeSetor(c, SetorDestinoEnum.QUALIDADE))
    ).toEqual([qualidade]);
  });

  it('valor desconhecido não entra em TI nem em Qualidade', () => {
    expect(casaComFiltroDeSetor(estranho, SetorDestinoEnum.TI)).toBe(false);
    expect(casaComFiltroDeSetor(estranho, SetorDestinoEnum.QUALIDADE)).toBe(false);
    expect(casaComFiltroDeSetor(chamado(''), SetorDestinoEnum.TI)).toBe(false);
    expect(casaComFiltroDeSetor(chamado(null), SetorDestinoEnum.TI)).toBe(false);
  });
});

describe('temSetoresMisturados', () => {
  it('lista vazia não mistura', () => {
    expect(temSetoresMisturados([])).toBe(false);
  });

  it('só API antiga não mistura — é tudo TI', () => {
    expect(temSetoresMisturados([chamadoSemCampo(), chamadoSemCampo()])).toBe(false);
  });

  it('TI explícito com API antiga não mistura — é o mesmo setor', () => {
    expect(temSetoresMisturados([chamado('TI'), chamadoSemCampo()])).toBe(false);
  });

  it('TI com Qualidade mistura', () => {
    expect(temSetoresMisturados([chamadoSemCampo(), chamado('QUALIDADE')])).toBe(true);
  });

  it('só Qualidade não mistura', () => {
    expect(temSetoresMisturados([chamado('QUALIDADE')])).toBe(false);
  });

  /**
   * O seletor só oferece setores reconhecidos. Um valor estranho ao lado de
   * TI não cria escolha nenhuma — e o chamado continua visível em "todos".
   */
  it('valor desconhecido não conta como setor', () => {
    expect(temSetoresMisturados([chamado('TI'), chamado('RH')])).toBe(false);
  });
});

describe('avisarSetorInesperado', () => {
  beforeEach(() => _esquecerAvisos());

  it('avisa uma vez só por chamado e valor, por mais que seja chamado', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = { id: 7, setor_destino: 'RH' } as unknown as Chamado;

    for (let i = 0; i < 50; i++) avisarSetorInesperado(c);

    expect(aviso).toHaveBeenCalledTimes(1);
    expect(aviso.mock.calls[0][0]).toContain('chamado 7');
    expect(aviso.mock.calls[0][0]).toContain('RH');
  });

  it('outro chamado com o mesmo valor avisa de novo', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    avisarSetorInesperado({ id: 1, setor_destino: 'RH' } as unknown as Chamado);
    avisarSetorInesperado({ id: 2, setor_destino: 'RH' } as unknown as Chamado);
    expect(aviso).toHaveBeenCalledTimes(2);
  });

  it('não avisa para TI, Qualidade nem campo ausente', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    avisarSetorInesperado({ id: 1, setor_destino: 'TI' } as unknown as Chamado);
    avisarSetorInesperado({ id: 2, setor_destino: 'QUALIDADE' } as unknown as Chamado);
    avisarSetorInesperado({ id: 3 } as unknown as Chamado);
    expect(aviso).not.toHaveBeenCalled();
  });

  /** O aviso vai para o console de quem usa: só id e o valor tratado. */
  it('não leva título, descrição nem solicitante', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    avisarSetorInesperado({
      id: 9,
      setor_destino: 'X'.repeat(300),
      titulo: 'Notebook da Maria',
      descricao: 'CPF 123',
      solicitante_id: 55,
    } as unknown as Chamado);

    const mensagem = aviso.mock.calls[0].join(' ');
    expect(mensagem).not.toContain('Maria');
    expect(mensagem).not.toContain('CPF');
    expect(mensagem).not.toContain('55');
    // E o valor sai cortado também aqui, não só na tela.
    expect(mensagem).not.toContain('X'.repeat(LIMITE_DO_RECEBIDO + 1));
  });
});
