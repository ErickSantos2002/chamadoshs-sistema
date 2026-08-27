import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GRUPOS_DO_MENU, ITENS_DO_MENU } from './navegacao';

/**
 * O menu tinha duas listas, e por isso duas verdades.
 *
 * A `Sidebar` (a partir de `lg`) passou a mostrar todas as áreas para todo
 * mundo; o menu de gaveta do `Header` (abaixo de `lg`) ficou com a regra antiga
 * e sem duas das áreas. Um técnico numa janela menor não via Cadastros,
 * Auditoria nem Tarefas Recorrentes — o sistema mostrava menus diferentes para
 * a mesma pessoa conforme a largura da tela.
 *
 * Um teste de renderização diria o que cada componente desenha, e este projeto
 * não tem biblioteca para isso. O que dá para travar sem ela é a causa: que
 * exista uma lista só, e que nenhum menu volte a decidir por perfil.
 *
 * ── Por que agora há um arquivo só nesta lista ────────────────────────
 *
 * Eram dois — a `Sidebar`, a partir de `lg`, e a gaveta dentro do `Header`.
 * Na migração para a casca do HelpHS os dois viraram um: a mesma barra que
 * fica na lateral no desktop desliza para dentro como gaveta no celular. O
 * defeito que este arquivo persegue passou a ser impossível por construção,
 * e o teste continua aqui para o caso de alguém reintroduzir um segundo menu.
 */

const SRC = join(__dirname, '..');
const MENUS = ['components/layout/Sidebar.tsx'];

const ler = (caminho: string) => readFileSync(join(SRC, caminho), 'utf-8');

/**
 * Tira comentários antes de procurar código.
 *
 * Sem isto, o teste acusava o Header por causa do comentário que EXPLICA a
 * regra removida — a prosa que documenta o conserto derrubaria o teste que o
 * protege, e a saída fácil seria apagar a explicação.
 */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('itens do menu', () => {
  it('cobre as cinco áreas do sistema', () => {
    expect(ITENS_DO_MENU.map((i) => i.to)).toEqual([
      '/dashboard',
      '/chamados',
      '/cadastros',
      '/tarefas-recorrentes',
      '/auditoria',
    ]);
  });

  it('todo item tem rótulo e ícone', () => {
    for (const item of ITENS_DO_MENU) {
      expect(item.label.trim()).not.toBe('');
      // Os ícones do projeto são componentes de função. Quando vinham do
      // lucide eram `forwardRef`, e isto precisava se contentar com `toBeTruthy`.
      expect(item.Icone).toBeTypeOf('function');
    }
  });

  // Item de menu que aponta para rota inexistente leva a pessoa ao "não
  // encontrado" — pior que não ter o item, porque parece defeito do sistema.
  it('todo destino existe como rota', () => {
    const router = ler('router.tsx');
    const rotas = [...router.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

    for (const item of ITENS_DO_MENU) {
      expect(rotas, `${item.to} não é rota`).toContain(item.to);
    }
  });

  /**
   * A forma agrupada não pode virar uma segunda lista escrita à mão.
   *
   * É exatamente assim que a divergência anterior nasceu: uma cópia da
   * decisão, num arquivo que ninguém lembra de abrir quando acrescenta uma
   * área. Aqui a checagem é de conteúdo — se `GRUPOS_DO_MENU` deixar de
   * conter os mesmos destinos, na mesma ordem, alguém rompeu a derivação.
   */
  it('os grupos são a mesma lista, agrupada', () => {
    const nosGrupos = GRUPOS_DO_MENU.flatMap((s) => s.itens.map((i) => i.to));

    expect([...nosGrupos].sort()).toEqual(
      [...ITENS_DO_MENU.map((i) => i.to)].sort()
    );

    // Dentro de cada grupo, a ordem é a da lista original.
    for (const secao of GRUPOS_DO_MENU) {
      expect(secao.itens).toEqual(
        ITENS_DO_MENU.filter((i) => i.grupo === secao.grupo)
      );
    }

    // Grupo vazio viraria um título sozinho na tela.
    for (const secao of GRUPOS_DO_MENU) {
      expect(secao.itens.length, `grupo ${secao.grupo} vazio`).toBeGreaterThan(0);
    }
  });

  it('o menu lê a lista do sistema', () => {
    for (const arquivo of MENUS) {
      // O que se exige é o USO — `.map(` sobre a lista — e não a menção. Um
      // `toContain` do nome se satisfazia com o import, que sobra intacto
      // quando alguém volta a montar a lista à mão; e com comentários no meio,
      // até uma citação em prosa bastava. Sem comentários e com o `.map`, só o
      // menu de verdade lendo a lista de verdade passa.
      //
      // `GRUPOS_DO_MENU` vale tanto quanto `ITENS_DO_MENU` porque ele é
      // DERIVADO dela, e o teste acima trava essa derivação.
      expect(
        semComentarios(ler(arquivo)),
        `${arquivo} monta a própria lista`
      ).toMatch(/(ITENS_DO_MENU|GRUPOS_DO_MENU)\s*\.map\(/);
    }
  });

  /**
   * Quem protege é a API. O menu esconder uma área não impede ninguém de
   * chamar a rota — só impede a pessoa de descobrir que a área existe, e
   * portanto de pedir acesso a ela.
   */
  it('nenhum menu decide o que mostrar pelo perfil', () => {
    for (const arquivo of MENUS) {
      const codigo = semComentarios(ler(arquivo));

      // O Topbar exibe o perfil ao lado do nome, e isso pode ficar — ele não
      // está nesta lista. O que não pode voltar é COMPARAR o perfil para
      // montar a navegação.
      //
      // Duas guardas, porque a comparação tem mais de uma forma. `[!=]=` cobre
      // `===`, `!==` e as versões frouxas. E qualquer gate por perfil precisa
      // citar um nome de perfil — `.includes(user.role)` sobre uma lista, por
      // exemplo — então o literal em si também é proibido aqui. A versão
      // anterior só via `===`, e um gate reescrito de outro jeito passava.
      expect(codigo, `${arquivo} compara perfil`).not.toMatch(/role\s*[!=]=/);
      expect(codigo, `${arquivo} cita um perfil`).not.toMatch(
        /['"](Administrador|Tecnico|Usuario)['"]/
      );
    }
  });
});
