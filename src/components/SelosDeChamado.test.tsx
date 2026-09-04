import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '../context/ThemeContext';
import { PrioridadeEnum, StatusEnum } from '../types/api';
import { ROLE_MAP } from '../utils/roleMapper';
import {
  MarcaBadge,
  PapelBadge,
  PrioridadeBadge,
  StatusBadge,
  VARIANTE_DE_PAPEL,
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

describe('selo de papel', () => {
  it('cobre todos os papéis que o roleMapper conhece', () => {
    // Se a API ganhar um quarto papel e alguém acrescentar em `ROLE_MAP` sem
    // vir aqui, o selo cai no `neutro` do fallback — que é o certo, mas em
    // silêncio. Este caso obriga a decisão a ser tomada.
    for (const id of Object.keys(ROLE_MAP).map(Number)) {
      expect(VARIANTE_DE_PAPEL[id]).toBeDefined();
    }
  });

  it('o rótulo vem do roleMapper, não de um texto escrito no selo', () => {
    // É o que impede rótulo e cor de divergirem: os dois saem do mesmo id.
    for (const [id, nome] of Object.entries(ROLE_MAP)) {
      expect(comTema(<PapelBadge roleId={Number(id)} />)).toContain(nome);
    }
  });

  /**
   * Administrador e Técnico DIVIDEM a variante, e isso é deliberado.
   *
   * É o contrário do que os casos de status travam ali em cima, então precisa
   * estar escrito, senão alguém "conserta" um dia. O `switch` que este selo
   * substituiu separava os dois por **5% de alfa** sobre o mesmo azul —
   * `bg-info/15` contra `bg-info/20`. Isso não é distinção discreta: é
   * distinção que ninguém enxerga, e a §16 já manda nunca separar só por cor.
   *
   * Quem distingue os dois é o rótulo, travado pelo caso acima. Igualar as
   * variantes não perde informação nenhuma — só para de fingir que havia.
   */
  it('Administrador e Técnico dividem a variante, de propósito', () => {
    expect(VARIANTE_DE_PAPEL[1]).toBe(VARIANTE_DE_PAPEL[2]);
  });

  /**
   * Papel desconhecido cai em `neutro`, e o rótulo cai em "Usuario".
   *
   * Os dois lados combinam de propósito: `getRoleName` já devolve `'Usuario'`
   * para id que não conhece, e um selo neutro escrito "Usuario" é coerente.
   * O `default` do `switch` antigo não era: trazia `text-conteudo` e
   * `text-conteudo-suave` na MESMA string de classes, e quem vencia era
   * decidido pela ordem da folha de estilo, não pela ordem escrita.
   *
   * ── O que a mutação mostrou, e fica dito para ninguém "limpar" ───────
   *
   * Este caso passa MESMO se o `?? 'neutro'` sair do `PapelBadge`, porque o
   * `Badge` já tem `variante = 'neutro'` como parâmetro padrão e `undefined`
   * cai nele. Ou seja, hoje a garantia é dupla.
   *
   * O caso continua valendo, e é de propósito: ele trava o RESULTADO — papel
   * desconhecido sai neutro e nomeado —, não o mecanismo que produz o
   * resultado. Era a falha dos dois casos de `ramosDoTemplate` que a sessão do
   * HelpHS apontou: testar a existência da engrenagem em vez do efeito dela.
   *
   * E o `?? 'neutro'` FICA, mesmo redundante hoje. Sem ele, a cor de um papel
   * desconhecido passaria a depender do valor padrão de outro componente, à
   * distância: trocar o padrão do `Badge` mudaria este selo em silêncio.
   */
  it('papel desconhecido não fica sem cor nem sem nome', () => {
    const html = comTema(<PapelBadge roleId={99} />);
    expect(html).toContain('bg-tint-neutral');
    expect(html).toContain('Usuario');
  });
});
