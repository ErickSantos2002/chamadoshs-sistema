import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useCadastros } from '../../context/CadastrosContext';
import { BotaoDeAcao, Button, Input, Modal, RotuloDeCampo } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { getRoleName } from '../../utils/roleMapper';
import UsuarioModal from './UsuarioModal';
import { IconeAlerta, IconeBusca, IconeChave, IconeDesfazer, IconeEditar, IconeEnergia, IconeMais, IconeOlho, IconeRecarregar, IconeSeta, IconeSetaCima, IconeSetor, IconeUsuarios } from '../ui/icones';
import type {
  Usuario,
  ModalMode,
  OrdenacaoCampo,
  OrdenacaoDirecao,
} from '../../types/cadastros.types';

// ========================================
// COMPONENTE USUARIOS TAB
// ========================================


const UsuariosTab: React.FC = () => {
  const {
    usuarios,
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
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [resetPasswordFor, setResetPasswordFor] = useState<Usuario | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaError, setSenhaError] = useState('');
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

  const usuariosFiltrados = useMemo(() => {
    if (!busca) return usuarios;

    const termo = busca.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) ||
        getRoleName(u.role_id).toLowerCase().includes(termo)
    );
  }, [usuarios, busca]);

  const usuariosOrdenados = useMemo(() => {
    return [...usuariosFiltrados].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (ordenacao.campo) {
        case 'nome':
          aVal = a.nome;
          bVal = b.nome;
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        default:
          aVal = a[ordenacao.campo as keyof Usuario];
          bVal = b[ordenacao.campo as keyof Usuario];
      }

      // Tratar valores nulos/undefined
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Comparação
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return ordenacao.direcao === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (ordenacao.direcao === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }, [usuariosFiltrados, ordenacao]);

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
    if (!confirmDelete) {
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

    // Validações
    if (!novaSenha || novaSenha.length < 6) {
      setSenhaError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setSenhaError('As senhas não coincidem');
      return;
    }

    try {
      await updateUsuarioPassword(resetPasswordFor.id, novaSenha);
      toast.success(`Senha do usuário ${resetPasswordFor.nome} atualizada com sucesso!`);
      fecharResetSenha();
    } catch (err: any) {
      setSenhaError(err.response?.data?.detail || 'Erro ao resetar senha');
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

  const getRoleColor = (role: string): string => {
    const roleColors: Record<string, string> = {
      'Administrador': 'bg-alerta/15 text-on-tint-warning',
      'Tecnico': 'bg-info/15 text-on-tint-info',
      'Usuario': 'bg-superficie-elevada text-conteudo-tenue',
    };
    return roleColors[role] || roleColors['Usuario'];
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
          <span className="rounded-full bg-alerta/15 px-2 py-0.5 text-[11px] font-semibold text-on-tint-warning">
            Admin
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Buscar usuários..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              icone={<IconeBusca className="h-4 w-4" />}
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
              <span className="hidden sm:inline">Novo Usuário</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex shrink-0 items-start gap-2 rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-on-tint-danger">
          <IconeAlerta className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-borda bg-superficie">
        {loading && !usuarios.length ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-conteudo-tenue">
              <IconeRecarregar className="mx-auto mb-2 h-8 w-8 animate-spin" />
              Carregando usuários...
            </div>
          </div>
        ) : usuariosOrdenados.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8">
            <IconeUsuarios className="mb-4 h-12 w-12 text-conteudo-tenue" />
            <p className="text-center text-sm text-conteudo-tenue">
              {busca
                ? 'Nenhum usuário encontrado com os critérios de busca'
                : 'Nenhum usuário cadastrado ainda'}
            </p>
            {isAdmin && !busca && (
              <Button className="mt-4" onClick={handleNovoUsuario}>
                <IconeMais className="h-4 w-4" />
                Criar primeiro usuário
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-borda">
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  <button
                    onClick={() => handleOrdenar('id')}
                    className="flex items-center gap-1 hover:text-conteudo"
                  >
                    ID
                    {ordenacao.campo === 'id' && (
                      ordenacao.direcao === 'asc' ?
                        <IconeSetaCima className="h-4 w-4" /> :
                        <IconeSeta className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  <button
                    onClick={() => handleOrdenar('nome')}
                    className="flex items-center gap-1 hover:text-conteudo"
                  >
                    Usuário
                    {ordenacao.campo === 'nome' && (
                      ordenacao.direcao === 'asc' ?
                        <IconeSetaCima className="h-4 w-4" /> :
                        <IconeSeta className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  Perfil
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  Setor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-conteudo-suave">
                  <button
                    onClick={() => handleOrdenar('created_at')}
                    className="flex items-center gap-1 hover:text-conteudo"
                  >
                    Criado em
                    {ordenacao.campo === 'created_at' && (
                      ordenacao.direcao === 'asc' ?
                        <IconeSetaCima className="h-4 w-4" /> :
                        <IconeSeta className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-conteudo-suave">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {usuariosOrdenados.map((usuario) => (
                <tr
                  key={usuario.id}
                  className={`border-b border-borda-suave transition-colors hover:bg-superficie-elevada ${
                    usuario.ativo ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-4 py-3 text-sm text-conteudo">
                    #{usuario.id}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <IconeUsuarios className="h-4 w-4 text-conteudo-tenue" />
                      <span className="text-sm font-medium text-conteudo">
                        {usuario.nome}
                      </span>
                      {/* A API desativa em vez de apagar, para não quebrar a FK
                          dos chamados que a pessoa abriu. Sem este selo, a linha
                          volta idêntica à ativa e parece que a ação falhou. */}
                      {!usuario.ativo && (
                        <span className="inline-flex rounded-full bg-superficie-elevada px-2 py-0.5 text-[11px] font-medium text-conteudo-tenue">
                          Inativo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${getRoleColor(getUserRole(usuario))}`}>
                      {getUserRole(usuario)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <IconeSetor className="h-4 w-4 text-conteudo-tenue" />
                      <span className="text-sm text-conteudo-suave">
                        {getSetorNome(usuario.setor_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-conteudo-suave">
                    {formatDate(usuario.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
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
                        !usuario.ativo ? (
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
                            <button
                              onClick={() => handleDesativarUsuario(usuario.id)}
                              className="rounded-lg bg-alerta-forte px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110"
                            >
                              Desativar
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-borda bg-superficie-elevada px-3 py-1.5 text-xs font-semibold text-conteudo transition-colors hover:bg-borda"
                            >
                              Cancelar
                            </button>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer com informações */}
      <div className="flex shrink-0 items-center justify-between text-sm text-conteudo-tenue">
        <div>
          Total: {usuariosOrdenados.length} usuário(s)
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
            <div className="rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-on-tint-danger">
              {senhaError}
            </div>
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
            <Button onClick={handleResetPassword}>
              <IconeChave className="h-4 w-4" aria-hidden="true" />
              Resetar senha
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosTab;
