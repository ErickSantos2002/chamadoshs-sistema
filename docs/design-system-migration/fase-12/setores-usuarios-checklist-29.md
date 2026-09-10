# Fase 12 — `SetoresTab` e `UsuariosTab`, as duas cópias do template

Checklist da §29, preenchido antes e depois, lendo o **código** e não a tela.

As duas são cópias estruturais da `CategoriasTab`, que foi o template da Fase
11. A aposta do template era: o que se acertar nele transfere.

**Transferiu a estrutura e não transferiu dois dos consertos.** Esta ficha foi
escrita depois da Fase 15, ao montar as evidências do Checkpoint 3, e foi ela
que expôs a diferença — o que diz alguma coisa sobre quando escrever a ficha.

## O checklist — `SetoresTab` (400 linhas)

```text
Página: /cadastros (aba Setores) — src/components/cadastros/SetoresTab.tsx

ANTES                                                           DEPOIS
[x] carrega dados (useCadastros → setores)                       [x] inalterado
[–] filtra — não há filtro além da busca                         [–] não existe
[x] busca (nome e descrição, useMemo)                            [x] inalterado
[–] pagina — não existe                                          [–] não existe
[x] ordena (id, nome, created_at, asc/desc)                      [x] + aria-sort declarado
[x] cria (modal, Administrador/Tecnico)                          [x] inalterado
[x] edita (modal, mesma regra)                                   [x] inalterado
[x] desativa/reativa (confirmação em linha)                      [x] inalterado
[x] abre detalhes (modo view)                                    [x] inalterado
[–] anexa/remove arquivo — não existe                            [–] não existe
[x] respeita permissões (podeEditar / podeExcluir)               [x] inalterado
[x] mostra erro (Aviso variante="perigo")                        [x] inalterado
[x] mostra estado vazio (distingue busca de lista vazia)         [x] inalterado
[x] mostra loading (BlocoCarregando)                             [x] inalterado
[x] funciona no mobile (sm: nos controles, rolagem na tabela)    [x] inalterado
[x] funciona no tema escuro (só tokens, nenhum hex)              [x] inalterado
[ ] nenhum campo depende do placeholder — FALHAVA                [x] CORRIGIDO agora
[–] toda barra desenhada tem papel declarado — não há barra      [–] não se aplica
```

## O checklist — `UsuariosTab` (611 linhas)

Mesma estrutura, mais a troca de senha e o selo de papel.

```text
Página: /cadastros (aba Usuários) — src/components/cadastros/UsuariosTab.tsx

ANTES                                                           DEPOIS
[x] carrega dados (useCadastros → usuarios, setores)             [x] inalterado
[–] filtra — não há filtro além da busca                         [–] não existe
[x] busca (nome e papel)                                         [x] inalterado
[–] pagina — não existe                                          [–] não existe
[x] ordena (id, nome, created_at, asc/desc)                      [x] + aria-sort declarado
[x] cria (modal, só Administrador)                               [x] inalterado
[x] edita (modal, só Administrador)                              [x] inalterado
[x] desativa/reativa (confirmação em linha)                      [x] inalterado
[x] troca senha — COM DEFEITO, corrigido na Fase 8               [x] guarda por useRef
[–] anexa/remove arquivo — não existe                            [–] não existe
[x] respeita permissões (isAdmin, não podeEditar)                [x] inalterado
[x] mostra erro (Aviso, na lista e no modal de senha)            [x] inalterado
[x] mostra estado vazio (distingue busca de lista vazia)         [x] inalterado
[x] mostra loading (BlocoCarregando)                             [x] inalterado
[x] funciona no mobile                                           [x] inalterado
[x] funciona no tema escuro                                      [x] inalterado
[ ] nenhum campo depende do placeholder — FALHAVA                [x] CORRIGIDO agora
[–] toda barra desenhada tem papel declarado — não há barra      [–] não se aplica
```

Os dois campos de senha do modal (`placeholder="Mínimo 6 caracteres"` e
`"Digite a senha novamente"`) **não** contam nesse item: os dois passam por
`RotuloDeCampo`, com rótulo visível e `htmlFor`. O placeholder ali é dica, não
nome — que é exatamente para o que ele serve.

## O item que falhava nas duas, e o que ele revela

A busca de cada aba era:

```tsx
<Input
  type="text"
  placeholder="Buscar setores..."
  icone={<IconeBusca className="h-4 w-4" />}
/>
```

E na `CategoriasTab`, desde a Fase 11:

```tsx
<Input
  type="search"
  aria-label="Buscar categorias"
  placeholder="Buscar categorias..."
  icone={<IconeBusca className="h-4 w-4" aria-hidden="true" />}
/>
```

Três diferenças, e as três importam:

- **`aria-label`** — o campo não tem rótulo visível. Sem ele o nome acessível
  sai do placeholder, que some no primeiro caractere digitado: quem volta ao
  campo depois de digitar ouve "caixa de texto" e o conteúdo, sem saber o que
  o campo é.
- **`type="search"`** — dá o "x" de limpar e anuncia o propósito.
- **`aria-hidden` na lupa** — sem isso o ícone é lido junto do campo.

### O que isso diz sobre o método

A ideia do template era transferir decisão. Transferiu a **forma** — as duas
abas usam `Tabela`, `Aviso`, `BlocoCarregando`, `Button`, `Badge`, `Campo`,
todos do pacote — e não transferiu o **conserto**, porque copiar estrutura é
uma leitura e copiar correção é outra.

E a conferência por tela não pega: cada aba, olhada sozinha, parece completa.
O campo tem placeholder, o ícone está lá, a busca funciona. O que falta só
aparece **comparando com o template**, e ninguém compara se não for obrigado.

A ficha da §29 é o que obriga — quando é escrita. As das Fases 12 e 14 não
existiam, e é por isso que esta diferença sobreviveu a três fases.

### E sobrava um botão de cada geração no mesmo par

Na confirmação de exclusão em linha:

```tsx
<Button variante="perigo" tamanho="sm">Confirmar</Button>
<button className="rounded-lg border border-borda …">Cancelar</button>
```

O "Confirmar" tinha sido convertido (era `bg-perigo` com `text-white`, 3,76:1,
e a variante `perigo` o levou a 4,83:1); o "Cancelar" ao lado dele ficou.
Agora é `Button variante="secundario" tamanho="sm"`, como no template.

## O que a Fase 14 cobriu

A Fase 14 (`bc458ac`, `c551b35`) trabalhou os oito botões de ação do
`ChamadoDetalhes` e os dois que restavam nestas duas abas. O `ChamadoDetalhes`
tem ficha própria, na Fase 15, e ela cobre a tela inteira de ponta a ponta —
24 `<button>` à mão antes, 1 depois. Não há ficha separada da 14 porque não há
tela que ela tenha tocado e a 15 não cubra.
