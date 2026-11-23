import React, { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import {
  Aviso,
  Badge,
  BlocoCarregando,
  BotaoDeAcao,
  Button,
  Input,
  Modal,
  RotuloDeCampo,
  Tabela,
  TabelaCabecalho,
  TabelaCelula,
  TabelaCelulaDeCabecalho,
  TabelaCorpo,
  TabelaLinha,
  type VarianteBadge,
} from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { getRoleName } from '../../utils/roleMapper';
import {
  estaAtivo,
  montarListaDeUsuarios,
  type FiltroDeStatus,
} from '../../lib/usuariosLista';
import UsuarioModal from './UsuarioModal';
import { IconeBusca, IconeChave, IconeDesfazer, IconeEditar, IconeEnergia, IconeMais, IconeOlho, IconeRecarregar, IconeSetor, IconeUsuarios } from '../ui/icones';
import type {
  Usuario,
  ModalMode,
  OrdenacaoCampo,
  OrdenacaoDirecao,
} from '../../types/cadastros.types';

// ========================================
// COMPONENTE USUARIOS TAB
// ========================================

/** Quantas colunas a tabela tem — é o `colSpan` da linha separadora. */
const COLUNAS = 6;

/** Como cada filtro é chamado no aviso de resultado fora do filtro. */
const NOME_DO_FILTRO: Record<FiltroDeStatus, string> = {
  todos: 'Todos',
  ativos: 'Ativos',
  inativos: 'Inativos',
};

const UsuariosTab: React.FC = () => {
  const {
    usuarios,
    usuariosIncompletos,
    setores,
    desativarUsuario,
    reativarUsuario,
    // `updateUsuario` não vem daqui: quem salva a edição é o `UsuarioModal`.
    updateUsuarioPassword,
    refreshData,
    loading,
    error,
  } = useCadastros();
  const { user } = useAuth();

  // ========================================
  // ESTADOS LOCAIS
  // ========================================

  const [busca, setBusca] = useState('');
  // "Todos" de saída: ninguém some da tela sem que a pessoa peça. Os ativos
  // já vêm em cima pela ordenação.
  const [filtro, setFiltro] = useState<FiltroDeStatus>('todos');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaError, setSenhaError] = useState('');
  // O reset de senha em voo, em DOIS lugares, e cada um faz uma coisa.
  //
  // O estado desenha: e ele que desabilita o botao e poe o anel.
  // A REF trava: e ela que impede a segunda chamada.
  //
  // Precisa dos dois porque `setResetandoSenha(true)` NAO atualiza
  // `resetandoSenha` no mesmo tique — a leitura seguinte, dentro do mesmo
  // manipulador ou num segundo clique antes do render, ainda ve `false`. Um
  // duplo clique de mouse sao dois eventos em milissegundos, antes de qualquer
  // pintura: os dois liam falso e os dois passavam.
  //
  // Isto nao e teoria. A primeira versao deste conserto guardava so pelo
  // estado, e o teste reprovou na hora com "expected 1 time, got 2 times".
  // `useRef` muda no ato, e por isso e a trava.
  const [resetandoSenha, setResetandoSenha] = useState(false);
  const resetEmVoo = useRef(false);
  const [ordenacao, setOrdenacao] = useState<{
    campo: OrdenacaoCampo;
    direcao: OrdenacaoDirecao;
  }>({ campo: 'id', direcao: 'asc' });

  // ========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ========================================

  // Criar, editar e excluir usuário exigem administrador na API. O nome antigo
  // (`isAdmin`) incluía o técnico e liberava botões que respondiam 403.
  const isAdmin = user?.role === 'Administrador';

  // ========================================
  // FILTRAGEM E ORDENAÇÃO
  // ========================================

  // Busca, filtro e ordem saem de `lib/usuariosLista`, que não toca na lista
  // do contexto. Ativos vêm antes de inativos em qualquer coluna e direção.
  const lista = useMemo(
    () => montarListaDeUsuarios(usuarios, { busca, filtro, ordenacao }),
    [usuarios, busca, filtro, ordenacao]
  );
  const usuariosOrdenados = lista.visiveis;
  const { contagem } = lista;

  const filtros: { valor: FiltroDeStatus; rotulo: string; total: number }[] = [
    { valor: 'todos', rotulo: 'Todos', total: contagem.total },
    { valor: 'ativos', rotulo: 'Ativos', total: contagem.ativos },
    { valor: 'inativos', rotulo: 'Inativos', total: contagem.inativos },
  ];

  // Carga que falhou sem lista anterior: não há o que contar, e "(0)" leria
  // como "não existe ninguém". O erro aparece no aviso; os números somem.
  const totaisConfiaveis = !(error && contagem.total === 0);

  const mensagemDeListaVazia = (): string => {
    if (busca) return 'Nenhum usuário encontrado com os critérios de busca';
    if (filtro === 'ativos') return 'Nenhum usuário ativo';
    if (filtro === 'inativos') return 'Nenhum usuário inativo';
    return 'Nenhum usuário cadastrado ainda';
  };

  // ========================================
  // HANDLERS
  // ========================================

  const handleOrdenar = (campo: OrdenacaoCampo) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleNovoUsuario = () => {
    setUsuarioEditando(null);
    setModalMode('create');
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setModalMode('edit');
  };

  const handleVisualizarUsuario = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setModalMode('view');
  };

  const handleDesativarUsuario = async (id: number) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }

    try {
      await desativarUsuario(id);
      setConfirmDelete(null);
    } catch (err: any) {
      // A API recusa desativar o último administrador, e a mensagem dela
      // explica o motivo — vale mais que um texto genérico nosso.
      toast.error(err.response?.data?.detail || 'Erro ao desativar usuário');
    }
    setConfirmDelete(null);
  };

  const handleReativarUsuario = async (usuario: Usuario) => {
    try {
      await reativarUsuario(usuario.id);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao reativar usuário');
    }
  };

  const fecharResetSenha = () => {
    setResetPasswordFor(null);
    setNovaSenha('');
    setConfirmarSenha('');
    setSenhaError('');
  };

  const handleResetPassword = async () => {
    if (!resetPasswordFor) return;

    // A guarda contra o segundo clique.
    //
    // Sem ela, dois cliques disparavam duas chamadas de troca de senha para o
    // mesmo usuario. A segunda costuma vencer e gravar o mesmo valor, entao na
    // maior parte das vezes nao da em nada visivel — mas as duas partem em
    // paralelo, e nao ha nada garantindo a ordem: e uma corrida com credencial
    // de outra pessoa em jogo, e o resultado depende de qual resposta chega
    // primeiro.
    //
    // Duplo clique num botao nao e descuido raro: e o gesto padrao de quem
    // acha que o primeiro clique nao pegou — e aqui o primeiro NAO dava
    // nenhum sinal de ter pego, porque o botao nao mudava de estado.
    //
    // A trava vem ANTES de tudo, e le a REF e nao o estado — ver a nota na
    // declaracao. O botao desabilitado e o aviso visual; esta linha e o que
    // de fato impede a segunda chamada.
    if (resetEmVoo.current) return;
    resetEmVoo.current = true;

    // Validações
    // As duas recusas soltam a trava antes de sair. Sem isso, uma senha curta
    // travaria o botao para sempre: a ref ficaria `true` e nenhuma tentativa
    // seguinte passaria — o defeito oposto, e pior, porque silencioso.
    if (!novaSenha || novaSenha.length < 6) {
      setSenhaError('A senha deve ter pelo menos 6 caracteres');
      resetEmVoo.current = false;
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setSenhaError('As senhas não coincidem');
      resetEmVoo.current = false;
      return;
    }

    try {
      setResetandoSenha(true);
      await updateUsuarioPassword(resetPasswordFor.id, novaSenha);
      toast.success(`Senha do usuário ${resetPasswordFor.nome} atualizada com sucesso!`);
      fecharResetSenha();
    } catch (err: any) {
      setSenhaError(err.response?.data?.detail || 'Erro ao resetar senha');
    } finally {
      // `finally` e nao no fim do `try`: sem ele, um erro deixaria o botao
      // travado para sempre e a pessoa teria de fechar o modal para tentar de
      // novo — trocando um defeito por outro. Os dois sao soltos aqui, senao
      // a ref ficaria travada com o botao ja liberado.
      resetEmVoo.current = false;
      setResetandoSenha(false);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getUserRole = (usuario: Usuario): string => {
    return getRoleName(usuario.role_id);
  };

  const getSetorNome = (setorId?: number): string => {
    if (!setorId) return '-';
    const setor = setores.find(s => s.id === setorId);
    return setor?.nome || '-';
  };

  /**
   * O perfil de quem usa, em variante de `Badge`.
   *
   * Era um mapa de CLASSES — `bg-alerta/15 text-on-tint-warning` e companhia —
   * renderizado num `<span rounded-full>`, que e a aparencia do `Badge` copiada
   * sem ser um. As tres cores casam exatamente com variantes que ja existem:
   *
   *   Administrador  alerta     ambar, o mesmo do aviso
   *   Tecnico        info       azul
   *   Usuario        discreto   a tinta neutra, que E `--surface-elevated`
   *
   * O canto tambem muda: era `rounded-full`, e a D2-a lista o selo entre o que
   * e reto neste repositorio.
   */
  const varianteDoPerfil = (role: string): VarianteBadge => {
    const mapa: Record<string, VarianteBadge> = {
      Administrador: 'alerta',
      Tecnico: 'info',
      Usuario: 'discreto',
    };
    return mapa[role] ?? 'discreto';
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      {/* Header com ações */}
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <IconeUsuarios className="h-6 w-6 text-on-tint-warning" />
          <h2 className="text-sm font-semibold text-conteudo">
            Usuários
          </h2>
          <Badge variante="alerta">Admin</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="w-full sm:w-64">
            {/* Ver a nota igual na SetoresTab: rotulo acessivel, tipo de
                busca, e o icone marcado como decoracao. */}
            <Input
              type="search"
              aria-label="Buscar usuários"
              placeholder="Buscar usuários..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icone={<IconeBusca className="h-4 w-4" aria-hidden="true" />}
            />
          </div>

          {/* Botão Atualizar */}
          <Button
            variante="secundario"
            onClick={refreshData}
            disabled={loading}
            aria-label="Atualizar dados"
          >
            <IconeRecarregar className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Botão Novo Usuário */}
          {isAdmin && (
            <Button onClick={handleNovoUsuario}>
              <IconeMais className="h-4 w-4" />
              {/* sr-only, e nao hidden: `hidden` e display:none e EXCLUI o texto do
                  nome acessivel, e o icone e aria-hidden — abaixo de sm o botao
                  ficava sem nome nenhum. Ver a catraca do rotulo que some. */}
              <span className="sr-only sm:not-sr-only">Novo Usuário</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filtro por status.

          `aria-pressed` em cada botão, como nos atalhos de período do
          Dashboard: são alternativas de um mesmo filtro, e qual está valendo
          não pode ser dito só pela cor. Os números são do cadastro inteiro e
          não mudam com a busca. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="group"
          aria-label="Filtrar usuários por status"
          className="flex flex-wrap gap-2"
        >
          {filtros.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filtro === f.valor
                  ? 'border-transparent bg-sinal text-[var(--text-on-primary)]'
                  : 'border-borda bg-superficie-elevada text-conteudo-suave hover:text-conteudo'
              }`}
            >
              {totaisConfiaveis ? `${f.rotulo} (${f.total})` : f.rotulo}
            </button>
          ))}
        </div>

        {/* A busca achou gente que o filtro está escondendo. O filtro não muda
            sozinho: a tela só diz onde o resto está. */}
        {lista.ocultosPeloFiltro > 0 && (
          <p role="status" className="text-sm text-conteudo-tenue">
            {lista.ocultosPeloFiltro === 1
              ? `A busca encontrou mais 1 usuário fora do filtro ${NOME_DO_FILTRO[filtro]}.`
              : `A busca encontrou mais ${lista.ocultosPeloFiltro} usuários fora do filtro ${NOME_DO_FILTRO[filtro]}.`}
          </p>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <Aviso variante="perigo" className="shrink-0">{error}</Aviso>
      )}

      {/* A carga trouxe o mesmo usuário em duas páginas: os números acima
          podem não ser o cadastro inteiro, e a tela precisa dizer. */}
      {usuariosIncompletos && (
        <Aviso variante="alerta" className="shrink-0">
          A lista pode estar incompleta: a carga trouxe usuários repetidos. Os
          totais podem não ser exatos. Use Atualizar para carregar de novo.
        </Aviso>
      )}

      {/* Tabela */}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-borda bg-superficie">
        {loading && !usuarios.length ? (
          <BlocoCarregando className="h-full" tamanho="lg">
            Carregando usuários...
          </BlocoCarregando>
        ) : usuariosOrdenados.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <IconeUsuarios className="mb-4 h-12 w-12 text-conteudo-tenue" />
            <p className="text-center text-sm text-conteudo-tenue">
              {mensagemDeListaVazia()}
            </p>
            {isAdmin && !busca && contagem.total === 0 && (
              <Button className="mt-4" onClick={handleNovoUsuario}>
                <IconeMais className="h-4 w-4" />
                Criar primeiro usuário
              </Button>
            )}
          </div>
        ) : (
          <Tabela>
            <TabelaCabecalho>
              <tr>
                <TabelaCelulaDeCabecalho
                  aoOrdenar={() => handleOrdenar('id')}
                  ordenadaPor={
                    ordenacao.campo === 'id' ? ordenacao.direcao : null
                  }
                >
                  ID
                </TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho
                  aoOrdenar={() => handleOrdenar('nome')}
                  ordenadaPor={
                    ordenacao.campo === 'nome' ? ordenacao.direcao : null
                  }
                >
                  Usuário
                </TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho>Perfil</TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho>Setor</TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho
                  aoOrdenar={() => handleOrdenar('created_at')}
                  ordenadaPor={
                    ordenacao.campo === 'created_at' ? ordenacao.direcao : null
                  }
                >
                  Criado em
                </TabelaCelulaDeCabecalho>
                <TabelaCelulaDeCabecalho aDireita>Ações</TabelaCelulaDeCabecalho>
              </tr>
            </TabelaCabecalho>
            <TabelaCorpo>
              {usuariosOrdenados.map((usuario, indice) => (
                <React.Fragment key={usuario.id}>
                {/* Onde os ativos acabam. Só existe quando há os dois grupos
                    na tela — na prática, no filtro Todos. */}
                {indice === lista.inicioDosInativos && (
                  <tr className="border-b border-borda-suave bg-superficie-elevada">
                    <td
                      colSpan={COLUNAS}
                      className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-conteudo-tenue"
                    >
                      Inativos ({usuariosOrdenados.length - lista.inicioDosInativos})
                    </td>
                  </tr>
                )}
                {/* A linha inativa NÃO leva opacidade (FE-12). `opacity-60` aqui era
                    herdada por tudo o que está dentro e reprovava o contraste do
                    selo (2,73:1), da descrição, da data e dos ícones de ação. O
                    inativo é marcado pelo selo e pelo nome e ID em tom tênue, que
                    mede 7,58:1 no claro e 6,23:1 no escuro. */}
                <TabelaLinha>
                  <TabelaCelula tenue={!estaAtivo(usuario)}>#{usuario.id}</TabelaCelula>
                  <TabelaCelula>
                    <div className="flex items-center gap-2">
                      <IconeUsuarios className="h-4 w-4 text-conteudo-tenue" />
                      <span
                        className={
                          estaAtivo(usuario)
                            ? 'text-sm font-medium text-conteudo'
                            : 'text-sm font-medium text-conteudo-tenue'
                        }
                      >
                        {usuario.nome}
                      </span>
                      {/* A API desativa em vez de apagar, para não quebrar a FK
                          dos chamados que a pessoa abriu. Sem este selo, a linha
                          volta idêntica à ativa e parece que a ação falhou. */}
                      {!estaAtivo(usuario) && (
                        <Badge variante="discreto">Inativo</Badge>
                      )}
                    </div>
                  </TabelaCelula>
                  <TabelaCelula>
                    <Badge variante={varianteDoPerfil(getUserRole(usuario))}>
                      {getUserRole(usuario)}
                    </Badge>
                  </TabelaCelula>
                  <TabelaCelula>
                    <div className="flex items-center gap-2">
                      <IconeSetor className="h-4 w-4 text-conteudo-tenue" aria-hidden="true" />
                      <span className="text-conteudo-suave">
                        {getSetorNome(usuario.setor_id)}
                      </span>
                    </div>
                  </TabelaCelula>
                  <TabelaCelula tenue>{formatDate(usuario.created_at)}</TabelaCelula>
                  <TabelaCelula className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Visualizar sempre disponível. Tom neutro: ler não
                          altera nada, e não precisa da cor de quem altera. */}
                      <BotaoDeAcao
                        titulo="Visualizar"
                        descricao={`Visualizar ${usuario.nome}`}
                        onClick={() => handleVisualizarUsuario(usuario)}
                      >
                        <IconeOlho className="h-4 w-4" />
                      </BotaoDeAcao>

                      {/* Editar - apenas admin */}
                      {isAdmin && (
                        <BotaoDeAcao
                          tom="info"
                          titulo="Editar"
                          descricao={`Editar ${usuario.nome}`}
                          onClick={() => handleEditarUsuario(usuario)}
                        >
                          <IconeEditar className="h-4 w-4" />
                        </BotaoDeAcao>
                      )}

                      {/* Reset senha - apenas admin. Âmbar: a pessoa perde a
                          senha que usava e precisa ser avisada. */}
                      {isAdmin && (
                        <BotaoDeAcao
                          tom="alerta"
                          titulo="Resetar senha"
                          descricao={`Resetar a senha de ${usuario.nome}`}
                          onClick={() => setResetPasswordFor(usuario)}
                        >
                          <IconeChave className="h-4 w-4" />
                        </BotaoDeAcao>
                      )}

                      {/* Desativar ou reativar — apenas admin, e não em si mesmo.
                          O rótulo diz "desativar" porque é o que a API faz: o
                          usuário perde o acesso mas o histórico dele continua
                          referenciando um registro que existe. */}
                      {isAdmin && usuario.id !== Number(user?.id) && (
                        !estaAtivo(usuario) ? (
                          <BotaoDeAcao
                            tom="sucesso"
                            titulo="Reativar"
                            descricao={`Reativar ${usuario.nome}`}
                            onClick={() => handleReativarUsuario(usuario)}
                          >
                            <IconeDesfazer className="h-4 w-4" />
                          </BotaoDeAcao>
                        ) : confirmDelete === usuario.id ? (
                          <div className="flex items-center gap-2">
                            <Button variante="secundario"
                              onClick={() => handleDesativarUsuario(usuario.id)}>
                              Desativar
                            </Button>
                            <Button
                              variante="secundario"
                              tamanho="sm"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          // Ícone de ligar/desligar, não lixeira: aqui a ação
                          // desativa, e o botão ao lado reverte. A lixeira
                          // continua em Categorias, onde o DELETE apaga de
                          // verdade — assim o ícone informa a diferença. Âmbar
                          // em vez de vermelho pelo mesmo motivo: vermelho
                          // promete irreversível.
                          <BotaoDeAcao
                            tom="alerta"
                            titulo="Desativar"
                            descricao={`Desativar ${usuario.nome}`}
                            onClick={() => handleDesativarUsuario(usuario.id)}
                          >
                            <IconeEnergia className="h-4 w-4" />
                          </BotaoDeAcao>
                        )
                      )}
                    </div>
                  </TabelaCelula>
                </TabelaLinha>
                </React.Fragment>
              ))}
            </TabelaCorpo>
          </Tabela>
        )}
      </div>

      {/* Footer com informações */}
      <div className="flex shrink-0 items-center justify-between text-sm text-conteudo-tenue">
        <div>
          Exibindo {usuariosOrdenados.length} de {contagem.total} usuário(s)
        </div>
        {busca && (
          <div>
            Exibindo resultados para: "{busca}"
          </div>
        )}
      </div>

      {/* Modal de Usuário */}
      <UsuarioModal
        isOpen={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setUsuarioEditando(null);
        }}
        mode={modalMode}
        usuario={usuarioEditando}
      />

      {/* Modal de Reset de Senha */}
      <Modal
        aberto={resetPasswordFor !== null}
        aoFechar={fecharResetSenha}
        titulo="Resetar senha"
        descricao={resetPasswordFor?.nome}
        largura="sm"
      >
        <div className="space-y-4">
          {senhaError && (
            <Aviso variante="perigo">{senhaError}</Aviso>
          )}

          <div>
            <RotuloDeCampo htmlFor="nova-senha">Nova senha</RotuloDeCampo>
            <Input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => {
                setNovaSenha(e.target.value);
                setSenhaError('');
              }}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <RotuloDeCampo htmlFor="confirmar-senha">Confirmar senha</RotuloDeCampo>
            <Input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => {
                setConfirmarSenha(e.target.value);
                setSenhaError('');
              }}
              placeholder="Digite a senha novamente"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variante="secundario" onClick={fecharResetSenha}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} carregando={resetandoSenha}>
              {!resetandoSenha && (
                <IconeChave className="h-4 w-4" aria-hidden="true" />
              )}
              Resetar senha
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosTab;
