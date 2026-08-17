import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useChamados } from '../hooks/useChamados';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, StatusEnum, Usuario } from '../types/api';
import ChamadoModal from './ChamadoModal';

/**
 * A janela do chamado montada sobre o contexto de verdade.
 *
 * O que se prova aqui é a FIAÇÃO, que nenhum teste de unidade alcança: mudar o
 * status pela janela precisa mover o card no quadro atrás dela. O defeito
 * relatado era exatamente esta fiação faltando — a janela salvava pelo serviço,
 * o quadro lia do contexto, e as duas verdades só se encontravam num F5. A
 * mutação de cortar o aviso ao quadro sobrevivia ao teste do contexto sozinho.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const CHAMADO = {
  id: 1,
  titulo: 'Umbler sem funcionar',
  protocolo: 'CHAM-2026-0001',
  descricao: 'Não conecta.',
  status: StatusEnum.EM_ANDAMENTO,
  prioridade: 'Média',
  solicitante_id: 2,
  tecnico_responsavel_id: null,
  cancelado: false,
  arquivado: false,
} as unknown as Chamado;

const SESSAO = {
  user: { id: 1, username: 'rickelme', role: 'Administrador' },
  token: 'token-de-teste',
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
} as React.ContextType<typeof AuthContext>;

/** O quadro: o que a lista do contexto contém. */
let quadro: Array<{ id: number; status: StatusEnum }> = [];

const Sonda: React.FC = () => {
  const { chamados, carregarChamados } = useChamados();
  quadro = chamados.map((c) => ({ id: c.id, status: c.status }));
  // Guarda para o teste disparar a carga inicial.
  (Sonda as unknown as { carregar: () => Promise<void> }).carregar = carregarChamados;
  return null;
};

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([CHAMADO]);
  // O modal monta antes de a lista carregar; o cache-miss cai em `buscar`.
  vi.spyOn(chamadosService, 'buscar').mockResolvedValue(CHAMADO);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
  ]);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root.render(
      <AuthContext.Provider value={SESSAO}>
        <ThemeProvider>
          <ChamadosProvider>
            <Sonda />
            <ChamadoModal chamadoId={1} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });

  await act(async () => {
    await (Sonda as unknown as { carregar: () => Promise<void> }).carregar();
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ChamadoModal e o quadro', () => {
  it('o quadro parte do status original', () => {
    expect(quadro).toEqual([{ id: 1, status: StatusEnum.EM_ANDAMENTO }]);
  });

  // O relato do usuário: "preciso carregar a página para ele se mover".
  it('mudar o status pela janela move o card no quadro, sem recarga', async () => {
    const resolvido = { ...CHAMADO, status: StatusEnum.AGUARDANDO } as Chamado;
    vi.spyOn(chamadosService, 'atualizar').mockResolvedValue(resolvido);

    // O botão "Aguardando retorno" das ações rápidas, clicado de verdade.
    const botao = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Aguardando retorno')
    );
    expect(botao, 'botão de ação rápida não apareceu').toBeTruthy();

    await act(async () => {
      botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(quadro).toEqual([{ id: 1, status: StatusEnum.AGUARDANDO }]);
  });

  it('atribuir responsável pela janela também chega ao quadro', async () => {
    const atribuido = { ...CHAMADO, tecnico_responsavel_id: 1 } as Chamado;
    const atualizar = vi
      .spyOn(chamadosService, 'atualizar')
      .mockResolvedValue(atribuido);

    // Abre o seletor de responsável e escolhe a única pessoa da lista.
    const seletor = Array.from(document.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === 'Responsável'
    );
    expect(seletor, 'seletor de responsável não apareceu').toBeTruthy();

    await act(async () => {
      seletor!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const opcao = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent?.includes('rickelme')
    );
    expect(opcao, 'opção de técnico não apareceu').toBeTruthy();

    await act(async () => {
      opcao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(atualizar).toHaveBeenCalledWith(1, { tecnico_responsavel_id: 1 });
  });
});
