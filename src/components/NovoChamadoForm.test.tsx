import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthContext } from '../context/AuthContext';
import { ChamadosProvider } from '../context/ChamadosContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useChamados } from '../hooks/useChamados';
import {
  categoriasService,
  chamadosService,
  slaConfigsService,
  usuariosService,
} from '../services/chamadoshsapi';
import { Chamado, PrioridadeEnum, StatusEnum, Usuario } from '../types/api';
import NovoChamadoForm from './NovoChamadoForm';

/**
 * O formulário de abertura, montado sobre o contexto de verdade.
 *
 * ── Por que este arquivo nasceu ANTES da Qualidade ────────────────────
 *
 * O formulário não tinha teste nenhum, e a etapa seguinte acrescenta um
 * segundo modo a ele. A abertura para a TI é a tela mais usada por quem não é
 * da equipe, e a regra da etapa é que ela não mude em NADA: mesmo corpo, mesmas
 * mensagens, na mesma ordem. Sem uma trava escrita antes, "não mudou" seria
 * opinião.
 *
 * Por isso estes casos descrevem o que o formulário FAZ hoje, inclusive o que
 * está errado — e o que está errado fica dito como tal, para ninguém tomar a
 * trava por aprovação:
 *
 *   `tecnico_responsavel_id` vai no corpo para a equipe, e a API o descarta na
 *   abertura TI. Segue dívida registrada no CHANGELOG.
 *
 * O que estava errado e foi consertado (T-2, fechamento da FE-5): o Técnico
 * via o seletor de solicitante, que a API só honra do administrador humano
 * — para os outros ela grava quem abriu —, e a dica "Você fica como técnico
 * responsável." prometia o que não acontece. Agora só o administrador humano
 * confirmado escolhe o solicitante, e a dica saiu. A matriz completa está em
 * `NovoChamadoForm.solicitante.test.tsx`.
 */

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const sessao = (id: number, role: string) =>
  ({
    user: { id, username: 'quem-abre', role, conta_de_servico: false },
    token: 'token-de-teste',
    loading: false,
    error: null,
    login: async () => {},
    logout: () => {},
    identidadeConfirmada: true,
    falhaAoConfirmar: false,
    confirmacaoRecusada: false,
    revalidando: false,
    revalidarIdentidade: async () => {},
  }) as React.ContextType<typeof AuthContext>;

const USUARIO = sessao(7, 'Usuario');
const TECNICO = sessao(3, 'Tecnico');
const ADMIN = sessao(1, 'Administrador');

const CRIADO = {
  id: 99,
  protocolo: 'CHAM-2026-0099',
  titulo: 'Impressora do RH sem papel',
  descricao: 'x',
  status: StatusEnum.ABERTO,
  prioridade: PrioridadeEnum.MEDIA,
  solicitante_id: 7,
  cancelado: false,
  arquivado: false,
} as unknown as Chamado;

let host: HTMLDivElement;
let root: Root;
let criar: ReturnType<typeof vi.fn>;
let aoCriar: ReturnType<typeof vi.fn>;
let aoCancelar: ReturnType<typeof vi.fn>;
let naLista: number[] = [];
let atendentes: MockInstance<typeof chamadosService.listarAtendentesQualidade>;

const erroHttp = (status: number, detail?: string) => ({
  isAxiosError: true,
  response: { status, data: detail === undefined ? {} : { detail } },
});

/** O que a lista do contexto contém, para conferir onde o chamado novo foi. */
const Sonda: React.FC = () => {
  naLista = useChamados().chamados.map((c) => c.id);
  return null;
};

/**
 * Monta o formulário e, por padrão, marca a TI: quase todo caso daqui é da
 * TI, e a escolha do setor tem casos próprios (`setor: null` monta sem ela).
 */
const montar = async (
  quem: React.ContextType<typeof AuthContext>,
  { setor = 'TI' }: { setor?: 'TI' | null } = {}
) => {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={quem}>
        <ThemeProvider>
          <ChamadosProvider>
            <Sonda />
            <NovoChamadoForm aoCriar={aoCriar} aoCancelar={aoCancelar} />
          </ChamadosProvider>
        </ThemeProvider>
      </AuthContext.Provider>
    );
  });
  if (setor) await escolherSetor(setor);
};

/**
 * Marca o setor de atendimento pelo rótulo, como a pessoa (1.8.0: a escolha é
 * obrigatória e nasce vazia, e os campos só aparecem depois dela).
 */
const escolherSetor = async (rotulo: 'TI' | 'Qualidade') => {
  const alvo = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (r) => r.closest('label')?.textContent?.trim().startsWith(rotulo)
  );
  expect(alvo, `rádio "${rotulo}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

/**
 * Desmonta e monta de novo. Para casos em laço: `root.render` com a mesma
 * árvore só reconcilia, e o efeito da consulta não roda outra vez — o laço
 * conferiria o primeiro caso repetidas vezes.
 */
const remontar = async (
  quem: React.ContextType<typeof AuthContext>,
  opcoes?: { setor?: 'TI' | null }
) => {
  act(() => root.unmount());
  root = createRoot(host);
  await montar(quem, opcoes);
};

/** Digita como o React enxerga: pelo setter nativo e um evento `input`. */
const digitar = async (id: string, valor: string) => {
  const campo = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  expect(campo, `campo #${id} não apareceu`).toBeTruthy();
  const prototipo = Object.getPrototypeOf(campo);
  const setter = Object.getOwnPropertyDescriptor(prototipo, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** Abre o `Seletor` pelo id do gatilho e escolhe a opção pelo texto. */
const escolher = async (id: string, opcao: string) => {
  const gatilho = document.getElementById(id);
  expect(gatilho, `seletor #${id} não apareceu`).toBeTruthy();
  await act(async () => {
    gatilho!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const alvo = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent?.trim() === opcao
  );
  expect(alvo, `opção "${opcao}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const botao = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);

/** Envia pelo botão, como a pessoa: é o que passa pelo `required` nativo. */
const enviar = async () => {
  await act(async () => {
    botao('Abrir chamado')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const mensagem = () => document.querySelector('[role="alert"]')?.textContent ?? null;

const DESCRICAO_OK = 'A impressora do RH parou de puxar papel desde ontem.';

const preencherTI = async () => {
  await digitar('titulo', 'Impressora do RH sem papel');
  await digitar('descricao', DESCRICAO_OK);
};

beforeEach(() => {
  criar = vi.fn().mockResolvedValue(CRIADO);
  vi.spyOn(chamadosService, 'criar').mockImplementation(criar);
  vi.spyOn(chamadosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(categoriasService, 'listar').mockResolvedValue([
    { id: 4, nome: 'Impressoras', ativo: true },
  ] as never);
  vi.spyOn(usuariosService, 'listar').mockResolvedValue([
    { id: 7, nome: 'Gabriel', role_id: 3, ativo: true },
    { id: 8, nome: 'Lidisay', role_id: 3, ativo: true },
  ] as Usuario[]);
  vi.spyOn(usuariosService, 'listarTodos').mockResolvedValue([]);
  vi.spyOn(slaConfigsService, 'listar').mockResolvedValue([]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // Por padrão a API é a do ar hoje, que não conhece a rota e responde 422.
  // É contra ela que os casos da TI acima foram escritos.
  atendentes = vi
    .spyOn(chamadosService, 'listarAtendentesQualidade')
    .mockRejectedValue(erroHttp(422));

  aoCriar = vi.fn();
  aoCancelar = vi.fn();
  naLista = [];

  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('abertura TI — o corpo enviado', () => {
  it('Usuario: abre para si, sem responsável', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(criar).toHaveBeenCalledTimes(1);
    expect(criar.mock.calls[0][0]).toStrictEqual({
      setor_destino: 'TI',
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: undefined,
    });
  });

  /**
   * A chave existe, com `undefined`. É o que o axios descarta antes de
   * enviar, e o formato exato é parte do que não pode mudar. O
   * `setor_destino` vai explícito desde a 1.8.0: a TI é uma escolha.
   */
  it('as sete chaves, e nenhuma outra — com setor_destino TI', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(Object.keys(criar.mock.calls[0][0]).sort()).toEqual(
      [
        'categoria_id',
        'descricao',
        'prioridade',
        'setor_destino',
        'solicitante_id',
        'tecnico_responsavel_id',
        'titulo',
      ].sort()
    );
    expect(criar.mock.calls[0][0].setor_destino).toBe('TI');
  });

  // T-2: antes o Técnico escolhia um solicitante que a API ignorava. Agora
  // abre para si, como a API grava; o responsável segue no corpo (dívida).
  it('Técnico: sem seletor, abre para si', async () => {
    await montar(TECNICO);
    await preencherTI();
    expect(document.getElementById('solicitante')).toBeNull();
    await enviar();

    expect(criar.mock.calls[0][0]).toStrictEqual({
      setor_destino: 'TI',
      solicitante_id: 3,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: 3,
    });
  });

  it('Administrador: o mesmo corpo da equipe', async () => {
    await montar(ADMIN);
    await preencherTI();
    await escolher('solicitante', 'Gabriel');
    await enviar();

    expect(criar.mock.calls[0][0]).toStrictEqual({
      setor_destino: 'TI',
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: 1,
    });
  });

  it('categoria e prioridade escolhidas entram no corpo', async () => {
    await montar(USUARIO);
    await preencherTI();
    await escolher('categoria', 'Impressoras');
    await escolher('prioridade', PrioridadeEnum.ALTA);
    await enviar();

    expect(criar.mock.calls[0][0]).toMatchObject({
      categoria_id: 4,
      prioridade: PrioridadeEnum.ALTA,
    });
  });

  it('título e descrição vão aparados', async () => {
    await montar(USUARIO);
    await digitar('titulo', '   Impressora do RH sem papel   ');
    await digitar('descricao', `  ${DESCRICAO_OK}  `);
    await enviar();

    expect(criar.mock.calls[0][0]).toMatchObject({
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
    });
  });
});

describe('abertura TI — os campos', () => {
  it('prioridade nasce Média e categoria nasce vazia', async () => {
    await montar(USUARIO);
    expect(document.getElementById('prioridade')?.textContent).toContain('Média');
    expect(document.getElementById('categoria')?.textContent).toContain('Sem categoria');
  });

  it('título tem teto de 200 e os dois textos são obrigatórios no navegador', async () => {
    await montar(USUARIO);
    const titulo = document.getElementById('titulo') as HTMLInputElement;
    expect(titulo.maxLength).toBe(200);
    expect(titulo.required).toBe(true);
    expect((document.getElementById('descricao') as HTMLTextAreaElement).required).toBe(true);
  });

  it('Usuario não vê o seletor de solicitante nem a dica', async () => {
    await montar(USUARIO);
    expect(document.getElementById('solicitante')).toBeNull();
    expect(document.body.textContent).not.toContain('Você fica como técnico responsável.');
  });

  // T-2: o seletor é do administrador humano; a dica saiu para todos.
  it('só o administrador humano vê o seletor, e ninguém vê a dica', async () => {
    for (const [quem, ve] of [
      [TECNICO, false],
      [ADMIN, true],
    ] as const) {
      await remontar(quem);
      expect(Boolean(document.getElementById('solicitante')), quem.user!.role).toBe(ve);
      expect(document.body.textContent).not.toContain('Você fica como técnico responsável.');
    }
  });
});

describe('abertura TI — validação, na ordem', () => {
  it('campo vazio: o navegador barra antes, e nada é enviado', async () => {
    await montar(USUARIO);
    await enviar();
    expect(criar).not.toHaveBeenCalled();
    expect(mensagem()).toBeNull();
  });

  // Espaços passam pelo `required` nativo; é aqui que a regra do formulário
  // entra, e o título vem antes da descrição.
  it('título só de espaços: "Título é obrigatório."', async () => {
    await montar(USUARIO);
    await digitar('titulo', '   ');
    await digitar('descricao', '   ');
    await enviar();
    expect(mensagem()).toBe('Título é obrigatório.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('título curto: quantos caracteres faltam', async () => {
    await montar(USUARIO);
    await digitar('titulo', 'Impressor');
    await digitar('descricao', DESCRICAO_OK);
    await enviar();
    expect(mensagem()).toBe('Título precisa de mais 1 caractere.');
  });

  it('título bom, descrição curta: a descrição', async () => {
    await montar(USUARIO);
    await digitar('titulo', 'Impressora do RH sem papel');
    await digitar('descricao', 'Parou de novo');
    await enviar();
    expect(mensagem()).toBe('Descrição precisa de mais 7 caracteres.');
  });

  it('descrição só de espaços: "Descrição é obrigatório."', async () => {
    await montar(USUARIO);
    await digitar('titulo', 'Impressora do RH sem papel');
    await digitar('descricao', '    ');
    await enviar();
    expect(mensagem()).toBe('Descrição é obrigatório.');
  });

  it('o administrador sem solicitante: "Selecione o solicitante." depois dos textos', async () => {
    await montar(ADMIN);
    await digitar('titulo', 'Impressor');
    await digitar('descricao', DESCRICAO_OK);
    await enviar();
    expect(mensagem()).toBe('Título precisa de mais 1 caractere.');

    await digitar('titulo', 'Impressora do RH sem papel');
    await enviar();
    expect(mensagem()).toBe('Selecione o solicitante.');
    expect(criar).not.toHaveBeenCalled();
  });
});

describe('abertura TI — depois do envio', () => {
  it('sucesso: devolve o chamado a quem abriu e põe no topo da lista', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
    expect(naLista[0]).toBe(99);
  });

  it('erro da API: mostra o detail que ela mandou', async () => {
    criar.mockRejectedValue({ response: { status: 400, data: { detail: 'Categoria inativa' } } });
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(mensagem()).toBe('Categoria inativa');
    expect(aoCriar).not.toHaveBeenCalled();
  });

  it('erro sem detail: a mensagem genérica', async () => {
    criar.mockRejectedValue(new Error('rede'));
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect(mensagem()).toBe('Erro ao criar chamado. Tente novamente.');
  });

  it('o que foi digitado continua lá depois do erro', async () => {
    criar.mockRejectedValue(new Error('rede'));
    await montar(USUARIO);
    await preencherTI();
    await enviar();

    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(
      'Impressora do RH sem papel'
    );
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_OK);
  });

  it('"Cancelar" chama aoCancelar e não envia', async () => {
    await montar(USUARIO);
    await act(async () => {
      botao('Cancelar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(aoCancelar).toHaveBeenCalledTimes(1);
    expect(criar).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════════════
// A QUALIDADE
// ════════════════════════════════════════════════════════════════════════

const ATENDENTES = [
  { id: 21, nome: 'Ana Qualidade' },
  { id: 22, nome: 'Bruno Qualidade' },
];

const DESCRICAO_Q = 'Desvio na calibração da balança 3 do laboratório.';

const qualidadeDisponivel = (lista = ATENDENTES) => atendentes.mockResolvedValue(lista);

const grupo = () => document.querySelector('fieldset');
const radio = (rotulo: string) =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (r) => r.closest('label')?.textContent?.trim().startsWith(rotulo)
  );

const marcar = async (rotulo: string) => {
  const alvo = radio(rotulo);
  expect(alvo, `rádio "${rotulo}" não apareceu`).toBeTruthy();
  await act(async () => {
    alvo!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const corpoEnviado = () => criar.mock.calls[criar.mock.calls.length - 1][0];

describe('disponibilidade — o que a consulta decide', () => {
  it('consulta os atendentes ao montar', async () => {
    await montar(USUARIO);
    expect(atendentes).toHaveBeenCalledTimes(1);
  });

  /**
   * Sem a Qualidade — API sem a rota, 503, rede, 401 —, a escolha aparece do
   * mesmo jeito (1.8.0): é obrigatória. A TI fica liberada, a Qualidade
   * desabilitada com o motivo, e nenhuma das duas vem marcada.
   */
  const semQualidade = (rotulo: string) => {
    expect(grupo(), rotulo).toBeTruthy();
    expect(radio('TI')?.disabled, rotulo).toBe(false);
    expect(radio('TI')?.checked, rotulo).toBe(false);
    expect(radio('Qualidade')?.disabled, rotulo).toBe(true);
    expect(radio('Qualidade')?.checked, rotulo).toBe(false);
  };

  it('backend sem a rota (404, 405, 422): a escolha aparece, só com a TI liberada', async () => {
    for (const [i, status] of [404, 405, 422].entries()) {
      atendentes.mockRejectedValue(erroHttp(status));
      await remontar(USUARIO, { setor: null });
      expect(atendentes, String(status)).toHaveBeenCalledTimes(i + 1);
      semQualidade(String(status));
      expect(document.body.textContent, String(status)).toContain(
        'A abertura para a Qualidade está indisponível no momento.'
      );
    }
  });

  it('503: só a TI liberada, e sem dizer que faltam atendentes', async () => {
    atendentes.mockRejectedValue(erroHttp(503));
    await montar(USUARIO, { setor: null });
    semQualidade('503');
    expect(document.body.textContent).not.toContain('Nenhum atendente');
    expect(vi.mocked(console.warn)).toHaveBeenCalled();
  });

  it('rede, timeout e 5xx: só a TI liberada', async () => {
    for (const erro of [
      new Error('Network Error'),
      { code: 'ECONNABORTED' },
      erroHttp(500),
      erroHttp(502),
    ]) {
      atendentes.mockRejectedValue(erro);
      await remontar(USUARIO, { setor: null });
      semQualidade(JSON.stringify(erro));
    }
  });

  it('401: só a TI liberada, e o formulário não quebra', async () => {
    atendentes.mockRejectedValue(erroHttp(401));
    await montar(USUARIO);
    expect(radio('Qualidade')?.disabled).toBe(true);
    expect(document.getElementById('titulo')).toBeTruthy();
  });

  it('200 com atendentes: as duas liberadas, e nenhuma marcada', async () => {
    qualidadeDisponivel();
    await montar(USUARIO, { setor: null });
    expect(grupo()?.querySelector('legend')?.textContent).toContain('Setor de atendimento');
    expect(radio('TI')?.checked).toBe(false);
    expect(radio('Qualidade')?.checked).toBe(false);
    expect(radio('Qualidade')?.disabled).toBe(false);
    // Os dois no mesmo grupo nativo: setas do teclado andam entre eles.
    expect(radio('TI')?.name).toBeTruthy();
    expect(radio('TI')?.name).toBe(radio('Qualidade')?.name);
  });

  it('200 vazio: Qualidade aparece desabilitada, com o motivo', async () => {
    qualidadeDisponivel([]);
    await montar(USUARIO);
    const qualidade = radio('Qualidade')!;
    expect(qualidade.disabled).toBe(true);
    expect(document.body.textContent).toContain('Nenhum atendente da Qualidade cadastrado');
    // O motivo está ligado ao rádio, e não só perto dele.
    const ids = qualidade.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids.map((i) => document.getElementById(i)?.textContent).join(' ')).toContain(
      'Nenhum atendente da Qualidade cadastrado'
    );
  });

  it('200 vazio: a TI segue abrindo normalmente', async () => {
    qualidadeDisponivel([]);
    await montar(USUARIO);
    await preencherTI();
    await enviar();
    expect(corpoEnviado().setor_destino).toBe('TI');
    expect(corpoEnviado().titulo).toBe('Impressora do RH sem papel');
  });

  /**
   * A resposta de uma consulta já substituída não escreve nada. O caso real é
   * o `StrictMode` do desenvolvimento: o efeito roda, é limpo e roda de novo
   * NA MESMA instância. A primeira consulta fica pendurada, a segunda responde
   * antes; quando a primeira enfim chega, é ignorada.
   *
   * Remontar o formulário não serviria de prova: o React já descarta o que uma
   * instância desmontada escreve, com ou sem o contador.
   */
  it('resposta de uma consulta substituída é descartada', async () => {
    let soltarPrimeira: (v: never) => void = () => {};
    atendentes
      .mockImplementationOnce(() => new Promise((r) => (soltarPrimeira = r)))
      .mockResolvedValueOnce([]);

    await act(async () => {
      root.render(
        <StrictMode>
          <AuthContext.Provider value={USUARIO}>
            <ThemeProvider>
              <ChamadosProvider>
                <NovoChamadoForm aoCriar={aoCriar} aoCancelar={aoCancelar} />
              </ChamadosProvider>
            </ThemeProvider>
          </AuthContext.Provider>
        </StrictMode>
      );
    });
    expect(atendentes).toHaveBeenCalledTimes(2);
    expect(radio('Qualidade')?.disabled).toBe(true);

    await act(async () => soltarPrimeira(ATENDENTES as never));
    expect(radio('Qualidade')?.disabled).toBe(true);
  });

  it('desmontar com a consulta pendente não quebra nada', async () => {
    let soltar: (v: never) => void = () => {};
    atendentes.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
    const erroDoReact = vi.mocked(console.error);

    await montar(USUARIO);
    act(() => root.unmount());
    await act(async () => soltar(ATENDENTES as never));

    expect(erroDoReact).not.toHaveBeenCalled();
    root = createRoot(host);
  });
});

describe('setor de atendimento — escolha obrigatória (1.8.0)', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('antes da escolha, só ela: nenhum campo do chamado aparece', async () => {
    await montar(USUARIO, { setor: null });
    expect(document.getElementById('titulo')).toBeNull();
    expect(document.getElementById('descricao')).toBeNull();
    expect(document.getElementById('responsavel')).toBeNull();
    expect(document.body.textContent).toContain('Escolha quem vai atender o chamado');
  });

  it('o grupo é obrigatório no navegador: sem setor, nada é enviado', async () => {
    await montar(USUARIO, { setor: null });
    expect(radio('TI')?.required).toBe(true);
    expect(radio('TI')?.validity.valueMissing).toBe(true);
    await enviar();
    expect(criar).not.toHaveBeenCalled();
  });

  it('se o envio passar do navegador sem setor, a tela recusa e não envia', async () => {
    await montar(USUARIO, { setor: null });
    await act(async () => {
      document
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(mensagem()).toBe('Escolha o setor de atendimento.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('o perfil não escolhe: técnico e administrador também começam sem setor', async () => {
    for (const quem of [TECNICO, ADMIN]) {
      await remontar(quem, { setor: null });
      expect(radio('TI')?.checked).toBe(false);
      expect(radio('Qualidade')?.checked).toBe(false);
    }
  });
});

describe('TI com a Qualidade disponível — o corpo não muda', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('Usuario: o mesmo corpo de antes', async () => {
    await montar(USUARIO);
    await preencherTI();
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'TI',
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: undefined,
    });
  });

  it('Administrador: o mesmo corpo de antes', async () => {
    await montar(ADMIN);
    await preencherTI();
    await escolher('solicitante', 'Gabriel');
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'TI',
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: 1,
    });
  });

  it('as mensagens da TI são as de sempre, sem a dica', async () => {
    await montar(ADMIN);
    expect(document.body.textContent).not.toContain('Você fica como técnico responsável.');
    await digitar('titulo', 'Impressor');
    await digitar('descricao', DESCRICAO_OK);
    await enviar();
    expect(mensagem()).toBe('Título precisa de mais 1 caractere.');
    await digitar('titulo', 'Impressora do RH sem papel');
    await enviar();
    expect(mensagem()).toBe('Selecione o solicitante.');
  });
});

describe('modo Qualidade — os campos', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('sem título, sem categoria e sem a dica da TI', async () => {
    await montar(TECNICO);
    await marcar('Qualidade');
    expect(document.getElementById('titulo')).toBeNull();
    expect(document.getElementById('categoria')).toBeNull();
    expect(document.body.textContent).not.toContain('Você fica como técnico responsável.');
  });

  it('descrição e prioridade na tela; prioridade nasce Média', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    expect(document.getElementById('descricao')).toBeTruthy();
    expect(document.getElementById('prioridade')?.textContent).toContain('Média');
  });

  /**
   * 1.9.0: quem abre não escolhe o responsável. O campo saiu — não há
   * seletor, nem rótulo apontando para um —, e os nomes da equipe não
   * aparecem para quem abre.
   */
  it('nenhum seletor de responsável, para nenhum perfil', async () => {
    for (const quem of [USUARIO, TECNICO, ADMIN]) {
      await remontar(quem);
      await marcar('Qualidade');
      const papel = quem.user!.role;
      expect(document.getElementById('responsavel'), papel).toBeNull();
      expect(document.querySelector('label[for="responsavel"]'), papel).toBeNull();
      expect(document.body.textContent, papel).not.toContain('Selecione o responsável');
      expect(document.body.textContent, papel).not.toContain('Ana Qualidade');
      expect(document.body.textContent, papel).not.toContain('Bruno Qualidade');
    }
  });

  it('no lugar do campo, a orientação', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    expect(document.body.textContent).toContain('A equipe da Qualidade definirá o responsável.');
  });

  it('a orientação é da Qualidade: na TI ela não aparece', async () => {
    await montar(USUARIO);
    expect(document.body.textContent).not.toContain('definirá o responsável');
  });

  // T-2: a mesma regra da TI — a criação da Qualidade passa pela mesma
  // linha da API (`is_admin_humano`).
  it('só o administrador humano vê o solicitante', async () => {
    for (const [quem, ve] of [
      [TECNICO, false],
      [ADMIN, true],
    ] as const) {
      await remontar(quem);
      await marcar('Qualidade');
      expect(Boolean(document.getElementById('solicitante')), quem.user!.role).toBe(ve);
    }
  });
});

describe('modo Qualidade — o corpo enviado', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('Usuario: as quatro chaves do contrato, sem título, categoria nem responsável', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();

    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'QUALIDADE',
      descricao: DESCRICAO_Q,
      prioridade: PrioridadeEnum.MEDIA,
      solicitante_id: 7,
    });
    expect('titulo' in corpoEnviado()).toBe(false);
    expect('categoria_id' in corpoEnviado()).toBe(false);
    expect('tecnico_responsavel_id' in corpoEnviado()).toBe(false);
  });

  it('Administrador escolhe o solicitante, e não o responsável', async () => {
    await montar(ADMIN);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await escolher('solicitante', 'Lidisay');
    await escolher('prioridade', PrioridadeEnum.ALTA);
    await enviar();

    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'QUALIDADE',
      descricao: DESCRICAO_Q,
      prioridade: PrioridadeEnum.ALTA,
      solicitante_id: 8,
    });
  });

  /**
   * T-2: o Técnico abre para si, como na TI — é o que a API grava. E não
   * vira responsável do que abriu: na TI o id dele ia no corpo (dívida
   * registrada); na Qualidade, nem isso.
   */
  it('Técnico manda o próprio id como solicitante, e não se atribui', async () => {
    await montar(TECNICO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    expect(document.getElementById('solicitante')).toBeNull();
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'QUALIDADE',
      descricao: DESCRICAO_Q,
      prioridade: PrioridadeEnum.MEDIA,
      solicitante_id: 3,
    });
  });

  it('título e categoria digitados antes na TI não vão junto', async () => {
    await montar(USUARIO);
    await preencherTI();
    await escolher('categoria', 'Impressoras');
    await marcar('Qualidade');
    await enviar();
    expect(Object.keys(corpoEnviado()).sort()).toEqual(
      ['descricao', 'prioridade', 'setor_destino', 'solicitante_id'].sort()
    );
  });

  it('201: devolve o chamado e põe no topo da lista do contexto', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();
    expect(aoCriar).toHaveBeenCalledWith(CRIADO);
    expect(naLista[0]).toBe(99);
  });
});

describe('modo Qualidade — validação', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('descrição curta: a mensagem da TI', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', 'Parou de novo');
    await enviar();
    expect(mensagem()).toBe('Descrição precisa de mais 7 caracteres.');
    expect(criar).not.toHaveBeenCalled();
  });

  /** 1.9.0: não há mais "Selecione o responsável." — a descrição basta. */
  it('descrição boa basta: abre sem pedir responsável', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();
    expect(mensagem()).toBeNull();
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('o administrador sem solicitante: "Selecione o solicitante."', async () => {
    await montar(ADMIN);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
    await enviar();
    expect(mensagem()).toBe('Selecione o solicitante.');
    expect(criar).not.toHaveBeenCalled();
  });
});

describe('alternância entre TI e Qualidade', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  it('descrição e prioridade atravessam; título e categoria esperam na TI', async () => {
    await montar(USUARIO);
    await preencherTI();
    await escolher('categoria', 'Impressoras');
    await escolher('prioridade', PrioridadeEnum.ALTA);

    await marcar('Qualidade');
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_OK);
    expect(document.getElementById('prioridade')?.textContent).toContain('Alta');

    await marcar('TI');
    expect((document.getElementById('titulo') as HTMLInputElement).value).toBe(
      'Impressora do RH sem papel'
    );
    expect(document.getElementById('categoria')?.textContent).toContain('Impressoras');
  });

  it('trocar de setor apaga a mensagem de erro', async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', 'Parou de novo');
    await enviar();
    expect(mensagem()).toBe('Descrição precisa de mais 7 caracteres.');
    await marcar('TI');
    expect(mensagem()).toBeNull();
  });

  it('voltar para TI e enviar manda o corpo da TI, sem nada da Qualidade', async () => {
    await montar(USUARIO);
    await preencherTI();
    await marcar('Qualidade');
    await marcar('TI');
    await enviar();
    expect(corpoEnviado()).toStrictEqual({
      setor_destino: 'TI',
      solicitante_id: 7,
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
      prioridade: PrioridadeEnum.MEDIA,
      categoria_id: undefined,
      tecnico_responsavel_id: undefined,
    });
  });
});

describe('modo Qualidade — erros do envio', () => {
  beforeEach(() => {
    qualidadeDisponivel();
  });

  const SEM_TECNICOS = 'Não há técnico da Qualidade disponível para receber chamados no momento';

  const prontoParaEnviar = async () => {
    await montar(USUARIO);
    await marcar('Qualidade');
    await digitar('descricao', DESCRICAO_Q);
  };

  /**
   * API-14: a Qualidade ficou sem ninguém elegível entre a consulta e o
   * envio. A mensagem é a da API; a consulta refeita desabilita o setor, com
   * o motivo; o texto fica, e nada é reenviado — nem para a TI.
   */
  it('409 sem técnicos: o detail, a consulta refeita, o texto guardado e o envio travado', async () => {
    criar.mockRejectedValueOnce(erroHttp(409, SEM_TECNICOS));
    await prontoParaEnviar();
    atendentes.mockResolvedValue([]);
    await enviar();

    expect(mensagem()).toBe(SEM_TECNICOS);
    expect(atendentes).toHaveBeenCalledTimes(2);
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_Q);
    expect(radio('Qualidade')?.disabled).toBe(true);
    expect(document.body.textContent).toContain('Nenhum atendente da Qualidade cadastrado');

    expect(botao('Abrir chamado')?.disabled).toBe(true);
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
    expect(corpoEnviado().setor_destino).toBe('QUALIDADE');
  });

  it('409 sem técnicos: a TI abre em seguida, por escolha, com o texto guardado', async () => {
    criar.mockRejectedValueOnce(erroHttp(409, SEM_TECNICOS));
    await montar(USUARIO);
    await preencherTI();
    await marcar('Qualidade');
    atendentes.mockResolvedValue([]);
    await enviar();

    await marcar('TI');
    await enviar();
    expect(criar).toHaveBeenCalledTimes(2);
    expect(corpoEnviado()).toMatchObject({
      setor_destino: 'TI',
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
    });
  });

  /** A equipe voltou a ter gente: a consulta refeita deixa a Qualidade de pé. */
  it('409 e a consulta refeita ainda traz atendentes: nada trava, e nada é repetido', async () => {
    criar.mockRejectedValueOnce(erroHttp(409, SEM_TECNICOS));
    await prontoParaEnviar();
    await enviar();

    expect(mensagem()).toBe(SEM_TECNICOS);
    expect(criar).toHaveBeenCalledTimes(1);
    expect(radio('Qualidade')?.disabled).toBe(false);
    expect(botao('Abrir chamado')?.disabled).toBe(false);

    // A nova tentativa é um clique novo.
    await enviar();
    expect(criar).toHaveBeenCalledTimes(2);
  });

  it('400: mostra o detail, refaz a consulta e guarda o texto', async () => {
    criar.mockRejectedValueOnce(erroHttp(400, 'Solicitante não encontrado'));
    await prontoParaEnviar();
    await enviar();

    expect(mensagem()).toBe('Solicitante não encontrado');
    expect(atendentes).toHaveBeenCalledTimes(2);
    expect(criar).toHaveBeenCalledTimes(1);
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_Q);
  });

  it('422: o texto já normalizado pelo interceptor', async () => {
    criar.mockRejectedValueOnce(
      erroHttp(422, 'descricao: String should have at least 20 characters')
    );
    await prontoParaEnviar();
    await enviar();
    expect(mensagem()).toBe('descricao: String should have at least 20 characters');
    expect(atendentes).toHaveBeenCalledTimes(1);
  });

  /**
   * A Qualidade foi desligada entre a consulta e o envio. Nada vira TI: a
   * tentativa fica parada, com o texto, até a pessoa escolher TI.
   */
  it('503: mensagem clara, nada reenviado para a TI, e o envio da Qualidade trava', async () => {
    criar.mockRejectedValueOnce(
      erroHttp(503, 'Abertura de chamados para a Qualidade não está disponível neste ambiente')
    );
    await prontoParaEnviar();
    await enviar();

    expect(mensagem()).toBe(
      'A abertura para a Qualidade ficou indisponível. Abra para a TI ou tente mais tarde.'
    );
    expect(criar).toHaveBeenCalledTimes(1);
    expect(corpoEnviado().setor_destino).toBe('QUALIDADE');
    expect((document.getElementById('descricao') as HTMLTextAreaElement).value).toBe(DESCRICAO_Q);

    // Continua no modo Qualidade, e não envia de novo.
    expect(radio('Qualidade')?.checked).toBe(true);
    expect(botao('Abrir chamado')?.disabled).toBe(true);
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
  });

  it('503: escolher TI é consciente, e a TI abre com o texto guardado', async () => {
    criar.mockRejectedValueOnce(erroHttp(503));
    await montar(USUARIO);
    await preencherTI();
    await marcar('Qualidade');
    await enviar();

    await marcar('TI');
    // Com a Qualidade fora, ela fica desabilitada, e a TI segue escolhida.
    expect(radio('Qualidade')?.disabled).toBe(true);
    expect(radio('TI')?.checked).toBe(true);
    expect(botao('Abrir chamado')?.disabled).toBe(false);
    await enviar();
    expect(corpoEnviado()).toMatchObject({
      titulo: 'Impressora do RH sem papel',
      descricao: DESCRICAO_OK,
    });
    expect(corpoEnviado().setor_destino).toBe('TI');
  });

  it('409 que recarrega para 503: o envio da Qualidade trava sem virar TI', async () => {
    criar.mockRejectedValueOnce(erroHttp(409, SEM_TECNICOS));
    await prontoParaEnviar();
    atendentes.mockRejectedValue(erroHttp(503));
    await enviar();

    expect(radio('Qualidade')?.checked).toBe(true);
    expect(botao('Abrir chamado')?.disabled).toBe(true);
    await enviar();
    expect(criar).toHaveBeenCalledTimes(1);
  });
});
