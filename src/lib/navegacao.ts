import { LayoutDashboard, Repeat, ScrollText, Settings, Ticket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * As áreas do sistema, numa lista só.
 *
 * ── Por que uma lista só ──────────────────────────────────────────────
 *
 * Havia duas: a da `Sidebar`, que aparece a partir de `lg`, e a do `Header`,
 * que é o menu de gaveta abaixo disso. Quando o menu passou a mostrar tudo para
 * todo mundo, só a primeira mudou. A segunda ficou com a regra antiga —
 * `user.role === 'Administrador'` — e sem Auditoria e Tarefas Recorrentes, que
 * nunca chegaram a ser adicionadas ali.
 *
 * O efeito era que a mesma pessoa via menus diferentes conforme a largura da
 * janela, e um técnico numa tela menor não encontrava nada além de Dashboard e
 * Chamados. Duas cópias de uma decisão significam que a decisão vale até alguém
 * mexer em uma delas.
 *
 * ── Por que sem condição de perfil ────────────────────────────────────
 *
 * O menu mostra TUDO, inclusive o que o perfil de quem lê não alcança.
 *
 * Esconder parecia gentil e escondia demais: quem não vê Cadastros não sabe que
 * Cadastros existe, e não pede acesso ao que não sabe que há. Mostrando, o
 * sistema revela a própria forma, e quem esbarra numa área encontra explicação
 * — qual é, de quem é, e a quem pedir.
 *
 * Nada disso é proteção. Quem protege é a API, e ela protege.
 *
 * O ícone vai como COMPONENTE, não como elemento pronto: cada menu aplica as
 * próprias classes de tamanho e opacidade, e um elemento já construído aqui
 * obrigaria os dois a concordarem também sobre isso.
 */
export interface ItemDeMenu {
  label: string;
  to: string;
  Icone: LucideIcon;
}

export const ITENS_DO_MENU: ItemDeMenu[] = [
  { label: 'Dashboard', to: '/dashboard', Icone: LayoutDashboard },
  { label: 'Chamados', to: '/chamados', Icone: Ticket },
  { label: 'Cadastros', to: '/cadastros', Icone: Settings },
  { label: 'Tarefas Recorrentes', to: '/tarefas-recorrentes', Icone: Repeat },
  { label: 'Auditoria', to: '/auditoria', Icone: ScrollText },
];
