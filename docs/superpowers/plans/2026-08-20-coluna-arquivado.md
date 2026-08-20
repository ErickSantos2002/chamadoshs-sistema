# Coluna e estado "Arquivado" no quadro — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o chamado arquivado aparecer no quadro numa coluna própria, atrás de um interruptor, em vez de sumir da tela continuando com status "Aberto".

**Architecture:** Nenhum status novo no banco. A marca `arquivado`, que já existe no `Chamado` e já tem endpoints na API, passa a ser tratada pelo front como um destino no quadro. O contexto carrega os arquivados, uma função pura decide a coluna de cada chamado (a marca ganha do status), e um interruptor local na página abre a quinta coluna.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind, Vitest. Sem dependência nova.

## Global Constraints

- **Idioma:** todo código, comentário, nome de variável e texto de interface em português do Brasil, seguindo o que já existe no repositório.
- **Sem mudança na API:** nenhum arquivo fora de `src/` e `package.json`. Nada de migration.
- **Cores:** proibido acrescentar chave em `STATUS_CLARO` ou `STATUS_ESCURO` em `src/lib/graficos.ts`. `npm run validar:paleta` roda no build e reprova cor nova que não passe em ΔE >= 20 contra todas as outras, em quatro tipos de visão.
- **Um fundo por elemento:** `src/estilos.test.ts` reprova qualquer `className` estático com duas classes `bg-*` sem variante. Ao mexer em classe, substituir — nunca acrescentar ao lado.
- **Versão:** a entrega termina em 1.6.15. `package.json` e `src/data/novidades.ts` sobem no MESMO commit — `src/data/novidades.test.ts` reprova se a primeira entrada da lista não for igual à versão do pacote.
- **Comando de teste:** `npm test` (vitest run). Um arquivo só: `npx vitest run <caminho>`.
- **Checagem de tipos:** `npm run typecheck`.

---

### Task 1: A regra de agrupamento vira função pura

Hoje a regra vive num `useMemo` dentro de `src/pages/Chamados.tsx:117-142`, onde nenhum teste alcança. A ordem das checagens é a correção inteira desta entrega, então ela precisa de teste.

**Files:**
- Create: `src/lib/quadro.ts`
- Test: `src/lib/quadro.test.ts`

**Interfaces:**
- Consumes: `Chamado` e `StatusEnum` de `src/types/api.ts`.
- Produces:
  - `type ColunaDoQuadro = 'Aberto' | 'Em Andamento' | 'Aguardando' | 'Resolvido' | 'arquivado'`
  - `const COLUNAS_DO_QUADRO: ColunaDoQuadro[]` — a ordem em que as colunas aparecem na tela.
  - `function agruparPorColuna(chamados: Chamado[]): Record<ColunaDoQuadro, Chamado[]>`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/quadro.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { agruparPorColuna } from './quadro';
import { Chamado, StatusEnum } from '../types/api';

/**
 * A regressão que este arquivo existe para impedir: arquivar um chamado só
 * liga a marca `arquivado` — o status dele continua sendo o que era, quase
 * sempre "Aberto". Se o agrupamento olhar o status antes da marca, o chamado
 * arquivado volta a aparecer na coluna Aberto, que é o defeito relatado.
 */
const chamadoDe = (
  id: number,
  status: StatusEnum,
  arquivado = false
): Chamado => ({ id, status, arquivado, titulo: `Chamado ${id}` }) as Chamado;

describe('agruparPorColuna', () => {
  it('manda o arquivado para a coluna dele, não para a do status', () => {
    const grupos = agruparPorColuna([chamadoDe(1, StatusEnum.ABERTO, true)]);

    expect(grupos.arquivado.map((c) => c.id)).toEqual([1]);
    expect(grupos['Aberto']).toEqual([]);
  });

  // A marca ganha de QUALQUER status, não só de Aberto.
  it('manda o arquivado resolvido para a coluna do arquivado', () => {
    const grupos = agruparPorColuna([chamadoDe(2, StatusEnum.RESOLVIDO, true)]);

    expect(grupos.arquivado.map((c) => c.id)).toEqual([2]);
    expect(grupos['Resolvido']).toEqual([]);
  });

  // Fechado não tem coluna própria no quadro: é o mesmo fim de linha que
  // Resolvido, e duas colunas dizendo a mesma coisa só dividem a atenção.
  it('junta Fechado com Resolvido', () => {
    const grupos = agruparPorColuna([
      chamadoDe(3, StatusEnum.FECHADO),
      chamadoDe(4, StatusEnum.RESOLVIDO),
    ]);

    expect(grupos['Resolvido'].map((c) => c.id)).toEqual([4, 3]);
  });

  it('põe cada chamado ativo na coluna do próprio status', () => {
    const grupos = agruparPorColuna([
      chamadoDe(5, StatusEnum.ABERTO),
      chamadoDe(6, StatusEnum.EM_ANDAMENTO),
      chamadoDe(7, StatusEnum.AGUARDANDO),
    ]);

    expect(grupos['Aberto'].map((c) => c.id)).toEqual([5]);
    expect(grupos['Em Andamento'].map((c) => c.id)).toEqual([6]);
    expect(grupos['Aguardando'].map((c) => c.id)).toEqual([7]);
  });

  // Mais recente em cima: o id é crescente e serve de relógio.
  it('ordena cada coluna do id maior para o menor', () => {
    const grupos = agruparPorColuna([
      chamadoDe(10, StatusEnum.ABERTO),
      chamadoDe(30, StatusEnum.ABERTO),
      chamadoDe(20, StatusEnum.ABERTO),
    ]);

    expect(grupos['Aberto'].map((c) => c.id)).toEqual([30, 20, 10]);
  });

  it('devolve toda coluna, mesmo vazia, para a tela não quebrar', () => {
    const grupos = agruparPorColuna([]);

    expect(Object.keys(grupos).sort()).toEqual(
      ['Aberto', 'Aguardando', 'Em Andamento', 'Resolvido', 'arquivado'].sort()
    );
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Rodar: `npx vitest run src/lib/quadro.test.ts`

Esperado: FALHA — não resolve o módulo `./quadro`.

- [ ] **Step 3: Escrever a implementação mínima**

Criar `src/lib/quadro.ts`:

```typescript
import { Chamado, StatusEnum } from '../types/api';

/**
 * As colunas do quadro de chamados.
 *
 * Não é o mesmo conjunto que `StatusEnum`, e a diferença é o ponto deste
 * arquivo. Duas divergências, cada uma por um motivo:
 *
 *   Fechado não tem coluna. É o mesmo fim de linha que Resolvido, e duas
 *   colunas dizendo a mesma coisa só dividem a atenção de quem olha o quadro.
 *
 *   `arquivado` tem coluna e não é status nenhum. Arquivar liga uma marca no
 *   chamado; o status dele continua o que era, quase sempre "Aberto". Sem uma
 *   coluna própria, o chamado arquivado ou some da tela ou reaparece como
 *   aberto — foram os dois defeitos que esta divisão veio consertar.
 *
 * Em minúscula justamente porque não é status: as outras quatro chaves são o
 * valor literal de `StatusEnum` e esta não tem par lá.
 */
export type ColunaDoQuadro =
  | 'Aberto'
  | 'Em Andamento'
  | 'Aguardando'
  | 'Resolvido'
  | 'arquivado';

/** A ordem em que as colunas aparecem, da entrada até a saída do fluxo. */
export const COLUNAS_DO_QUADRO: ColunaDoQuadro[] = [
  'Aberto',
  'Em Andamento',
  'Aguardando',
  'Resolvido',
  'arquivado',
];

/**
 * Separa os chamados nas colunas do quadro.
 *
 * A ordem das checagens é a regra, não detalhe de escrita: a marca `arquivado`
 * é consultada ANTES do status. Invertendo as duas linhas, todo chamado
 * arquivado volta a cair na coluna do status que ele tinha quando foi
 * arquivado — o defeito original, de volta, sem nada quebrar visivelmente.
 *
 * Devolve todas as colunas mesmo vazias: a tela desenha uma coluna por chave e
 * uma chave ausente viraria `undefined.length`.
 */
export function agruparPorColuna(
  chamados: Chamado[]
): Record<ColunaDoQuadro, Chamado[]> {
  const grupos = {
    'Aberto': [],
    'Em Andamento': [],
    'Aguardando': [],
    'Resolvido': [],
    'arquivado': [],
  } as Record<ColunaDoQuadro, Chamado[]>;

  for (const chamado of chamados) {
    if (chamado.arquivado) {
      grupos.arquivado.push(chamado);
    } else if (chamado.status === StatusEnum.FECHADO) {
      grupos['Resolvido'].push(chamado);
    } else {
      grupos[chamado.status as ColunaDoQuadro].push(chamado);
    }
  }

  // Mais recente em cima. O id é crescente e serve de relógio.
  for (const coluna of COLUNAS_DO_QUADRO) {
    grupos[coluna].sort((a, b) => b.id - a.id);
  }

  return grupos;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Rodar: `npx vitest run src/lib/quadro.test.ts`

Esperado: 6 testes PASSAM.

- [ ] **Step 5: Conferir os tipos**

Rodar: `npm run typecheck`

Esperado: sem saída de erro.

- [ ] **Step 6: Commitar**

```bash
git add src/lib/quadro.ts src/lib/quadro.test.ts
git commit -m "refactor(quadro): a regra de coluna vira funcao pura e testada

Arquivar so liga uma marca: o status do chamado continua o que era. Quem
decide a coluna precisa consultar a marca ANTES do status, e essa ordem
estava num useMemo onde nenhum teste alcanca."
```

---

### Task 2: O quadro passa a receber os arquivados da API

`ChamadosContext.carregarChamados` monta os parâmetros sem `incluir_arquivados`, e a API omite os arquivados por padrão. É por isso que o chamado arquivado simplesmente some do quadro.

Seguro de mudar: `src/pages/Chamados.tsx` é o único consumidor da lista `chamados` do contexto. `Dashboard.tsx` e `TarefasRecorrentes.tsx` só leem `categorias` de lá, e o Dashboard já carrega a própria lista com `incluir_arquivados: true`.

**Files:**
- Modify: `src/context/ChamadosContext.tsx:73-98` (dentro de `carregarChamados`)
- Test: `src/context/ChamadosContext.test.tsx` (acrescentar um `describe` no fim)

**Interfaces:**
- Consumes: `chamadosService.listarTodos(params)` de `src/services/chamadoshsapi.ts`, que aceita `ChamadosQueryParams` — o tipo já inclui `incluir_arquivados?: boolean`.
- Produces: nada de novo. A lista `chamados` do contexto passa a conter também os arquivados.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao FINAL de `src/context/ChamadosContext.test.tsx`, depois dos `describe` que já existem. O arquivo já tem um `beforeEach` que espiona `chamadosService.listarTodos` e já renderiza o provider — este teste só lê os argumentos daquela chamada.

`calls[0]` é a chamada DESTE teste, não de um anterior: o `vite.config.ts` liga `restoreMocks: true`, então o espião é desfeito ao fim de cada teste e recriado pelo `beforeEach`. `vi`, `describe`, `it` e `expect` já estão importados no topo do arquivo.

```typescript
/**
 * O quadro precisa RECEBER os arquivados para poder mostrá-los numa coluna
 * própria. Sem este parâmetro a API os omite, e o chamado arquivado some da
 * tela — não existe filtro no front capaz de trazer de volta o que nunca
 * chegou.
 */
describe('carregarChamados', () => {
  it('pede os arquivados à API', () => {
    const [params] = vi.mocked(chamadosService.listarTodos).mock.calls[0];

    expect(params).toMatchObject({ incluir_arquivados: true });
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Rodar: `npx vitest run src/context/ChamadosContext.test.tsx`

Esperado: FALHA no teste novo — o objeto recebido não tem `incluir_arquivados`. Os testes que já existiam continuam passando.

- [ ] **Step 3: Escrever a implementação mínima**

Em `src/context/ChamadosContext.tsx`, dentro de `carregarChamados`, trocar:

```typescript
      const params: any = {};

      // Usuários comuns só veem seus próprios chamados
      if (user.role === 'Usuario') {
        params.solicitante_id = user.id;
      }
```

por:

```typescript
      // Os arquivados vêm junto e o quadro decide o que mostrar. Sem este
      // parâmetro a API os omite, e o chamado arquivado some da tela: nenhum
      // filtro no front traz de volta o que não chegou.
      const params: any = { incluir_arquivados: true };

      // Usuários comuns só veem seus próprios chamados
      if (user.role === 'Usuario') {
        params.solicitante_id = user.id;
      }
```

- [ ] **Step 4: Rodar os testes e ver passar**

Rodar: `npx vitest run src/context/ChamadosContext.test.tsx`

Esperado: todos PASSAM.

- [ ] **Step 5: Commitar**

```bash
git add src/context/ChamadosContext.tsx src/context/ChamadosContext.test.tsx
git commit -m "fix(quadro): o chamado arquivado volta a chegar na tela

A API omite arquivados por padrao e o contexto nunca pediu o contrario.
Arquivar fazia o chamado desaparecer, sem caminho nenhum de volta."
```

---

### Task 3: O selo "Arquivado" no card

Para que o card diga o que ele é mesmo quando a coluna não está à vista como contexto — numa busca, por exemplo. A palavra e a variante são as mesmas que `ChamadoModal.tsx:358` já usa: o card e a janela não podem discordar sobre o mesmo chamado.

**Files:**
- Modify: `src/components/KanbanColumn.tsx:126-141` (a linha de selos do card)

**Interfaces:**
- Consumes: `Badge` de `./ui` (já importado no arquivo, linha 5); `chamado.arquivado` de `Chamado`.
- Produces: nada. Sem props novas em `KanbanColumnProps`.

- [ ] **Step 1: Acrescentar o selo**

Em `src/components/KanbanColumn.tsx`, no bloco de selos do card, entre o selo de prioridade e o de "Avaliar". O bloco fica assim:

```tsx
                  <Badge variante={VARIANTE_PRIORIDADE[chamado.prioridade]}>
                    {chamado.prioridade}
                  </Badge>

                  {/* Mesma palavra e mesma variante que a janela do chamado
                      usa. Dentro da coluna "Arquivado" o selo é redundante, e
                      tudo bem: ele existe para quando o card aparece numa
                      busca, onde a coluna não está à vista como contexto. */}
                  {chamado.arquivado && (
                    <Badge variante="neutro">Arquivado</Badge>
                  )}

                  {precisaAvaliar(chamado, usuarioLogadoId) && (
                    <Badge variante="alerta">
                      <IconeEstrela className="h-3 w-3" aria-hidden="true" />
                      Avaliar
                    </Badge>
                  )}
```

- [ ] **Step 2: Conferir os tipos**

Rodar: `npm run typecheck`

Esperado: sem saída de erro.

- [ ] **Step 3: Rodar a suíte inteira**

Rodar: `npm test`

Esperado: tudo PASSA. Em especial `src/estilos.test.ts`, que reprovaria um `className` com dois fundos — o selo não traz `className`, então não há disputa.

- [ ] **Step 4: Commitar**

```bash
git add src/components/KanbanColumn.tsx
git commit -m "feat(quadro): o card arquivado se identifica como arquivado

Mesma palavra e mesma variante da janela do chamado. Serve para quando o
card aparece fora da coluna dele, numa busca."
```

---

### Task 4: O interruptor e a quinta coluna

O coração da entrega. A página passa a usar `agruparPorColuna` da Task 1, ganha o interruptor "Mostrar arquivados" e a coluna correspondente.

**Files:**
- Modify: `src/pages/Chamados.tsx` — imports (linhas 1-14), estado (linhas 37-52), filtro (linhas 100-115), agrupamento (linhas 117-142), cabeçalho (linhas 176-232), grade de colunas (linhas 312-362)

**Interfaces:**
- Consumes: `agruparPorColuna` de `../lib/quadro` (Task 1); `corDoStatus` de `../lib/graficos` (já importado, linha 170 do arquivo original); `cn` de `../lib/utils`; `Button` de `../components/ui` (já importado); `IconeArquivar` de `../components/ui/icones`, que já existe em `icones.tsx:277`.
- Produces: nada consumido por outra task.

- [ ] **Step 1: Trocar os imports**

Em `src/pages/Chamados.tsx`, acrescentar depois do import de `graficos`:

```typescript
import { agruparPorColuna } from '../lib/quadro';
import { cn } from '../lib/utils';
```

E acrescentar `IconeArquivar` ao import de ícones, que hoje é:

```typescript
import { IconeAgenda, IconeBusca, IconeCarregando, IconeConfereCirculo, IconeMais } from '../components/ui/icones';
```

passando a:

```typescript
import { IconeAgenda, IconeArquivar, IconeBusca, IconeCarregando, IconeConfereCirculo, IconeMais } from '../components/ui/icones';
```

`StatusEnum` continua importado — o resto do arquivo ainda o usa. Se ao final o TypeScript acusar import não utilizado, remover apenas o que ele apontar.

- [ ] **Step 2: Acrescentar o estado do interruptor**

Logo depois de `const [busca, setBusca] = useState('');`, inserir:

```typescript
  /**
   * O arquivo não é etapa do atendimento e não pode disputar espaço com o
   * trabalho do dia: fica atrás de um interruptor, desligado por padrão.
   *
   * Sem persistir de propósito. Quem foi consultar um arquivado consultou uma
   * vez; deixar a coluna aberta para a próxima visita cobraria dessa pessoa
   * lembrar de fechá-la.
   */
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
```

- [ ] **Step 3: Aplicar o escopo antes dos filtros**

`chamados` agora chega com os arquivados dentro (Task 2). Se o interruptor está desligado eles não contam para nada — nem para o "N chamados" do cabeçalho.

Substituir o bloco que hoje começa em `const chamadosFiltrados = chamados.filter((chamado) => {` por:

```typescript
  // O interruptor define o ESCOPO do quadro, aplicado antes dos filtros. Sem
  // isso o cabeçalho contaria cards que não estão na tela: `chamados` traz os
  // arquivados desde que o contexto passou a pedi-los à API.
  const chamadosNoEscopo = useMemo(
    () => (mostrarArquivados ? chamados : chamados.filter((c) => !c.arquivado)),
    [chamados, mostrarArquivados]
  );

  // Filtra os chamados localmente. A busca cobre título e protocolo: quem
  // lembra do assunto raramente lembra do número.
  const chamadosFiltrados = chamadosNoEscopo.filter((chamado) => {
    if (filtroPrioridade && chamado.prioridade !== filtroPrioridade) return false;
    if (filtroCategoria && chamado.categoria_id !== filtroCategoria) return false;

    if (busca) {
      const termo = busca.toLowerCase();
      const casa =
        chamado.protocolo.toLowerCase().includes(termo) ||
        chamado.titulo.toLowerCase().includes(termo);
      if (!casa) return false;
    }

    return true;
  });
```

- [ ] **Step 4: Usar a função pura no agrupamento**

Substituir o `useMemo` inteiro de `chamadosPorStatus` — o bloco que começa no comentário `// Agrupa chamados por status para o layout Kanban` e termina em `}, [chamadosFiltrados]);` — por:

```typescript
  // A regra de qual coluna cada chamado ocupa vive em `lib/quadro`, com teste.
  // A ordem lá é a correção: a marca `arquivado` é consultada antes do status.
  const chamadosPorColuna = useMemo(
    () => agruparPorColuna(chamadosFiltrados),
    [chamadosFiltrados]
  );
```

- [ ] **Step 5: Ajustar a contagem do cabeçalho**

No parágrafo abaixo do título, trocar `chamados.length` por `chamadosNoEscopo.length` nos dois lugares:

```tsx
              <p className="text-sm text-conteudo-tenue">
                {chamadosFiltrados.length === chamadosNoEscopo.length
                  ? `${chamadosNoEscopo.length} chamados`
                  : `${chamadosFiltrados.length} de ${chamadosNoEscopo.length} chamados`}
              </p>
```

- [ ] **Step 6: Acrescentar o interruptor ao cabeçalho**

Entre o `Seletor` de categoria e o bloco `{temFiltro && (`, inserir. Sem trava por perfil, de propósito: o usuário comum só encontra os próprios arquivados porque o quadro dele já vem recortado por `solicitante_id` no contexto. Arquivar e desarquivar continuam sendo ação de técnico e administrador — isto aqui é só visibilidade.

```tsx
              {/* Não entra em `temFiltro` nem em "Limpar": não é recorte da
                  lista, é uma coluna a mais. Limpar filtro fechando a coluna
                  que a pessoa acabou de abrir seria surpresa, não limpeza. */}
              <Button
                variante={mostrarArquivados ? 'secundario' : 'fantasma'}
                tamanho="sm"
                aria-pressed={mostrarArquivados}
                onClick={() => setMostrarArquivados((antes) => !antes)}
              >
                <IconeArquivar className="h-4 w-4" aria-hidden="true" />
                {mostrarArquivados ? 'Ocultar arquivados' : 'Mostrar arquivados'}
              </Button>
```

- [ ] **Step 7: Trocar a grade e as colunas**

Substituir a `<div>` da grade e as quatro `<KanbanColumn>` dentro dela. O comentário `{/* Kanban - 4 colunas ... */}` logo acima também sai. O bloco novo, do comentário até o `</div>` que fecha a grade:

```tsx
        {/* Kanban. Quatro colunas de fluxo; a quinta, o arquivo, só entra
            quando pedida — ela só cresce, e sem interruptor apertaria as
            outras quatro para sempre. */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2',
            mostrarArquivados ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
          )}
        >

          {/* === COLUNA ABERTO === */}
          <KanbanColumn
            title="Aberto"
            descricao="Aguardando atendimento"
            colorDot={corDoStatus("Aberto", darkMode)}
            items={chamadosPorColuna['Aberto']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === EM ANDAMENTO === */}
          <KanbanColumn
            title="Em Andamento"
            descricao="Técnico trabalhando no chamado"
            colorDot={corDoStatus("Em Andamento", darkMode)}
            items={chamadosPorColuna['Em Andamento']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === AGUARDANDO === */}
          <KanbanColumn
            title="Aguardando"
            descricao="Relógio de SLA pausado"
            colorDot={corDoStatus("Aguardando", darkMode)}
            items={chamadosPorColuna['Aguardando']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === RESOLVIDO (inclui Fechados) === */}
          <KanbanColumn
            title="Resolvido"
            descricao="Finalizado com sucesso"
            colorDot={corDoStatus("Resolvido", darkMode)}
            items={chamadosPorColuna['Resolvido']}
            usuarios={usuarios}
            categorias={categorias}
            aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
            usuarioLogadoId={user?.id}
          />

          {/* === ARQUIVADO ===
              `corDoStatus` não conhece "Arquivado" e devolve o cinza neutro de
              fallback. É de propósito, por dois motivos que se somam: as quatro
              cores de status passam pela conta de ΔE >= 20 do `validar:paleta`,
              e uma quinta cor viva teria que ser calculada contra todas elas em
              quatro tipos de visão. E cinza neutro é o que "fora do fluxo"
              significa — arquivado não é uma etapa do atendimento. */}
          {mostrarArquivados && (
            <KanbanColumn
              title="Arquivado"
              descricao="Fora do fluxo, guardado para consulta"
              colorDot={corDoStatus("Arquivado", darkMode)}
              items={chamadosPorColuna['arquivado']}
              usuarios={usuarios}
              categorias={categorias}
              aoAbrir={(chamado) => setChamadoAberto(chamado.id)}
              usuarioLogadoId={user?.id}
            />
          )}
        </div>
```

- [ ] **Step 8: Conferir os tipos**

Rodar: `npm run typecheck`

Esperado: sem saída de erro. Se acusar `StatusEnum` importado e não usado, remover só ele do import.

- [ ] **Step 9: Rodar a suíte inteira**

Rodar: `npm test`

Esperado: tudo PASSA.

- [ ] **Step 10: Conferir na tela**

Rodar: `npm run dev` e abrir a página de chamados. Conferir, nesta ordem:

1. Com o interruptor desligado, o quadro tem 4 colunas e o cabeçalho diz "N chamados" — o mesmo N de antes desta entrega.
2. Clicar em "Mostrar arquivados": aparece a quinta coluna, com ponto cinza, e o cabeçalho passa a contar os arquivados junto.
3. **Verificação principal:** um chamado arquivado que tenha status "Aberto" está na coluna Arquivado, NÃO na Aberto.
4. O card arquivado mostra o selo "Arquivado".
5. Clicar em "Ocultar arquivados": volta a 4 colunas.
6. Repetir nos dois temas, claro e escuro.

- [ ] **Step 11: Commitar**

```bash
git add src/pages/Chamados.tsx
git commit -m "feat(quadro): coluna propria para os chamados arquivados

O arquivado tinha sumido da tela sem sair do status Aberto. Agora um
interruptor no cabecalho abre a quinta coluna, e a marca ganha do status
na hora de decidir onde o card fica.

O interruptor fica fora de 'Limpar filtros' de proposito: e uma coluna a
mais, nao um recorte da lista."
```

---

### Task 5: Fechar a entrega na 1.6.15

O aviso "O que há de novo?" abre sozinho quando a versão muda. Sem subir a versão, a entrega vai para produção e ninguém fica sabendo — que é o problema que o aviso existe para resolver.

Os dois arquivos vão no MESMO commit: `src/data/novidades.test.ts` reprova se a primeira entrada da lista não for igual à versão do `package.json`.

**Files:**
- Modify: `package.json:3` (campo `version`)
- Modify: `src/data/novidades.ts` (nova primeira entrada de `NOVIDADES`)

**Interfaces:**
- Consumes: o tipo `VersaoNovidade` já declarado em `src/data/novidades.ts`.
- Produces: nada.

- [ ] **Step 1: Subir a versão**

Em `package.json`, trocar `"version": "1.6.14",` por `"version": "1.6.15",`.

- [ ] **Step 2: Escrever a entrada do aviso**

Em `src/data/novidades.ts`, inserir como PRIMEIRO item de `NOVIDADES`, antes da entrada `1.6.14`:

```typescript
  {
    versao: '1.6.15',
    data: '2026-08-20',
    itens: [
      {
        tipo: 'novidade',
        texto:
          'Chamado arquivado agora tem coluna própria no quadro. O botão "Mostrar arquivados", no alto da tela, abre a coluna quando você precisa consultar algo antigo — e ela some de novo quando você fecha. Antes o arquivado simplesmente desaparecia do quadro, sem jeito de encontrar de volta.',
      },
    ],
  },
```

O texto é para quem abre chamado, não para quem programa: nada de "marca", "contexto" ou "parâmetro". O teste exige mais de 30 caracteres por item.

- [ ] **Step 3: Rodar os testes que amarram os dois arquivos**

Rodar: `npx vitest run src/data/novidades.test.ts`

Esperado: PASSAM — em especial "a primeira entrada corresponde à versão em execução" e "está em ordem decrescente de versão".

- [ ] **Step 4: Rodar o build completo**

Rodar: `npm run build`

Esperado: `validar:paleta` passa, `tsc --noEmit` passa, o Vite gera o `dist`. Este é o portão que pegaria cor nova na paleta — não deve haver nenhuma.

- [ ] **Step 5: Rodar a suíte inteira uma última vez**

Rodar: `npm test`

Esperado: tudo PASSA.

- [ ] **Step 6: Commitar**

```bash
git add package.json src/data/novidades.ts
git commit -m "chore(release): 1.6.15 com a coluna de arquivados

Versao e aviso de novidades sobem juntos: e a versao que decide quando o
'O que ha de novo?' abre sozinho."
```

---

## Fora de escopo

Levantados no desenho e deliberadamente deixados de fora:

- Opção "Arquivados" no seletor de Status do Dashboard.
- Contagem de arquivados ocultos no cabeçalho do quadro.
- Tratamento equivalente para chamados cancelados.
- Qualquer status novo no enum da API.
