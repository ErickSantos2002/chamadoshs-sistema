import { useEffect, useState } from 'react';
import { usuariosService } from '../services/chamadoshsapi';
import type { Usuario } from '../types/api';

/**
 * Índice `id -> usuário`, para as telas que precisam exibir o nome de quem
 * abriu o chamado, comentou ou aparece no histórico.
 *
 * Substitui a busca individual por id: as telas montavam a lista de ids
 * envolvidos e disparavam um GET /usuarios/{id} para cada um. Numa tela com
 * vinte pessoas envolvidas eram vinte requisições — quarenta contando o
 * preflight do CORS, que o header de autenticação obriga. Uma listagem
 * resolve tudo numa chamada.
 *
 * Inclui inativos de propósito: um chamado antigo pode ter sido aberto por
 * alguém que já saiu da empresa, e o nome precisa continuar aparecendo no
 * histórico. Por isso não usa o `carregarUsuarios` do ChamadosContext, que
 * filtra por ativos para alimentar o seletor de solicitante.
 */
export function indexarPorId(lista: Usuario[]): Record<number, Usuario> {
  const indice: Record<number, Usuario> = {};

  lista.forEach((usuario) => {
    indice[usuario.id] = usuario;
  });

  return indice;
}

export function useUsuariosPorId(): Record<number, Usuario> {
  const [usuarios, setUsuarios] = useState<Record<number, Usuario>>({});

  useEffect(() => {
    let cancelado = false;

    usuariosService
      .listarTodos()
      .then((lista) => {
        if (cancelado) return;
        setUsuarios(indexarPorId(lista));
      })
      .catch(() => {
        // Falhar aqui só custa os nomes: as telas caem no fallback
        // "Usuário #id". Não pode derrubar a listagem de chamados junto.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return usuarios;
}
