import { Chamado, SetorDestinoEnum } from '../types/api';

/**
 * O setor de destino do chamado: para qual equipe ele foi aberto.
 *
 * ── Três origens, e só uma delas vira TI por conta própria ────────────
 *
 * A API anterior ao campo não manda `setor_destino` nenhum, e todo chamado
 * dela é de TI — era a única equipe. Por isso **ausente** é TI.
 *
 * O que NÃO é ausente não ganha o mesmo desconto. Um valor que não é `TI` nem
 * `QUALIDADE` — string vazia, `null`, caixa trocada, um setor que a API passou
 * a conhecer antes do front — fica como **inesperado**, com `setor: null`. O
 * atalho `?? 'TI'` esconderia o defeito duas vezes: o chamado apareceria como
 * TI na tela e entraria no filtro de TI, e quem fosse investigar acharia um
 * chamado "de TI" que a API diz ser de outra coisa.
 *
 * O inesperado aparece em "Todos os setores", com um selo neutro dizendo o que
 * chegou, e não aparece em nenhum filtro de setor. É o único lugar onde ele não
 * mente.
 *
 * ── O valor exato, sem normalizar ────────────────────────────────────
 *
 * `'qualidade'` e `' TI'` são inesperados. Aparar ou subir a caixa seria
 * adivinhar o que a API quis dizer, e o contrato é o valor do enum. Se um dia
 * a API mandar outra grafia, o selo mostra isso na tela em vez de engolir.
 */

export type LeituraDoSetor =
  | { origem: 'ausente'; setor: SetorDestinoEnum.TI }
  | { origem: 'valido'; setor: SetorDestinoEnum }
  | {
      origem: 'inesperado';
      setor: null;
      /**
       * O que chegou, como TEXTO pronto para a tela: sem caractere de
       * controle, com tamanho limitado, e descrito quando nem string era.
       * Quem impede que vire marcação é o React, que escapa filho de texto —
       * daqui ele sai só como texto, e nunca vai para classe ou estilo.
       */
      recebido: string;
    };

/** Teto do texto do valor recebido, contando as reticências. */
export const LIMITE_DO_RECEBIDO = 40;

const ROTULOS: Record<SetorDestinoEnum, string> = {
  [SetorDestinoEnum.TI]: 'TI',
  [SetorDestinoEnum.QUALIDADE]: 'Qualidade',
};

const VALIDOS = new Set<unknown>(Object.values(SetorDestinoEnum));

// Controle C0, DEL e C1. Escrito por código para o arquivo não carregar o
// caractere literal.
const CONTROLE = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]', 'g');

const descrever = (valor: unknown): string => {
  if (valor === null) return '(nulo)';
  if (Array.isArray(valor)) return '(lista)';

  if (typeof valor === 'string') {
    const limpo = valor.replace(CONTROLE, ' ').replace(/\s+/g, ' ').trim();
    if (!limpo) return '(vazio)';
    return limpo.length > LIMITE_DO_RECEBIDO
      ? `${limpo.slice(0, LIMITE_DO_RECEBIDO - 1)}…`
      : limpo;
  }

  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (typeof valor === 'object') return '(objeto)';
  return `(${typeof valor})`;
};

/**
 * Lê o valor de `setor_destino` como ele chegou — `unknown`, porque o tipo do
 * campo é o contrato e não uma garantia sobre a resposta.
 */
export function lerSetor(valor: unknown): LeituraDoSetor {
  if (valor === undefined) return { origem: 'ausente', setor: SetorDestinoEnum.TI };
  if (VALIDOS.has(valor)) return { origem: 'valido', setor: valor as SetorDestinoEnum };
  return { origem: 'inesperado', setor: null, recebido: descrever(valor) };
}

export const setorDoChamado = (chamado: Pick<Chamado, 'setor_destino'>): LeituraDoSetor =>
  lerSetor(chamado.setor_destino);

export const rotuloDoSetor = (setor: SetorDestinoEnum): string => ROTULOS[setor];

/** O valor do filtro do quadro. `''` é "todos os setores". */
export type FiltroDeSetor = '' | SetorDestinoEnum;

export const OPCOES_DE_SETOR: Array<{ valor: FiltroDeSetor; rotulo: string }> = [
  { valor: '', rotulo: 'Todos os setores' },
  ...Object.values(SetorDestinoEnum).map((setor) => ({
    valor: setor,
    rotulo: ROTULOS[setor],
  })),
];

/**
 * O chamado passa no filtro de setor?
 *
 * `''` deixa tudo passar, inclusive o inesperado: o filtro desligado não pode
 * esconder chamado. Ligado, o inesperado nunca casa — `setor` dele é `null`.
 */
export function casaComFiltroDeSetor(
  chamado: Pick<Chamado, 'setor_destino'>,
  filtro: FiltroDeSetor
): boolean {
  if (filtro === '') return true;
  return setorDoChamado(chamado).setor === filtro;
}

/**
 * Há chamados de mais de um setor RECONHECIDO na lista?
 *
 * É a pergunta que decide se o seletor de setor aparece: com tudo em TI ele
 * seria uma escolha de uma opção só. O inesperado não conta — o seletor não
 * tem opção para ele, então ele não cria escolha nenhuma.
 */
export function temSetoresMisturados(chamados: Array<Pick<Chamado, 'setor_destino'>>): boolean {
  let primeiro: SetorDestinoEnum | null = null;

  for (const chamado of chamados) {
    const { setor } = setorDoChamado(chamado);
    if (setor === null) continue;
    if (primeiro === null) primeiro = setor;
    else if (setor !== primeiro) return true;
  }

  return false;
}

const jaAvisados = new Set<string>();

/**
 * Avisa no console, UMA vez por chamado e valor, que chegou setor inesperado.
 *
 * A mensagem leva só o id do chamado e o texto já tratado do valor — nada de
 * título, descrição ou solicitante, que é onde mora dado pessoal. E não se
 * repete a cada renderização: o quadro redesenha os cartões a cada tecla da
 * busca, e um aviso por desenho afogaria o console no primeiro minuto.
 *
 * Fica fora de `lerSetor` de propósito: aquela é pura e roda dentro de filtro;
 * esta tem efeito e é chamada de um `useEffect`, por quem mostra o selo.
 */
export function avisarSetorInesperado(chamado: Pick<Chamado, 'id' | 'setor_destino'>): void {
  const leitura = setorDoChamado(chamado);
  if (leitura.origem !== 'inesperado') return;

  const chave = `${chamado.id}|${leitura.recebido}`;
  if (jaAvisados.has(chave)) return;
  jaAvisados.add(chave);

  console.warn(
    `[setor] chamado ${chamado.id}: setor_destino inesperado (${leitura.recebido}). ` +
      'Mostrado só em "Todos os setores".'
  );
}

/** Só para os testes: esquece quem já foi avisado. */
export const _esquecerAvisos = (): void => jaAvisados.clear();
