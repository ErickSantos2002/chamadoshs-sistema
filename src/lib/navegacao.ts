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
/**
 * O grupo em que a área aparece no menu.
 *
 * Não é permissão — o menu continua mostrando tudo para todo mundo, pelo
 * motivo escrito acima. É só a divisória visual da barra lateral.
 *
 * A linha entre os dois grupos é a mesma que o `router` já traça: `Principal`
 * são as áreas que qualquer perfil abre, `Gestão` são as três que o
 * `ProtectedRoute` restringe a administrador e técnico. Um terceiro grupo com
 * um item só seria uma divisória sem nada para dividir.
 */
export type GrupoDoMenu = 'Principal' | 'Gestão';

export interface ItemDeMenu {
  label: string;
  to: string;
  Icone: React.FC<PropsDeIcone>;
  grupo: GrupoDoMenu;
}

export const ITENS_DO_MENU: ItemDeMenu[] = [
  { label: 'Dashboard', to: '/dashboard', Icone: IconePainel, grupo: 'Principal' },
  { label: 'Chamados', to: '/chamados', Icone: IconeChamado, grupo: 'Principal' },
  { label: 'Cadastros', to: '/cadastros', Icone: IconeConfiguracoes, grupo: 'Gestão' },
  { label: 'Tarefas Recorrentes', to: '/tarefas-recorrentes', Icone: IconeRepetir, grupo: 'Gestão' },
  { label: 'Auditoria', to: '/auditoria', Icone: IconeTrilha, grupo: 'Gestão' },
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
