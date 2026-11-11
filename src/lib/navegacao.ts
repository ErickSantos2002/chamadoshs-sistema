import type { PropsDeIcone } from '../components/ui/icones';
import { IconeChamado, IconeConfiguracoes, IconePainel, IconeRepetir, IconeTrilha } from '../components/ui/icones';

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
 * ── Por que a Gestão só aparece para quem administra (FE-5, F5-3) ────
 *
 * Até a FE-4 o menu mostrava tudo para todo mundo, e a área fechada explicava
 * por que estava fechada. A decisão F5-3 mudou isso: as três áreas de Gestão
 * — Cadastros, Tarefas Recorrentes e Auditoria — só aparecem para quem pode
 * administrar (`lib/permissoes`: administrador, ou técnico da equipe da TI,
 * com a identidade confirmada pelo `/auth/me`). Um link que só leva a uma
 * tela de bloqueio é um link que não serve a quem o vê.
 *
 * A decisão continua fora do menu: ele recebe um booleano e não compara
 * perfil nenhum. Quem decide é a regra única de `lib/permissoes`, a mesma do
 * `ProtectedRoute` — e a URL digitada à mão cai na mesma guarda.
 *
 * Nada disso é proteção. Quem protege é a API, e ela protege.
 *
 * O ícone vai como COMPONENTE, não como elemento pronto: cada menu aplica as
 * próprias classes de tamanho e opacidade, e um elemento já construído aqui
 * obrigaria os dois a concordarem também sobre isso.
 */
/**
 * O grupo em que a área aparece no menu.
 *
 * É a divisória visual da barra lateral, e coincide com a linha que o
 * `router` traça: `Principal` são as áreas que qualquer perfil abre, `Gestão`
 * são as três que o `ProtectedRoute` restringe a quem pode administrar — e
 * que por isso levam `restrita`. Um terceiro grupo com um item só seria uma
 * divisória sem nada para dividir.
 */
export type GrupoDoMenu = 'Principal' | 'Gestão';

export interface ItemDeMenu {
  label: string;
  to: string;
  Icone: React.FC<PropsDeIcone>;
  grupo: GrupoDoMenu;
  /** Só aparece para quem pode administrar (F5-3). */
  restrita?: boolean;
}

export const ITENS_DO_MENU: ItemDeMenu[] = [
  { label: 'Dashboard', to: '/dashboard', Icone: IconePainel, grupo: 'Principal' },
  { label: 'Chamados', to: '/chamados', Icone: IconeChamado, grupo: 'Principal' },
  { label: 'Cadastros', to: '/cadastros', Icone: IconeConfiguracoes, grupo: 'Gestão', restrita: true },
  { label: 'Tarefas Recorrentes', to: '/tarefas-recorrentes', Icone: IconeRepetir, grupo: 'Gestão', restrita: true },
  { label: 'Auditoria', to: '/auditoria', Icone: IconeTrilha, grupo: 'Gestão', restrita: true },
];

/** A ordem em que os grupos aparecem. */
const ORDEM_DOS_GRUPOS: GrupoDoMenu[] = ['Principal', 'Gestão'];

export interface SecaoDoMenu {
  grupo: GrupoDoMenu;
  itens: ItemDeMenu[];
}

/**
 * A mesma lista, agrupada — o formato que a barra lateral desenha.
 *
 * DERIVADA de `ITENS_DO_MENU`, e não escrita à mão ao lado dela. Uma segunda
 * lista literal seria a segunda verdade que este arquivo inteiro existe para
 * eliminar: acrescentar uma área e esquecer de repetir aqui daria de novo dois
 * menus discordando, que é o defeito que trouxe o técnico para cá.
 *
 * Grupo sem item nenhum não vira seção vazia.
 */
export const GRUPOS_DO_MENU: SecaoDoMenu[] = ORDEM_DOS_GRUPOS.map((grupo) => ({
  grupo,
  itens: ITENS_DO_MENU.filter((item) => item.grupo === grupo),
})).filter((secao) => secao.itens.length > 0);

/**
 * Se o item aparece para quem lê. A decisão de quem administra chega pronta
 * (`usePermissoes`); aqui só se aplica a marca `restrita`.
 */
export function visivelNoMenu(item: ItemDeMenu, podeAdministrar: boolean): boolean {
  return !item.restrita || podeAdministrar === true;
}
