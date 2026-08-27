import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '../../context/ThemeContext';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Modal } from './Modal';
import { Seletor } from './Seletor';
import { Textarea } from './Textarea';

/**
 * As medidas do kit, contra o HelpHS.
 *
 * ── Por que em teste, e não só no olho ────────────────────────────────
 *
 * "Parecer do mesmo sistema" é feito de números: 8px de canto no botão e no
 * campo, 12px no card e no modal, anel de foco de 2px. Nenhum deles quebra
 * nada quando muda — a tela continua funcionando, só deixa de pertencer à
 * mesma família. É o tipo de regressão que só aparece com os dois sistemas
 * abertos lado a lado, no dia em que alguém pensar em olhar.
 *
 * O projeto não tem biblioteca de renderização; tem `renderToStaticMarkup`,
 * que basta para o que se quer travar aqui: a FORMA. Nada neste arquivo testa
 * comportamento — para isso existem `modais.test.ts`, `Seletor.test.tsx` e
 * `Campo.test.tsx`.
 *
 * ── O que este arquivo NÃO trava ──────────────────────────────────────
 *
 * Cor. Cor é medida por `npm run validar:paleta`, que lê os tokens de onde
 * eles moram e refaz a conta de contraste. Repetir hexadecimal aqui criaria a
 * segunda cópia da paleta que aquele script existe para não ter.
 */

const comTema = (elemento: React.ReactElement) =>
  renderToStaticMarkup(<ThemeProvider>{elemento}</ThemeProvider>);

describe('cantos', () => {
  /**
   * A escala de `borderRadius` já foi zerada neste projeto, e voltou ao padrão
   * para acompanhar o HelpHS. Se alguém zerar de novo, tudo aqui cai junto —
   * que é o ponto: a mudança seria em um arquivo e o efeito, em 25.
   */
  it('botão, campo e seletor têm o canto de 8px do HelpHS', () => {
    expect(comTema(<Button>Salvar</Button>)).toContain('rounded-lg');
    expect(comTema(<Input />)).toContain('rounded-lg');
    expect(comTema(<Textarea />)).toContain('rounded-lg');
    expect(
      comTema(
        <Seletor
          rotulo="Status"
          valor=""
          aoMudar={() => {}}
          opcoes={[{ valor: '', rotulo: 'Todos' }]}
        />
      )
    ).toContain('rounded-lg');
  });

  it('card e modal têm o canto de 12px do HelpHS', () => {
    expect(comTema(<Card>conteúdo</Card>)).toContain('rounded-xl');
    expect(
      comTema(
        <Modal aberto aoFechar={() => {}} titulo="Nova categoria">
          corpo
        </Modal>
      )
    ).toContain('rounded-xl');
  });

  it('selo e avatar são redondos', () => {
    expect(comTema(<Badge>Aberto</Badge>)).toContain('rounded-full');
    expect(comTema(<Avatar nome="Rickelme David" />)).toContain('rounded-full');
  });
});

describe('foco', () => {
  /**
   * Anel de 2px, e a borda somindo por baixo dele.
   *
   * Era 1px com a borda acendendo junto. O anel mais grosso é o que o HelpHS
   * usa, e aqui ele carrega peso extra: o fundo do campo deixou de ser
   * recuado, então quem navega por teclado depende do anel para saber onde
   * está.
   */
  it('o campo acende um anel de 2px, não de 1px', () => {
    const campo = comTema(<Input />);
    expect(campo).toContain('focus:ring-2');
    expect(campo).not.toContain('focus:ring-1');
  });

  it('o botão mostra o anel só para quem navega por teclado', () => {
    const botao = comTema(<Button>Salvar</Button>);
    expect(botao).toContain('focus-visible:ring-2');
    // `focus:` puro faria o anel piscar a cada clique de mouse.
    expect(botao).not.toMatch(/(^|\s)focus:ring/);
  });
});

describe('botão', () => {
  it('os três tamanhos são os do HelpHS', () => {
    expect(comTema(<Button tamanho="sm">x</Button>)).toContain('px-3 py-1.5 text-xs');
    expect(comTema(<Button tamanho="md">x</Button>)).toContain('px-4 py-2 text-sm');
    expect(comTema(<Button tamanho="lg">x</Button>)).toContain('px-6 py-3 text-base');
  });

  /**
   * O primário é preenchimento sólido.
   *
   * Tinha um véu de gradiente branco por cima, que dava relevo de botão
   * físico — vocabulário da fase de console. O HelpHS usa cor chapada.
   */
  it('o primário não tem véu de gradiente', () => {
    expect(comTema(<Button>Salvar</Button>)).not.toContain('bg-gradient');
  });

  /**
   * `carregando` desabilita junto: botão que mostra spinner e continua
   * clicável é como se envia o mesmo formulário duas vezes.
   */
  it('carregando desabilita', () => {
    const html = comTema(<Button carregando>Salvando</Button>);
    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy="true"');
  });
});

describe('cartão', () => {
  /**
   * O divisor do cabeçalho usava `borda-suave`, e no tema escuro esse token
   * tem o MESMO valor de `superficie` — a régua existia no CSS e não na tela.
   */
  it('a régua do cabeçalho usa a borda visível', () => {
    const html = comTema(<Card>x</Card>);
    expect(html).toContain('border-borda');
  });

  /** Card clicável vira `<button>`, para receber foco e responder a Enter. */
  it('card clicável é botão de verdade', () => {
    expect(comTema(<Card onClick={() => {}}>x</Card>)).toContain('<button');
    expect(comTema(<Card>x</Card>)).not.toContain('<button');
  });
});
