import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '../../context/ThemeContext';
import { Avatar } from './Avatar';
import { Aviso, type VarianteAviso } from './Aviso';
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

  /**
   * O avatar é redondo; o selo NÃO é.
   *
   * Este caso já travou os dois juntos, e estava errado no selo desde a
   * decisão D2-a: a §8.1 lista badge e chip entre o que é reto no ChamadosHS.
   * O avatar continua `rounded-full` porque é círculo de verdade — a mesma
   * exceção do ponto de status e do anel do spinner.
   */
  it('o avatar é redondo', () => {
    expect(comTema(<Avatar nome="Rickelme David" />)).toContain('rounded-full');
  });

  it('o selo é reto, como o resto do sistema', () => {
    expect(comTema(<Badge>Aberto</Badge>)).not.toContain('rounded-full');
  });

  /**
   * A cor do avatar sai de TOKEN, e não de hexadecimal.
   *
   * Este é o caso que impede a volta do defeito: até 03/09/2026 a cor vinha da
   * paleta categórica de `lib/graficos.ts`, que é hexadecimal cravado e é
   * certificada só para FORMA (piso 3:1). Usada para texto, dava 14
   * reprovações de AA em 20 combinações reais.
   *
   * Se alguém voltar a pintar avatar com cor de gráfico, o `#` aparece no
   * style e este caso fica vermelho.
   */
  it('o avatar pinta com token, nunca com hexadecimal', () => {
    const html = comTema(<Avatar nome="Rickelme David" />);
    expect(html).toContain('var(--color-');
    expect(html).not.toMatch(/background-color:s*#/);
    expect(html).not.toMatch(/color:s*#/);
  });

  /** Mesma pessoa, mesma cor — é o que o avatar existe para permitir. */
  it('a cor do avatar é estável para o mesmo nome', () => {
    const a = comTema(<Avatar nome="Rickelme David" />);
    const b = comTema(<Avatar nome="Rickelme David" />);
    expect(a).toBe(b);
  });

  /**
   * Sem nome, o par neutro — e não o par 0.
   *
   * A derivação do pacote manda nome vazio para `COLORS[0]`, que é azul.
   * "Sem responsável" não é uma pessoa, e já era cinza antes da migração; a
   * §30 não deixa trocar isso por motivo visual.
   */
  it('sem nome, o avatar é neutro e não azul', () => {
    const html = comTema(<Avatar nome={null} />);
    expect(html).toContain('var(--surface-elevated)');
    // `--text-muted` e nao `--on-tint-neutral`: depois da E5 os dois resolvem
    // para o mesmo valor, e o pacote voltou a escrever o primeiro. O que este
    // caso trava e o par NEUTRO, nao a expressao — mas travar a expressao e o
    // que faz a divergencia com o pacote aparecer no teste, e nao no olho.
    expect(html).toContain('var(--text-muted)');
    expect(html).not.toContain('var(--color-primary-100)');
  });

  /**
   * O fundo do selo é o alias de tinta do pacote, SEM modificador de
   * opacidade — regra (a) do D8-a. Com modificador o alfa seria multiplicado
   * (0,15 × 0,20 = 0,03) e o selo sairia quase sem fundo; `validar:paleta`
   * derruba o build se alguém escrever isso.
   */
  it('o selo usa a tinta do pacote, sem modificador', () => {
    const html = comTema(<Badge variante="perigo">Cancelado</Badge>);
    expect(html).toContain('bg-tint-danger');
    expect(html).not.toContain('bg-tint-danger/');
    expect(html).not.toContain('bg-perigo/20');
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

describe('aviso', () => {
  /**
   * Assertivo INTERROMPE o leitor de tela; educado espera a pausa.
   *
   * O `role="alert"` estava escrito no JSX e valia para as quatro variantes,
   * inclusive para a `info`, que e o PADRAO. "Salvo com sucesso" cortando a
   * frase que a pessoa estava ouvindo e atropelo, nao urgencia.
   *
   * SO `perigo` interrompe, por decisao do operador gravada na E12 do pacote.
   * Eu tinha posto `alerta` em `alert` tambem; o criterio dele e mais estreito
   * e melhor -- aviso de atencao quase nunca precisa cortar a fala, e quando
   * precisa a tela usa `perigo`. Com duas variantes assertivas, a distincao
   * entre elas deixaria de significar algo no canal nao visual.
   *
   * Hoje as doze chamadas do sistema sao todas `perigo`, entao a troca nao
   * muda uma linha do que se ouve. Este caso existe pela PROXIMA: o primeiro
   * `<Aviso variante="info">` que alguem escrever ja nasce certo.
   *
   * Achado pela sessao do HelpHS, no `Alert.jsx` do pacote.
   */
  const PAPEL: Record<VarianteAviso, string> = {
    info: 'status',
    sucesso: 'status',
    alerta: 'status',
    perigo: 'alert',
  };

  it('so o perigo interrompe', () => {
    for (const [variante, papel] of Object.entries(PAPEL)) {
      const html = comTema(
        <Aviso variante={variante as VarianteAviso}>x</Aviso>
      );
      expect(html).toContain(`role="${papel}"`);
    }
  });

  it('o padrao e educado, e nao assertivo', () => {
    // `<Aviso>` sem variante cai em `info`. Era o pior caso: o uso mais
    // descuidado produzia a interrupcao mais gratuita.
    expect(comTema(<Aviso>x</Aviso>)).toContain('role="status"');
  });
});
