import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { usePermissoes } from './usePermissoes';
import { chamadosService } from '../services/chamadoshsapi';
import {
  MENSAGENS_DA_LISTA,
  MotivoDaFalhaDaLista,
  ResponsavelTI,
  motivoDaFalhaDaLista,
} from '../lib/responsaveis';

export type EstadoDaListaDeResponsaveis = 'ociosa' | 'carregando' | 'pronta' | 'falhou';

export interface ListaDeResponsaveisTI {
  estado: EstadoDaListaDeResponsaveis;
  /** Vazia em todo estado que não seja `pronta`. */
  responsaveis: ResponsavelTI[];
  motivo: MotivoDaFalhaDaLista | null;
  /** O que dizer no lugar da lista que não veio. Nunca um toast. */
  mensagem: string | null;
  /** Pede de novo. Uma resposta mais antiga nunca sobrescreve esta. */
  recarregar: () => Promise<void>;
}

const OCIOSA: Omit<ListaDeResponsaveisTI, 'recarregar'> = {
  estado: 'ociosa',
  responsaveis: [],
  motivo: null,
  mensagem: null,
};

/**
 * A lista de responsáveis da TI para UMA abertura de seletor.
 *
 * `ativo` é "este seletor aparece agora" — chamado da TI, em edição ou no
 * modal. A lista só é pedida com ele E com `podeAdministrar`: técnico da
 * Qualidade, de outro setor, sem setor e usuário comum nunca chegam a pedir
 * — receberiam 403, e o toast do interceptor junto.
 *
 * `chave` é a ABERTURA — o número de vezes que o modal abriu um chamado, ou
 * que a página entrou na edição. Uma chave, um pedido: o seletor que some e
 * volta na mesma abertura (o modal relê o chamado e ele pisca) não pede de
 * novo. Abertura nova pede: quem é elegível muda (setor, perfil, conta
 * desativada) e a API não guarda cache. Sem fallback nenhum — ver
 * `lib/responsaveis`.
 *
 * ── Respostas atrasadas ───────────────────────────────────────────────
 *
 * Cada pedido tem um número, e só o mais recente escreve. A sessão entra na
 * chave: a lista pedida pela conta anterior, chegando depois do login de
 * outra, é descartada — assim como a da abertura anterior.
 */
export function useResponsaveisTI(ativo: boolean, chave: unknown): ListaDeResponsaveisTI {
  const { user } = useAuth();
  const { podeAdministrar } = usePermissoes();
  const pode = ativo && podeAdministrar;
  const abertura = `${user?.id ?? '-'}|${String(chave)}`;

  const pedido = useRef(0);
  const ultimaAbertura = useRef<string | null>(null);
  const [lista, setLista] = useState<Omit<ListaDeResponsaveisTI, 'recarregar'>>(OCIOSA);

  const buscar = useCallback(async () => {
    const meu = ++pedido.current;
    // Enquanto pede, nada para escolher: a lista anterior pode ser a velha.
    setLista({ estado: 'carregando', responsaveis: [], motivo: null, mensagem: null });
    try {
      const responsaveis = await chamadosService.listarResponsaveisTI();
      if (meu !== pedido.current) return;
      setLista({ estado: 'pronta', responsaveis, motivo: null, mensagem: null });
    } catch (erro) {
      if (meu !== pedido.current) return;
      const motivo = motivoDaFalhaDaLista(erro);
      setLista({
        estado: 'falhou',
        responsaveis: [],
        motivo,
        mensagem: motivo === 'sessao' ? null : MENSAGENS_DA_LISTA[motivo],
      });
    }
  }, []);

  useEffect(() => {
    if (!pode) return;
    if (ultimaAbertura.current === abertura) return;
    ultimaAbertura.current = abertura;
    void buscar();
  }, [pode, abertura, buscar]);

  // Desmontar invalida o pedido em voo.
  useEffect(
    () => () => {
      pedido.current += 1;
    },
    []
  );

  const recarregar = useCallback(async () => {
    if (!pode) return;
    await buscar();
  }, [pode, buscar]);

  // Sem permissão (ou fora do seletor), nada a mostrar — e o que chegar de
  // um pedido anterior fica guardado sem aparecer.
  if (!pode) return { ...OCIOSA, recarregar };
  // A lista que está no estado é de outra abertura: até o pedido desta sair
  // (no efeito, depois deste desenho), ela não aparece.
  if (ultimaAbertura.current !== abertura) {
    return { estado: 'carregando', responsaveis: [], motivo: null, mensagem: null, recarregar };
  }
  return { ...lista, recarregar };
}
