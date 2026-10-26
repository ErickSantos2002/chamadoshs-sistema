import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import {
  categoriasService,
  chamadosService,
  comentariosService,
  historicoService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, StatusEnum, Usuario } from '../types/api';
import ChamadoDetalhes from './ChamadoDetalhes';

/**
 * A página do chamado, montada de verdade, e o item "Setor de destino".
 *
 * O que estes casos travam é a ficha: o setor aparece SEMPRE, inclusive TI e
 * inclusive contra a API antiga, e aparece como par `<dt>`/`<dd>` do mesmo
 * `<dl>` que os outros campos — é a relação nome→valor que a nota LISTA DE
 * DEFINIÇÕES da página existe para garantir.
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
  data_abertura: '2026-09-01T10:00:00',
} as unknown as Chamado;

const sessao = (role: string) =>
  ({
    user: { id: 1, username: 'rickelme', role },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
  }) as React.ContextType<typeof AuthContext>;

let host: HTMLDivElement;
let root: Root;

const montar = async (extra: Record<string, unknown>, role = 'Administrador') => {
  vi.spyOn(chamadosService, 'buscar').mockResolvedValue({ ...CHAMADO, ...extra } as Chamado);
  await act(async () => {
    root.render(
      <AuthContext.Provider value={sessao(role)}>
        <ThemeProvider>
          <ChamadosProvider>
            <MemoryRouter initialEntries={['/chamados/1']}>
              <Routes>
                <Route path="/chamados/:id" element={<ChamadoDetalhes />} />
              </Routes>
            </MemoryRouter>
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
};

/** O `<dd>` do par cujo `<dt>` diz "Setor de destino". */
const valorDoSetor = (): HTMLElement | null => {
  const dt = Array.from(document.querySelectorAll('dt')).find(
    (d) => d.textContent?.trim() === 'Setor de destino'
  );
  const dd = dt?.nextElementSibling;
  return dd?.tagName === 'DD' ? (dd as HTMLElement) : null;
};

beforeEach(() => {
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(comentariosService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(historicoService, 'listarPorChamado').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([
    { id: 1, nome: 'rickelme', role_id: 1, ativo: true } as Usuario,
  ]);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ChamadoDetalhes — setor de destino', () => {
  it('API antiga, sem o campo: TI', async () => {
    await montar({});
    expect(valorDoSetor()?.textContent).toBe('TI');
  });

  it('TI explícito: TI', async () => {
    await montar({ setor_destino: 'TI' });
    expect(valorDoSetor()?.textContent).toBe('TI');
  });

  it('Qualidade: Qualidade', async () => {
    await montar({ setor_destino: 'QUALIDADE' });
    expect(valorDoSetor()?.textContent).toBe('Qualidade');
  });

  it('valor desconhecido: indicação legível, como texto, e não TI', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await montar({ setor_destino: '<i>RH</i>' });
    expect(valorDoSetor()?.textContent).toBe('Setor não reconhecido: <i>RH</i>');
    expect(valorDoSetor()?.querySelector('i')).toBeNull();
  });

  /**
   * O `<dt>` já diz "Setor de destino". Repetir no `<dd>` para quem ouve
   * daria "Setor de destino, Setor de destino: TI".
   */
  it('o valor não repete o rótulo que o par já tem', async () => {
    await montar({ setor_destino: 'QUALIDADE' });
    expect(valorDoSetor()?.textContent).not.toContain('Setor de destino');
  });

  it('o par está dentro de um <dl>, como os outros campos da ficha', async () => {
    await montar({});
    const dd = valorDoSetor();
    expect(dd, 'par do setor não apareceu').not.toBeNull();
    expect(dd!.closest('dl')).not.toBeNull();
  });

  it('também para quem só abriu o chamado', async () => {
    await montar({ setor_destino: 'QUALIDADE' }, 'Usuario');
    expect(valorDoSetor()?.textContent).toBe('Qualidade');
  });

  /** FE-1 só mostra. Mudar o setor não é desta fase, nem em modo de edição. */
  it('continua só leitura em modo de edição', async () => {
    await montar({ setor_destino: 'QUALIDADE' });
    const editar = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Editar Detalhes')
    );
    expect(editar, 'botão de editar não apareceu').toBeTruthy();
    await act(async () => {
      editar!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Confere que o modo de edição abriu, senão o caso passaria à toa.
    expect(
      Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('Salvar'))
    ).toBe(true);

    const dd = valorDoSetor();
    expect(dd?.textContent).toBe('Qualidade');
    expect(dd?.querySelector('[role="combobox"], button, input, select')).toBeNull();
  });
});
