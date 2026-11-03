import { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  EstadoDoSuporte,
  ehAtribuidoNaQualidade,
  sondarSuporte,
  unirChamados,
} from '../lib/atendimento';
import { DisponibilidadeQualidade, consultarQualidade } from '../lib/qualidade';
import { maisRecente } from '../lib/versao';
import {
  chamadosService,
  comentariosService,
  historicoService,
  categoriasService,
  usuariosService,
} from '../services/chamadoshsapi';
import {
  AtendenteQualidade,
  Chamado,
  Comentario,
  Historico,
  Categoria,
  Usuario,
  ChamadoCreate,
  ChamadoCreateQualidade,
  ChamadoUpdate,
  ComentarioCreate,
  SetorDestinoEnum,
} from '../types/api';

/**
 * O que a tela precisa saber da Qualidade para atender: se a API tem a rota
 * de atendimento (`lib/atendimento`) e quem a atende (`lib/qualidade`).
 */
export interface EstadoDaQualidade {
  suporte: EstadoDoSuporte;
  disponibilidade: DisponibilidadeQualidade;
  atendentes: AtendenteQualidade[];
}

const QUALIDADE_INICIAL: EstadoDaQualidade = {
  suporte: 'verificando',
  disponibilidade: 'verificando',
  atendentes: [],
};

type ChamadosContextType = {
  // Estado
  chamados: Chamado[];
  categorias: Categoria[];
  usuarios: Usuario[];
  loading: boolean;
  error: string | null;

  // Funções de chamados
  carregarChamados: () => Promise<void>;
  buscarChamado: (id: number) => Promise<Chamado | null>;
  criarChamado: (dados: ChamadoCreate | ChamadoCreateQualidade) => Promise<Chamado>;
  atualizarChamado: (id: number, dados: ChamadoUpdate) => Promise<Chamado>;
  deletarChamado: (id: number) => Promise<void>;
  /** Funde na lista um chamado que outro caminho já salvou. Não faz requisição. */
  aplicarChamado: (chamado: Chamado) => void;
  /**
   * Tira da lista um chamado que a pessoa deixou de poder ver (FE-5). Só ele:
   * não recarrega o quadro. Uma listagem ou busca que já estava em voo não o
   * traz de volta.
   */
  removerChamado: (id: number) => void;

  // Funções de comentários
  carregarComentarios: (chamadoId: number) => Promise<Comentario[]>;
  criarComentario: (dados: ComentarioCreate) => Promise<Comentario>;

  // Funções de histórico
  carregarHistorico: (chamadoId: number) => Promise<Historico[]>;

  // Funções auxiliares
  carregarCategorias: () => Promise<void>;
  carregarUsuarios: () => Promise<void>;
  limparErro: () => void;

  // Qualidade — ver `useQualidade`, que é quem pede a verificação
  qualidade: EstadoDaQualidade;
  verificarQualidade: () => Promise<void>;
  /** A rota de atendimento respondeu como API sem ela: esconde as ações. */
  marcarAtendimentoIndisponivel: () => void;
  /** A API disse 503: a Qualidade foi desligada neste ambiente. */
  marcarQualidadeIndisponivel: () => void;
};

export const ChamadosContext = createContext<ChamadosContextType>({} as ChamadosContextType);

export const ChamadosProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache para evitar requisições duplicadas
  const [chamadosCarregados, setChamadosCarregados] = useState(false);
  const [categoriasCarregadas, setCategoriasCarregadas] = useState(false);
  const [usuariosCarregados, setUsuariosCarregados] = useState(false);

  // Os chamados que saíram da lista por perda de acesso, com a marca de
  // QUANDO saíram. Uma listagem (ou busca) guarda a marca do seu início: o
  // que foi removido depois dela começar é descartado da resposta — ela foi
  // montada pela API antes da perda e traria o card de volta. A que começar
  // depois da remoção é a verdade de agora, e vale.
  const removidos = useRef(new Map<number, number>());
  const marcaDeRemocao = useRef(0);
  const removidoDesde = (id: number, inicio: number) => (removidos.current.get(id) ?? 0) > inicio;

  useEffect(() => {
    removidos.current.clear();
  }, [user?.id]);

  // Carregar chamados baseado na role do usuário
  const carregarChamados = useCallback(async () => {
    if (!user) return;
    const inicio = marcaDeRemocao.current;

    try {
      setLoading(true);
      setError(null);

      // Arquivados e cancelados vêm junto, e o quadro decide o que mostrar.
      // Sem estes parâmetros a API os omite, e o chamado some da tela: nenhum
      // filtro no front traz de volta o que não chegou.
      //
      // São as duas marcas que não mexem no status — um chamado cancelado
      // continua "Aberto" no banco — e os dois recortes que a API aplica em
      // silêncio. Juntos, faziam um chamado sumir sem deixar rastro na tela.
      const params: any = { incluir_arquivados: true, incluir_cancelados: true };

      let data: Chamado[];

      // Usuários comuns veem os que abriram e os da Qualidade que atendem.
      // A segunda listagem é conferida aqui, chamado a chamado: a API anterior
      // à API-1 ignora `setor_destino` e devolveria também os da TI. Se ela
      // falhar, o quadro fica com os próprios — que é o quadro de antes.
      if (user.role === 'Usuario') {
        const [proprios, atribuidos] = await Promise.all([
          chamadosService.listarTodos({ ...params, solicitante_id: user.id }),
          chamadosService
            .listarTodos({
              ...params,
              tecnico_id: user.id,
              setor_destino: SetorDestinoEnum.QUALIDADE,
            })
            .catch((err) => {
              console.warn('[atendimento] não deu para listar os chamados atribuídos:', err?.response?.status ?? 'sem resposta');
              return [] as Chamado[];
            }),
        ]);
        data = unirChamados(
          proprios,
          atribuidos.filter((c) => ehAtribuidoNaQualidade(c, user.id))
        );
      } else {
        // Técnicos e Admins veem todos os chamados (sem filtro)
        data = await chamadosService.listarTodos(params);
      }

      setChamados(data.filter((c) => !removidoDesde(c.id, inicio)));
      setChamadosCarregados(true);
    } catch (err: any) {
      console.error('Erro ao carregar chamados:', err);
      setError('Erro ao carregar chamados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Buscar um chamado específico (verifica cache primeiro)
  const buscarChamado = useCallback(
    async (id: number): Promise<Chamado | null> => {
      try {
        // Verifica no cache primeiro
        const chamadoCache = chamados.find((c) => c.id === id);
        if (chamadoCache) {
          return chamadoCache;
        }

        // Se não estiver no cache, busca na API
        const inicio = marcaDeRemocao.current;
        setLoading(true);
        setError(null);
        const data = await chamadosService.buscar(id);

        // Saiu por perda de acesso enquanto esta busca andava: a resposta é
        // de antes, e não volta nem para a lista nem para quem pediu.
        if (removidoDesde(id, inicio)) return null;

        // Atualiza o cache
        setChamados((prev) => {
          const existe = prev.find((c) => c.id === id);
          if (existe) {
            return prev.map((c) => (c.id === id ? data : c));
          }
          return [...prev, data];
        });

        return data;
      } catch (err: any) {
        console.error('Erro ao buscar chamado:', err);
        setError('Erro ao buscar chamado.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [chamados]
  );

  // Criar novo chamado
  const criarChamado = useCallback(async (dados: ChamadoCreate | ChamadoCreateQualidade): Promise<Chamado> => {
    try {
      setLoading(true);
      setError(null);

      const novoChamado = await chamadosService.criar(dados);

      // Adiciona ao cache
      setChamados((prev) => [novoChamado, ...prev]);

      return novoChamado;
    } catch (err: any) {
      console.error('Erro ao criar chamado:', err);
      setError(err.response?.data?.detail || 'Erro ao criar chamado.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Funde na lista um chamado que já foi salvo por outro caminho.
   *
   * Existe porque a janela do chamado salva direto pelo serviço — usar o
   * `atualizarChamado` daqui ligaria o `loading` global, e a página de
   * Chamados apaga o quadro inteiro atrás de um spinner quando ele acende.
   * Sem esta fusão, o quadro e a janela viravam duas verdades: a pessoa
   * resolvia o chamado na janela e o card ficava parado na coluna antiga até
   * alguém recarregar a página.
   *
   * Só mexe em quem já está na lista. Chamado que não está nela não é deste
   * quadro (filtro por perfil), e inserir aqui furaria esse filtro.
   *
   * Uma resposta atrasada, de versão menor que a já na lista, não a desfaz
   * (`maisRecente`): a versão do card é a que a próxima escrita vai mandar.
   */
  const aplicarChamado = useCallback((chamado: Chamado) => {
    setChamados((prev) => prev.map((c) => (c.id === chamado.id ? maisRecente(c, chamado) : c)));
  }, []);

  const removerChamado = useCallback((id: number) => {
    marcaDeRemocao.current += 1;
    removidos.current.set(id, marcaDeRemocao.current);
    setChamados((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Atualizar chamado
  const atualizarChamado = useCallback(
    async (id: number, dados: ChamadoUpdate): Promise<Chamado> => {
      try {
        setLoading(true);
        setError(null);

        const chamadoAtualizado = await chamadosService.atualizar(id, dados);

        // Atualiza o cache
        setChamados((prev) =>
          prev.map((c) => (c.id === id ? maisRecente(c, chamadoAtualizado) : c))
        );

        return chamadoAtualizado;
      } catch (err: any) {
        console.error('Erro ao atualizar chamado:', err);
        // A API explica a recusa no `detail` — por exemplo ao tentar atribuir
        // o chamado a uma conta de serviço. Engolir isso numa mensagem
        // genérica deixaria o usuário sem saber o que corrigir.
        setError(err.response?.data?.detail || 'Erro ao atualizar chamado.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Deletar chamado
  const deletarChamado = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await chamadosService.deletar(id);

      // Remove do cache
      setChamados((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error('Erro ao deletar chamado:', err);
      setError('Erro ao deletar chamado.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar comentários de um chamado
  const carregarComentarios = useCallback(async (chamadoId: number): Promise<Comentario[]> => {
    try {
      const data = await comentariosService.listarPorChamado(chamadoId);
      return data;
    } catch (err: any) {
      console.error('Erro ao carregar comentários:', err);
      throw err;
    }
  }, []);

  // Criar comentário
  const criarComentario = useCallback(async (dados: ComentarioCreate): Promise<Comentario> => {
    try {
      const novoComentario = await comentariosService.criar(dados);
      return novoComentario;
    } catch (err: any) {
      console.error('Erro ao criar comentário:', err);
      throw err;
    }
  }, []);

  // Carregar histórico de um chamado
  const carregarHistorico = useCallback(async (chamadoId: number): Promise<Historico[]> => {
    try {
      const data = await historicoService.listarPorChamado(chamadoId);
      return data;
    } catch (err: any) {
      console.error('Erro ao carregar histórico:', err);
      throw err;
    }
  }, []);

  // Carregar categorias
  const carregarCategorias = useCallback(async () => {
    if (categoriasCarregadas) return;

    try {
      const data = await categoriasService.listar(true); // Apenas ativas
      setCategorias(data);
      setCategoriasCarregadas(true);
    } catch (err: any) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, [categoriasCarregadas]);

  // A lista de técnicos que morava aqui — `GET /usuarios/` dos ativos,
  // filtrada por perfil — saiu na FE-5. Ela alimentava o seletor de
  // responsável da TI e oferecia quem a API recusa; a fonte agora é
  // `GET /chamados/responsaveis-ti`, pedida a cada abertura do seletor por
  // `useResponsaveisTI`, e só por quem pode reatribuir.

  // Carregar usuários (todos os usuários ativos)
  const carregarUsuarios = useCallback(async () => {
    if (usuariosCarregados) return;

    try {
      const data = await usuariosService.listar({ ativo: true }); // Todos os usuários ativos
      setUsuarios(data);
      setUsuariosCarregados(true);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    }
  }, [usuariosCarregados]);

  // Limpar erro
  const limparErro = useCallback(() => {
    setError(null);
  }, []);

  // Carregar dados iniciais quando o usuário estiver autenticado
  useEffect(() => {
    if (user && !chamadosCarregados) {
      carregarChamados();
    }
  }, [user, chamadosCarregados, carregarChamados]);

  // Carregar categorias automaticamente
  useEffect(() => {
    if (user) {
      carregarCategorias();
    }
  }, [user, carregarCategorias]);

  // ── Qualidade ────────────────────────────────────────────────────────
  //
  // Um estado só para o modal, a página e as ações, para não sondar a API uma
  // vez por componente. Três travas:
  //
  // - `emCurso`: quem pede enquanto uma verificação anda recebe a mesma
  //   promessa, e não abre outra.
  // - `geracao`: troca de usuário (e logout) zera tudo; a resposta que
  //   chegar depois, da sessão anterior, é descartada.
  // - `suporteDecidido`: a versão da API não muda no meio da sessão, então
  //   `suportado` e `nao-suportado` valem até a troca de usuário. `falhou` não
  //   vale: é sondado de novo na próxima vez que alguém pedir — nunca num laço.
  //
  // Os atendentes, ao contrário, são consultados a cada pedido: quem é
  // elegível muda, e é isso que decide quem vê as ações.
  const [qualidade, setQualidade] = useState<EstadoDaQualidade>(QUALIDADE_INICIAL);
  const geracao = useRef(0);
  const emCurso = useRef<Promise<void> | null>(null);
  const suporteDecidido = useRef<EstadoDoSuporte | null>(null);
  const dono = useRef<number | undefined>(undefined);

  // Idempotente, e chamada dos dois lados — pelo efeito abaixo e no começo
  // de cada verificação. Os efeitos dos filhos rodam ANTES dos do provider:
  // se só o efeito zerasse, a verificação que o `useQualidade` acabou de
  // pedir seria descartada por ele, e o estado ficaria em "verificando".
  const assumirDono = useCallback((id: number | undefined) => {
    if (dono.current === id) return;
    dono.current = id;
    geracao.current += 1;
    emCurso.current = null;
    suporteDecidido.current = null;
    setQualidade(QUALIDADE_INICIAL);
  }, []);

  useEffect(() => {
    assumirDono(user?.id);
  }, [user?.id, assumirDono]);

  const verificarQualidade = useCallback((): Promise<void> => {
    assumirDono(user?.id);
    if (!user) return Promise.resolve();
    if (emCurso.current) return emCurso.current;

    const minha = geracao.current;
    const jaDecidido = suporteDecidido.current;

    const tarefa: Promise<void> = Promise.all([
      jaDecidido ? Promise.resolve(jaDecidido) : sondarSuporte(),
      consultarQualidade(),
    ])
      .then(([suporte, consulta]) => {
        if (minha !== geracao.current) return;
        if (suporte !== 'falhou') suporteDecidido.current = suporte;
        setQualidade({
          suporte,
          disponibilidade: consulta.estado,
          atendentes: consulta.atendentes,
        });
      })
      .finally(() => {
        if (emCurso.current === tarefa) emCurso.current = null;
      });

    emCurso.current = tarefa;
    return tarefa;
  }, [user, assumirDono]);

  const marcarAtendimentoIndisponivel = useCallback(() => {
    suporteDecidido.current = 'nao-suportado';
    setQualidade((q) => ({ ...q, suporte: 'nao-suportado' }));
  }, []);

  const marcarQualidadeIndisponivel = useCallback(() => {
    setQualidade((q) => ({ ...q, disponibilidade: 'indisponivel', atendentes: [] }));
  }, []);

  return (
    <ChamadosContext.Provider
      value={{
        chamados,
        categorias,
        usuarios,
        loading,
        error,
        carregarChamados,
        buscarChamado,
        criarChamado,
        atualizarChamado,
        deletarChamado,
        aplicarChamado,
        removerChamado,
        carregarComentarios,
        criarComentario,
        carregarHistorico,
        carregarCategorias,
        carregarUsuarios,
        limparErro,
        qualidade,
        verificarQualidade,
        marcarAtendimentoIndisponivel,
        marcarQualidadeIndisponivel,
      }}
    >
      {children}
    </ChamadosContext.Provider>
  );
};
