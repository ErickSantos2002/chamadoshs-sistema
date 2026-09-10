# Fase 11 — template de FORMULÁRIO: `CategoriaModal`

Checklist da §29, preenchido antes e depois, lendo o **código** e não a tela.

`CategoriaModal` é o template de formulário porque é o par da listagem já
migrada, é o menor formulário do sistema, e cobre os três modos — criar,
editar e visualizar — num arquivo só. O que se estabelecer aqui os outros doze
formulários seguem nas Fases 12–16.

## O que este template estabelece, e por que ele importa mais que os outros

A varredura da Fase 8 achou **zero ocorrências** de `aria-invalid`,
`aria-describedby` e `aria-errormessage` em todo o `src`. Treze formulários,
nenhum ligando a mensagem de erro ao campo que a causou.

A Fase 10 deu `role="alert"` ao `MensagemDeErro`, e isso resolveu o **anúncio**:
o erro é lido no instante em que aparece. Não resolveu a **associação** — quem
navegasse de volta ao campo depois ouvia "Nome, caixa de edição", sem
"inválido" e sem o motivo. O erro existia na tela e sumia da árvore.

Este template fecha isso, e o mecanismo é o componente `Campo`: ele amarra
rótulo, controle, erro e dica, e injeta `id`, `aria-invalid`, `aria-required` e
`aria-describedby` no controle. A decisão sai do sítio de uso — que é onde ela
foi esquecida treze vezes.

## O checklist

```text
Página: modal de categoria — src/components/cadastros/CategoriaModal.tsx

ANTES                                                          DEPOIS
[x] carrega dados (categoria via prop, no modo edit/view)       [x] inalterado
[–] filtra / busca / pagina / ordena — não se aplica            [–] não se aplica
[x] cria (createCategoria)                                      [x] inalterado
[x] edita (updateCategoria, só nome e descrição)                 [x] inalterado
[–] exclui — é da listagem, não deste modal                     [–] não se aplica
[x] abre detalhes (modo view, campos desabilitados)              [x] + dica some em leitura
[–] anexa/remove arquivo — não existe                           [–] não se aplica
[x] respeita permissões (quem abre já foi filtrado na listagem)  [x] inalterado
[x] mostra erro (validação por campo + toast da API)             [x] + associado ao campo
[–] mostra estado vazio — não se aplica                         [–] não se aplica
[x] mostra loading (Button carregando no rodapé)                 [x] inalterado
[x] funciona no mobile (Modal já é responsivo)                   [x] inalterado
[x] funciona no tema escuro (só tokens)                          [x] inalterado
[x] nenhum campo depende do placeholder (os dois têm rótulo)     [x] + aria-required
[–] toda barra desenhada tem papel declarado — não há barra      [–] não se aplica
```

Itens acrescentados por este template, que a §29 não lista mas que a varredura
da Fase 8 deixou registrados como pendência:

```text
[ ] o campo se anuncia inválido quando é recusado          -> [x] aria-invalid
[ ] a mensagem de erro está ligada ao campo                -> [x] aria-describedby
[ ] o campo obrigatório se anuncia obrigatório             -> [x] aria-required
[ ] o contador de caracteres alcança quem não o vê         -> [x] vira dica do campo
[ ] a submissão recusada leva o foco ao campo que falhou   -> [x] com ref
```

## O que mudou de verdade

| Antes | Depois |
|---|---|
| `RotuloDeCampo` + controle + `MensagemDeErro` empilhados à mão | `Campo`, que amarra os quatro |
| Erro solto, sem `id` | `id` gerado do campo, apontado por `aria-describedby` |
| Campo recusado se anunciava válido | `aria-invalid` |
| Obrigatoriedade só no asterisco, que é `aria-hidden` | `aria-required` |
| Contador num `<p>` solto | dica do campo, no `aria-describedby` |
| Foco ficava no botão Salvar após recusa | vai ao primeiro campo que falhou |
| `Input` e `Textarea` sem `forwardRef` | com `ref`, que é o que torna o foco possível |

## Dois erros meus no caminho, e os dois são o mesmo erro

**`validar()` devolvia booleano.** Para mandar o foco ao campo certo eu
precisava saber QUAL falhou, e escrevi `validar.errosNome` — uma propriedade
que não existe. O compilador pegou.

A correção real não foi inventar a propriedade: foi `validar()` passar a
**devolver os erros** em vez do booleano. O `setErrors` não deixa o resultado
legível na mesma passagem — quem chama teria de esperar o próximo render para
saber o que falhou, e é exatamente nessa hora que o foco precisa se mover.

**É a mesma armadilha da trava por `useState` no reset de senha**, dois commits
atrás: pedir ao estado uma resposta que ele só terá depois. Duas vezes no mesmo
dia, em dois arquivos sem relação. Vale como padrão a procurar, e não como dois
acidentes.

## Como foi conferido

`CategoriaModal.test.tsx`, 8 casos montados no jsdom. A página vive atrás do
login, como toda esta seção do sistema.

Prova negativa feita nos dois pontos que importam:

- removendo o `aria-describedby` do `Campo`, **2 casos reprovam** — o da
  associação do erro e o do contador;
- removendo as duas linhas de foco, **1 caso reprova**.

Sem isso, os testes provariam apenas que o código roda.
