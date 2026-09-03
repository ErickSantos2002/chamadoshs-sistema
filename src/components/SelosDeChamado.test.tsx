import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '../context/ThemeContext';
import { PrioridadeEnum, StatusEnum } from '../types/api';
import {
  MarcaBadge,
  PrioridadeBadge,
  StatusBadge,
  VARIANTE_DE_PRIORIDADE,
  VARIANTE_DE_STATUS,
} from './SelosDeChamado';

/**
 * O mapa de status da §16, travado.
 *
 * ── Por que este arquivo existe ───────────────────────────────────────
 *
 * Antes da Fase 7 este mapa estava copiado à mão em três arquivos, e as cópias
 * já discordavam do que a §16 pede em três pontos. Um mapa copiado é uma
 * decisão que vale até alguém mexer numa das cópias.
 *
 * O que estes casos travam não é a cor: é a DISTINÇÃO. Dois status na mesma
 * variante é o defeito que existia — `Aberto` e `Em Andamento` eram os dois
 * `info`, `Resolvido` e `Fechado` os dois `sucesso` — e é o tipo de coisa que
 * nada quebra: a tela continua funcionando, só deixa de informar.
 */

const comTema = (elemento: React.ReactElement) =>
  renderToStaticMarkup(<ThemeProvider>{elemento}</ThemeProvider>);

describe('mapa de status', () => {
  it('cobre todos os status da API, sem sobra nem falta', () => {
    const daApi = Object.values(StatusEnum).sort();
    const doMapa = Object.keys(VARIANTE_DE_STATUS).sort();
    expect(doMapa).toEqual(daApi);
  });

  it('cobre todas as prioridades da API', () => {
    const daApi = Object.values(PrioridadeEnum).sort();
    const doMapa = Object.keys(VARIANTE_DE_PRIORIDADE).sort();
    expect(doMapa).toEqual(daApi);
  });

  /**
   * O caso que importa: cinco status, cinco variantes distintas.
   *
   * Se alguém devolver `Em Andamento` para `info` ou `Fechado` para `sucesso`,
   * dois estados voltam a ser a mesma cor e este caso fica vermelho.
   */
  it('nenhum status divide variante com outro', () => {
    const variantes = Object.values(VARIANTE_DE_STATUS);
    expect(new Set(variantes).size).toBe(variantes.length);
  });

  it('nenhuma prioridade divide variante com outra', () => {
    const variantes = Object.values(VARIANTE_DE_PRIORIDADE);
    expect(new Set(variantes).size).toBe(variantes.length);
  });

  /** O mapa aprovado pelo operador em 03/09/2026, item a item. */
  it('é o mapa da §16', () => {
    expect(VARIANTE_DE_STATUS).toEqual({
      [StatusEnum.ABERTO]: 'info',
      [StatusEnum.EM_ANDAMENTO]: 'principal',
      [StatusEnum.AGUARDANDO]: 'alerta',
      [StatusEnum.RESOLVIDO]: 'sucesso',
      [StatusEnum.FECHADO]: 'discreto',
    });
    expect(VARIANTE_DE_PRIORIDADE).toEqual({
      [PrioridadeEnum.CRITICA]: 'perigo',
      [PrioridadeEnum.ALTA]: 'alerta',
      [PrioridadeEnum.MEDIA]: 'info',
      [PrioridadeEnum.BAIXA]: 'discreto',
    });
  });
});

describe('selos', () => {
  /**
   * O rótulo é o valor do enum, e não um texto escrito aqui.
   *
   * A §16 traz rótulos oficiais um pouco diferentes ("Em andamento", "Baixo"),
   * mas a §30 proíbe reescrever rótulo que a tela já mostra. Se alguém trocar,
   * este caso pega.
   */
  it('o rótulo do status vem da API', () => {
    for (const status of Object.values(StatusEnum)) {
      expect(comTema(<StatusBadge status={status} />)).toContain(status);
    }
  });

  it('o rótulo da prioridade vem da API', () => {
    for (const p of Object.values(PrioridadeEnum)) {
      expect(comTema(<PrioridadeBadge prioridade={p} />)).toContain(p);
    }
  });

  it('a marca traz rótulo e cor de um lugar só', () => {
    const cancelado = comTema(<MarcaBadge marca="cancelado" />);
    expect(cancelado).toContain('Cancelado');
    expect(cancelado).toContain('bg-tint-danger');

    const arquivado = comTema(<MarcaBadge marca="arquivado" />);
    expect(arquivado).toContain('Arquivado');
    expect(arquivado).toContain('bg-tint-neutral');
  });

  /**
   * `Em Andamento` usa a tinta de marca, que é a variante que não existia
   * antes desta fase. Se `principal` sumir do Badge, o mapa aponta para o
   * vazio e o selo sai sem fundo — sem erro nenhum.
   */
  it('Em Andamento pinta com a tinta de marca', () => {
    const html = comTema(<StatusBadge status={StatusEnum.EM_ANDAMENTO} />);
    expect(html).toContain('bg-tint-primary');
    expect(html).toContain('text-on-tint-primary');
  });
});
