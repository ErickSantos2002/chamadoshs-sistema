import { describe, expect, it } from 'vitest';
import {
  CATEGORICA_CLARA,
  CATEGORICA_ESCURA,
  corDaPrioridade,
  corDaSerie,
  corDoStatus,
  estiloDoGrafico,
  paletaCategorica,
} from './graficos';

/**
 * O que estes testes protegem, e o que NÃO protegem.
 *
 * Eles travam as invariantes estruturais: cores distintas onde a distinção é o
 * ponto, e o mesmo status devolvendo a mesma cor venha pelo nome que vier.
 *
 * A qualidade das cores em si — contraste e separação para daltonismo — é
 * conferida por `npm run validar:paleta`, que roda no build. Não dá para
 * afirmar aqui que uma cor é legível; dá para afirmar que duas colunas do
 * quadro não são a mesma cor, que é o defeito que já chegou em produção.
 */

const TEMAS = [
  { nome: 'claro', escuro: false },
  { nome: 'escuro', escuro: true },
];

/** Os quatro status que viram coluna no quadro, lado a lado na mesma tela. */
const STATUS_DO_QUADRO = ['Aberto', 'Em Andamento', 'Aguardando', 'Resolvido'];
const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Crítica'];

describe('corDoStatus', () => {
  it.each(TEMAS)('dá cor diferente a cada coluna do quadro (tema $nome)', ({ escuro }) => {
    const cores = STATUS_DO_QUADRO.map((s) => corDoStatus(s, escuro));

    // Foi exatamente isto que quebrou na 1.3.1: uma varredura de cor deixou
    // "Aguardando" com o mesmo valor de "Aberto", duas das quatro colunas
    // ficaram idênticas e nada acusou.
    expect(new Set(cores).size).toBe(STATUS_DO_QUADRO.length);
  });

  it.each(TEMAS)('trata singular e plural como o mesmo status (tema $nome)', ({ escuro }) => {
    // O painel rotula as fatias como "Abertos"; o quadro nomeia a coluna como
    // "Aberto". Mesma entidade, dois rótulos — precisa ser uma cor só.
    expect(corDoStatus('Abertos', escuro)).toBe(corDoStatus('Aberto', escuro));
    expect(corDoStatus('Resolvidos', escuro)).toBe(corDoStatus('Resolvido', escuro));
  });

  it.each(TEMAS)('trata Fechado como Resolvido (tema $nome)', ({ escuro }) => {
    // A interface unifica os dois: quem fecha vê "Resolvido".
    expect(corDoStatus('Fechado', escuro)).toBe(corDoStatus('Resolvido', escuro));
  });

  it.each(TEMAS)('devolve cor neutra para status desconhecido (tema $nome)', ({ escuro }) => {
    const cor = corDoStatus('Status Que Não Existe', escuro);

    expect(cor).toMatch(/^#[0-9A-F]{6}$/i);
    // O desconhecido não pode cair na cor de um status real, senão um valor
    // novo vindo da API se disfarça de status existente.
    expect(STATUS_DO_QUADRO.map((s) => corDoStatus(s, escuro))).not.toContain(cor);
  });
});

describe('corDaPrioridade', () => {
  it.each(TEMAS)('dá cor diferente a cada prioridade (tema $nome)', ({ escuro }) => {
    const cores = PRIORIDADES.map((p) => corDaPrioridade(p, escuro));
    expect(new Set(cores).size).toBe(PRIORIDADES.length);
  });

  it.each(TEMAS)('devolve cor neutra para prioridade desconhecida (tema $nome)', ({ escuro }) => {
    const cor = corDaPrioridade('Urgentíssima', escuro);
    expect(cor).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('não pinta Baixa de verde', () => {
    // Verde neste sistema significa "SLA no prazo". Já foi a cor de "Baixa", e
    // aí a mesma cor dizia duas coisas na mesma tela.
    for (const { escuro } of TEMAS) {
      const baixa = corDaPrioridade('Baixa', escuro).toUpperCase();
      expect(baixa).not.toBe('#10B981');
      expect(baixa).not.toBe('#059669');
    }
  });
});

describe('paleta categórica', () => {
  it.each(TEMAS)('não repete cor dentro do conjunto (tema $nome)', ({ escuro }) => {
    const paleta = paletaCategorica(escuro);
    expect(paleta.length).toBeGreaterThan(0);
    expect(new Set(paleta).size).toBe(paleta.length);
  });

  it('tem o mesmo tamanho nos dois temas', () => {
    // Se um tema tivesse menos cores, a mesma categoria mudaria de posição na
    // paleta ao trocar de tema.
    expect(CATEGORICA_ESCURA.length).toBe(CATEGORICA_CLARA.length);
  });

  it('dá a volta quando há mais séries que cores', () => {
    const paleta = paletaCategorica(false);
    expect(corDaSerie(paleta.length, false)).toBe(corDaSerie(0, false));
    expect(corDaSerie(paleta.length + 2, false)).toBe(corDaSerie(2, false));
  });

  it('escolhe pela posição, não pelo valor', () => {
    // A cor precisa depender só do índice: se seguisse a ordenação, filtrar o
    // gráfico repintaria as barras restantes e a cor deixaria de identificar
    // a categoria.
    expect(corDaSerie(1, false)).toBe(CATEGORICA_CLARA[1]);
    expect(corDaSerie(1, true)).toBe(CATEGORICA_ESCURA[1]);
  });
});

describe('estiloDoGrafico', () => {
  it('muda de valores entre os temas', () => {
    const claro = estiloDoGrafico(false);
    const escuro = estiloDoGrafico(true);

    expect(claro.grade).not.toBe(escuro.grade);
    expect(claro.texto).not.toBe(escuro.texto);
  });

  /**
   * A dica SAIU deste objeto, e o teste do canto dela saiu junto.
   *
   * Ele existia por um motivo escrito: "este é o único lugar do sistema onde o
   * canto não vem do Tailwind, e portanto o único que fica para trás sem
   * ninguém perceber". O valor já tinha ido de `0px` para `8px` e voltado, três
   * vezes, sempre porque copiava à mão uma decisão que mora noutro lugar.
   *
   * **O motivo deixou de existir.** A dica virou `components/ui/DicaDoGrafico`,
   * que é HTML e usa classe — o canto agora vem do Tailwind como no resto da
   * interface, e `--radius-none` o zera sem ninguém repetir nada.
   *
   * O teste não foi apagado por conveniência: foi apagado porque o defeito que
   * ele guardava passou a ser impossível de escrever. O que guarda a dica agora
   * é a catraca `exigirDicaPropria`, que impede o Recharts de voltar a desenhar
   * a dica padrão.
   */
  it('só copia o que é atributo de SVG — dois campos, não cinco', () => {
    const claro = estiloDoGrafico(false);

    expect(Object.keys(claro).sort()).toEqual(['grade', 'texto']);
  });
});
