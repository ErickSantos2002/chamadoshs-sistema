import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext } from './AuthContext';
import { ChamadosProvider } from './ChamadosContext';
import { useChamados } from '../hooks/useChamados';
import { chamadosService } from '../services/chamadoshsapi';
import { Chamado, StatusEnum } from '../types/api';

/**
 * O quadro e a janela do chamado precisam contar a mesma história.
 *
 * O defeito que motivou isto: as ações da janela salvam direto pelo serviço —
 * de propósito, para não acender o `loading` global que apaga o quadro — e a
 * lista do contexto nunca ficava sabendo. O card resolvido ficava parado na
 * coluna antiga até um F5, e reabrir o mesmo card mostrava o status velho,
 * porque `buscarChamado` lê do mesmo cache. O relato do usuário foi
 * "lentidão": ele estava recarregando a página para ver o que já tinha
 * acontecido.
 *
 * `aplicarChamado` é a ponte: funde na lista um chamado salvo por outro
 * caminho, sem requisição e sem `loading`.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const chamadoDe = (id: number, status: StatusEnum): Chamado =>
  ({ id, status, titulo: `Chamado ${id}` }) as Chamado;

/** O que o quadro veria: id e status de cada card. */
let visto: Array<{ id: number; status: StatusEnum }> = [];
let acoes: ReturnType<typeof useChamados>;

const Sonda: React.FC = () => {
  acoes = useChamados();
  visto = acoes.chamados.map((c) => ({ id: c.id, status: c.status }));
  return null;
};

const SESSAO = {
  user: { id: 1, username: 'rickelme', role: 'Administrador' },
  token: 'token-de-teste',
  loading: false,
  error: null,
  login: async () => {},
  logout: () => {},
} as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([
    chamadoDe(1, StatusEnum.EM_ANDAMENTO),
    chamadoDe(2, StatusEnum.ABERTO),
  ]);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root.render(
      <AuthContext.Provider value={SESSAO}>
        <ChamadosProvider>
          <Sonda />
        </ChamadosProvider>
      </AuthContext.Provider>
    );
  });

  await act(async () => {
    await acoes.carregarChamados();
  });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('aplicarChamado', () => {
  it('o quadro parte do que a API listou', () => {
    expect(visto).toEqual([
      { id: 1, status: StatusEnum.EM_ANDAMENTO },
      { id: 2, status: StatusEnum.ABERTO },
    ]);
  });

  // O caso do relato: resolver pela janela precisa mover o card na hora,
  // sem F5 e sem nova listagem.
  it('funde na lista um chamado salvo por outro caminho', () => {
    act(() => {
      acoes.aplicarChamado(chamadoDe(1, StatusEnum.RESOLVIDO));
    });

    expect(visto).toEqual([
      { id: 1, status: StatusEnum.RESOLVIDO },
      { id: 2, status: StatusEnum.ABERTO },
    ]);
  });

  it('não dispara requisição nenhuma', () => {
    const listagens = vi.mocked(chamadosService.listarTodos).mock.calls.length;

    act(() => {
      acoes.aplicarChamado(chamadoDe(2, StatusEnum.RESOLVIDO));
    });

    expect(vi.mocked(chamadosService.listarTodos).mock.calls.length).toBe(listagens);
  });

  /**
   * Chamado que não está na lista não entra por aqui. A lista é filtrada por
   * perfil (usuário comum só vê os próprios), e inserir um desconhecido
   * furaria esse filtro por uma porta lateral.
   */
  it('ignora chamado que não está na lista', () => {
    act(() => {
      acoes.aplicarChamado(chamadoDe(99, StatusEnum.RESOLVIDO));
    });

    expect(visto.map((c) => c.id)).toEqual([1, 2]);
  });
});

/**
 * O quadro precisa RECEBER arquivados e cancelados para poder mostrá-los em
 * colunas próprias. Sem estes parâmetros a API os omite, e o chamado some da
 * tela — não existe filtro no front capaz de trazer de volta o que nunca
 * chegou.
 *
 * São os dois recortes que a API aplica em silêncio, e as duas marcas que não
 * mexem no status: um chamado cancelado continua "Aberto" no banco.
 */
describe('carregarChamados', () => {
  it('pede os arquivados à API', () => {
    const [params] = vi.mocked(chamadosService.listarTodos).mock.calls[0];

    expect(params).toMatchObject({ incluir_arquivados: true });
  });

  it('pede os cancelados à API', () => {
    const [params] = vi.mocked(chamadosService.listarTodos).mock.calls[0];

    expect(params).toMatchObject({ incluir_cancelados: true });
  });
});
