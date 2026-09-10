# Fase 11 — template de LISTAGEM: `CategoriasTab`

Checklist da §29, preenchido antes e depois, lendo o **código** e não a tela.

`CategoriasTab` é o template de listagem porque `SetoresTab` e `UsuariosTab`
são cópias estruturais dela — o que se decidir aqui transfere direto, e o que
se errar aqui se repete três vezes.

## Como cada item foi conferido

A página vive atrás do login, o login depende da API, e o front rodando sozinho
não passa da tela de entrada. Então a conferência é por **teste montado no
jsdom** (`CategoriasTab.test.tsx`, 14 casos), e não por passagem de olho no
navegador — que é o que a §29 permite e, aqui, o que sobra.

O teste é melhor para o que a §29 quer: uma conferência manual prova o dia em
que foi feita; este roda de novo quando as outras duas abas forem migradas.

Dois itens não são verificáveis por ele e foram por outro caminho, dito em cada
linha abaixo.

## O checklist

```text
Página: /cadastros (aba Categorias) — src/components/cadastros/CategoriasTab.tsx

ANTES                                                          DEPOIS
[x] carrega dados (useCadastros → categorias)                   [x] inalterado
[x] filtra — não há filtro além da busca                        [x] inalterado
[x] busca (nome e descrição, useMemo)                           [x] teste cobre os dois campos
[ ] pagina — não existe                                         [ ] continua não existindo
[x] ordena (id, nome, created_at, asc/desc)                     [x] + aria-sort declarado
[x] cria (modal, só Administrador/Tecnico)                      [x] inalterado
[x] edita (modal, mesma regra)                                  [x] inalterado
[x] exclui — COM DEFEITO, ver abaixo                            [x] CORRIGIDO, ver abaixo
[x] abre detalhes (modo view, todos os papéis)                   [x] inalterado
[ ] anexa/remove arquivo — não existe                           [ ] continua não existindo
[x] respeita permissões (Administrador, Tecnico, Usuario)        [x] teste cobre os três
[x] mostra erro (do contexto)                                   [x] + role="alert"
[x] mostra estado vazio (distingue busca de lista vazia)         [x] teste cobre os dois
[x] mostra loading                                              [x] + role="status" e texto
[x] funciona no mobile (sm: nos controles do topo)               [x] + rolagem horizontal na tabela
[x] funciona no tema escuro (só tokens, nenhum hex)              [x] inalterado
[ ] nenhum campo depende do placeholder — FALHAVA                [x] busca ganhou aria-label
[–] toda barra desenhada tem papel declarado — não há barra      [–] não se aplica
```

### Os dois itens que o teste não alcança

**mobile** — o jsdom não resolve media query. Conferido por leitura: os
controles do topo usam `sm:flex-row` / `sm:w-64` / `sm:inline`, e a tabela
agora herda o `overflow-x-auto` do primitivo `Tabela`, que ela não tinha. Numa
janela estreita a tabela passa a rolar **dentro de si**; antes empurrava a
página inteira para o lado.

**tema escuro** — o jsdom não aplica CSS. Conferido pela galeria de
componentes, que mede os tokens de verdade no navegador nos dois temas: os
primitivos que esta página passou a usar (`Tabela`, `Badge`, `Button`, `Aviso`,
`BlocoCarregando`) estão entre as 96 amostras × 2 temas com zero reprovações.

## O que mudou de verdade

| Antes | Depois |
|---|---|
| `<table>` com a string de cabeçalho copiada de outros 4 arquivos | `Tabela` + peças |
| Bloco de ordenação escrito 3 vezes | `aoOrdenar` / `ordenadaPor` |
| Sem `aria-sort` | declarado, e ausente nas colunas que não ordenam |
| Chip "Inativa" com `rounded-full` à mão | `Badge variante="discreto"` |
| Confirmar: `bg-perigo` + `text-white` = **3,76:1** | `Button variante="perigo"` = 4,83:1 |
| Cancelar: `<button>` com 5 classes à mão | `Button variante="secundario"` |
| Busca sem nome acessível | `aria-label="Buscar categorias"` |

O botão "Confirmar" era um dos **seis** que o comentário do `Button.tsx`
listava como fora do alcance da Fase 7, por serem código de página. Este é o
primeiro a cair.

## O defeito que a leitura do código expôs — e que foi corrigido

Achado ao preencher o checklist, e não ao olhar a tela. É mudança funcional, e
por isso foi levado ao operador antes de tocar: **aprovado em 03/09/2026**,
corrigido em commit próprio nos três arquivos.

`handleExcluirCategoria` guarda por `if (!confirmDelete)`, e não por
`if (confirmDelete !== id)`. O estado de confirmação é **global à tabela**, não
da linha:

1. clique na lixeira da linha A → `confirmDelete = A`, a linha A troca para
   Confirmar/Cancelar;
2. a linha B continua mostrando a lixeira, porque a confirmação aberta é da A;
3. clique na lixeira da linha B → `confirmDelete` é A, portanto verdadeiro,
   a guarda não dispara, e **B é apagada na hora, sem confirmação**.

Provado por teste descartável: `deleteCategoria` foi chamado uma vez sem que
nenhum "Confirmar" tivesse existido na tela.

**Em Categorias a ação é `deleteCategoria` — exclusão de verdade.** Em
`SetoresTab` e `UsuariosTab` o mesmo defeito existia, linha a linha, mas a ação
é desativar, que é reversível.

### A correção

Uma linha, idêntica nos três arquivos:

```diff
-    if (!confirmDelete) {
+    if (confirmDelete !== id) {
```

A forma é literal de propósito: o mesmo diff vai à `main` como hotfix, por
outra sessão, em worktree. Escrever a comparação de outro jeito em qualquer um
dos três faria o merge conflitar sem necessidade — e por isso não há comentário
acrescentado em volta da linha, que também criaria conflito. A explicação mora
nos testes.

Travada por dois caminhos: `CategoriasTab.test.tsx` prova o comportamento
(armar em A e clicar em B passa a confirmação em vez de apagar), e
`confirmacao.test.ts` confere que as **três** abas têm a linha — porque o risco
real não é alguém quebrar o comportamento de uma delas, é alguém corrigir uma e
esquecer as outras, que foi como o defeito nasceu.
