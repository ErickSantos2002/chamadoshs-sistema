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
    //
    // Procurado pelo NOME ACESSÍVEL, resolvido como o navegador resolve, e não
    // por um atributo específico. A primeira versão procurava
    // `aria-label === 'Responsável'` e quebrou quando o `Seletor` deixou de
    // usar `aria-label` — que era justamente o conserto, porque `aria-label`
    // apagava o valor escolhido do nome.
    //
    // Um teste que procura pela costura reprova quando a costura melhora. Este
    // procura pelo que a pessoa ouviria.
    const nomeAcessivel = (el: Element): string => {
      const ids = el.getAttribute('aria-labelledby');
      if (ids) {
        return ids
          .split(/\s+/)
          .map((i) => document.getElementById(i)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ');
      }
      return el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
    };

    const seletor = Array.from(
      document.querySelectorAll('[role="combobox"]')
    ).find((b) => nomeAcessivel(b).includes('Responsável')) as
      | HTMLElement
      | undefined;
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

describe('ChamadoModal — o setor de destino', () => {
  /**
   * Reabre a janela num chamado que não está no quadro (id 2), para o
   * cache-miss cair no `buscar` com o setor da vez.
   */
  const abrirComSetor = async (extra: Record<string, unknown>) => {
    vi.spyOn(chamadosService, 'buscar').mockResolvedValue({
      ...CHAMADO,
      id: 2,
      ...extra,
    } as Chamado);
    await act(async () => {
      root.render(
        <AuthContext.Provider value={SESSAO}>
          <ThemeProvider>
            <ChamadosProvider>
              <ChamadoModal chamadoId={2} aoFechar={() => {}} aoAbrirEmPagina={() => {}} />
            </ChamadosProvider>
          </ThemeProvider>
        </AuthContext.Provider>
      );
    });
  };

  const texto = () => document.body.textContent ?? '';

  // A janela mostra o setor SEMPRE, inclusive TI — é onde se confere.
  it('API antiga, sem o campo: mostra TI', () => {
    expect(texto()).toContain('Setor de destino: TI');
  });

  it('TI explícito: mostra TI', async () => {
    await abrirComSetor({ setor_destino: 'TI' });
    expect(texto()).toContain('Setor de destino: TI');
  });

  it('Qualidade: mostra Qualidade', async () => {
    await abrirComSetor({ setor_destino: 'QUALIDADE' });
    expect(texto()).toContain('Setor de destino: Qualidade');
    expect(texto()).not.toContain('Setor de destino: TI');
  });

  it('valor desconhecido: selo neutro com o que chegou, e não TI', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await abrirComSetor({ setor_destino: '<b>RH</b>' });
    // O selo montado avisa — e uma vez só, mesmo redesenhando.
    await abrirComSetor({ setor_destino: '<b>RH</b>' });
    const doSetor = aviso.mock.calls.filter(([m]) => String(m).startsWith('[setor]'));
    expect(doSetor).toHaveLength(1);
    expect(doSetor[0][0]).toContain('chamado 2');
    expect(texto()).toContain('Setor não reconhecido: <b>RH</b>');
    // Como texto: não virou elemento.
    expect(document.querySelector('b')).toBeNull();
    expect(texto()).not.toContain('Setor de destino: TI');
  });

  it('o selo fica junto do status e da prioridade', async () => {
    await abrirComSetor({ setor_destino: 'QUALIDADE' });
    const selo = Array.from(document.querySelectorAll('span')).find(
      (s) => s.textContent === 'Setor de destino: Qualidade'
    );
    expect(selo, 'selo de setor não apareceu').toBeTruthy();
    expect(selo!.parentElement!.textContent).toContain('Em Andamento');
    expect(selo!.parentElement!.textContent).toContain('Média');
  });
});
