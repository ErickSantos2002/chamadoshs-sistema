import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ITENS_DO_MENU } from './navegacao';

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
 * exista uma lista só, e que nenhum dos dois menus volte a decidir por perfil.
 */

const SRC = join(__dirname, '..');
const MENUS = ['components/Sidebar.tsx', 'components/Header.tsx'];

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
      // Ícone do lucide é `forwardRef`, então é objeto, não função.
      expect(item.Icone).toBeTruthy();
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

  it('os dois menus leem a mesma lista', () => {
    for (const arquivo of MENUS) {
      expect(ler(arquivo), `${arquivo} monta a própria lista`).toContain(
        'ITENS_DO_MENU'
      );
    }
  });

  /**
   * Quem protege é a API. O menu esconder uma área não impede ninguém de
   * chamar a rota — só impede a pessoa de descobrir que a área existe, e
   * portanto de pedir acesso a ela.
   */
  it('nenhum menu decide o que mostrar pelo perfil', () => {
    for (const arquivo of MENUS) {
      // O Header exibe o perfil ao lado do nome, e isso pode ficar. O que não
      // pode voltar é COMPARAR o perfil para montar a navegação.
      expect(semComentarios(ler(arquivo)), `${arquivo} compara perfil`).not.toMatch(
        /role\s*[!=]==/
      );
    }
  });
});
