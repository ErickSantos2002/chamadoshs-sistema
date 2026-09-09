# Fichas da §29 — preservação funcional das seis telas

**09/09/2026.** A §29 pede que as funcionalidades sejam listadas **lendo o
código, não a tela**, *antes* de alterar — e conferidas uma a uma depois.

> Ler a tela lista o que se vê. Ler o código lista o que **existe**, inclusive o
> que só aparece em erro, em permissão negada ou em estado vazio — que é
> justamente onde a regressão se esconde.

Estas fichas são o **antes**. A coluna de conferência fica vazia até a alteração
acontecer.

---

## 1. `NotFound` — 23 linhas

Sem estado, sem efeito, sem chamada, sem manipulador. É markup puro.

| # | funcionalidade | como se confere | depois |
|---|---|---|---|
| 1.1 | mensagem de rota inexistente | texto visível | **preservado** |
| 1.2 | `<Link>` para `/dashboard`, com navegação de âncora | clique, e `ctrl+clique` | **preservado** |
| 1.3 | ocupa a altura do `main` sem calcular cabeçalho (`min-h-full`) | não corta em tela estreita | **preservado** |
| 1.4 | só o `router.tsx` a importa — **sem tela vizinha** | busca por `NotFound` | **conferido** |

> **Correção de 09/09/2026, e ela importa.** A primeira versão desta ficha listava
> um `<Helmet>` que **não existe** no `NotFound` — confundi com o `EmConstrucao`,
> que tinha e foi apagado. **Ficha que lista o que não existe passa na
> conferência sem conferir nada**, e é pior que ficha curta: dá a sensação de
> cobertura sem a cobertura. Escrever a ficha lendo o código não basta se a
> lembrança entrar junto.

**Risco de regressão: mínimo.** Foi a primeira convertida, por isso.

### O que mudou, e o que NÃO mudou

`<div>` com `px-8 py-10` → `<Card padding="lg">`, com `w-full max-w-md
text-center` preservados em `className`. O enquadramento da página já vinha do
contêiner de fora (`px-4 py-10`) e continua vindo dali.

**O `<Link>` vestido de botão primário ficou como estava.** `Button` estende
`ButtonHTMLAttributes` e renderiza `<button>`, sem variante de link — trocá-lo
custaria clique do meio, `ctrl+clique` e "abrir em nova aba", que é regressão
funcional e das que nenhuma captura mostraria. É a **única** ocorrência no
projeto de link vestido de botão cheio; fica anotada em vez de contornada.

---

## 2. `Bloqueio` — 72 linhas

Sem estado e sem chamada. Recebe `area` e `quemTem` por prop e monta a frase.

| # | funcionalidade | como se confere | depois |
|---|---|---|---|
| 2.1 | recebe `area` e diz **qual** área foi negada | render com `area="Usuários"` | **preservado** |
| 2.2 | `quemTem` tem **padrão** `'administradores'` | render sem a prop | **preservado** |
| 2.3 | **`<Helmet>`** troca o título da aba conforme `area` | título em `/cadastros` sem acesso | **preservado** |
| 2.4 | lê **`user?.role`** do `useAuth`, com recuo para `'Usuário'` | perfil sem `role` | **preservado** |
| 2.5 | `IconeCadeado` é `aria-hidden` — decorativo | leitor de tela | **preservado** |
| 2.6 | usa o primitivo `Rotulo` com `como="p"` | render | **preservado** |
| 2.7 | **duas** vizinhas: `ProtectedRoute:65` e `CadastrosBasicos:72` | as duas renderizam | **conferido** |

> **Segunda correção de ficha, 09/09/2026.** A primeira versão desta listava
> três itens e **faltavam quatro** — o `<Helmet>`, o `user?.role`, o
> `aria-hidden` do ícone e o padrão de `quemTem`. Duas fichas com erro em seis, e
> **as duas do mesmo feitio**: escrevi *"lendo o código"* e escrevi parte de
> memória. Ler o arquivo inteiro antes de listar não é zelo — é o método que a
> §29 pede, e eu o cumpri pela metade.

**A 2.7 é a que morde.** `Bloqueio` não é página de rota: é componente de recusa
usado dentro de outra tela. Mexer no enquadramento dela muda o
`CadastrosBasicos`, que é tela da **Fase 15**.

### O que mudou

`px-8 py-10` → `<Card padding="lg">`. E o **`relative` saiu do `className`**, e
não foi esquecido: o `Card` já o traz na base. Mantê-lo começaria a coleção de
classes que repetem o que o primitivo faz — que é exatamente como um cartão
montado à mão nasce.

---

## 3. `NovoChamado` — 42 linhas

Invólucro de rota para o `NovoChamadoForm`. A abertura normal virou o modal do
quadro; esta rota responde por link direto, favorito e celular.

| # | funcionalidade | como se confere | depois |
|---|---|---|---|
| 3.1 | botão "Voltar" navega para `/chamados` | clique | |
| 3.2 | `aoCriar` navega para `/chamados/{id}` do chamado novo | criar um chamado | |
| 3.3 | `aoCancelar` navega para `/chamados` | cancelar no formulário | |
| 3.4 | largura máxima `max-w-3xl` centralizada | layout em tela larga | |

**Nada de estado próprio.** Toda a lógica de criação vive no
`NovoChamadoForm`, que **não** é arquivo desta fase.

---

## 4. `Login` — 313 linhas

Exceção §8.1: malha de 46px e vinheta. **A §24 é explícita** — mudança visual não
pode alterar o fluxo de autenticação.

| # | funcionalidade | como se confere | depois |
|---|---|---|---|
| 4.1 | `username` e `password` em estado controlado | digitar nos dois campos | |
| 4.2 | `enviar` chama `login(...)` e trata erro | credencial errada mostra a frase | |
| 4.3 | `useEffect` redireciona quem já está autenticado | abrir `/login` logado | |
| 4.4 | `onSubmit` no `<form>` — **Enter envia** | Enter no campo de senha | |
| 4.5 | botão em estado `loading` durante a chamada | envio lento | |
| 4.6 | a versão do app aparece no rodapé | comparar com `package.json` | |
| 4.7 | malha + vinheta, e **não** `fundo-login.jpeg` | inspeção visual | |

> **Trava desta ficha:** se qualquer alteração mudar o `name` de um campo ou o
> evento de submit, **é regressão** e a fase para — §24, literal.

---

## 5. `Auditoria` — 395 linhas

Nove estados, um `useCallback`, um `useEffect`, uma chamada de serviço.

| # | funcionalidade | como se confere | depois |
|---|---|---|---|
| 5.1 | lista eventos via `auditoriaService.listar` | abrir a tela | |
| 5.2 | filtro por **tipo de cadastro** (`alvo`) | trocar o seletor | |
| 5.3 | filtro por **ator** (`atorId`) | escolher pessoa | |
| 5.4 | filtro por **data de** e **até** | preencher os dois campos | |
| 5.5 | qualquer filtro **volta para a página 0** (`aoFiltrar`) | filtrar na página 2 | |
| 5.6 | "Limpar" zera os quatro filtros | clicar | |
| 5.7 | paginação por `POR_PAGINA`, com "talvez tenha mais" | avançar até o fim | |
| 5.8 | botão "Atualizar" força recarga (`recarga`) | clicar | |
| 5.9 | estado de **erro** com mensagem | derrubar a rede | |
| 5.10 | estado de **carregando** | abrir a tela | |
| 5.11 | **permissão**: técnico não vê o seletor de tipo, e vê a frase que explica | entrar como técnico | |
| 5.12 | a lista tem rolagem **própria** (`min-h-0 flex-1 overflow-auto`) | lista longa | |

**A 5.11 e a 5.12 são as que a captura não pegaria.** A primeira só existe para
um perfil; a segunda é comportamento de layout, e é exatamente o que se quebra
ao trocar um contêiner por outro.

---

## 6. `TarefasRecorrentes` — 972 linhas

**Refeita em 09/09/2026 lendo o arquivo INTEIRO**, e não por varredura. A
primeira versão tinha 15 itens; esta tem 31, e a leitura completa achou **um
defeito vivo** que a varredura não veria.

### Carga e contexto

| # | funcionalidade | como se confere |
|---|---|---|
| 6.1 | `carregar()` passa `{ ativo: true }` **só quando** `mostrarInativas` é falso | alternar o `Checkbox` |
| 6.2 | `useEffect` **recarrega** a cada mudança de `mostrarInativas` | idem |
| 6.3 | usuários carregados uma vez, com `{ ativo: true }` | abrir a tela |
| 6.4 | falha ao carregar usuários cai em `setUsuarios([])` — **silenciosa, sem toast** | derrubar só essa rota |
| 6.5 | `categorias` vêm do contexto `useChamados`, e não de chamada própria | — |
| 6.6 | `nomeUsuario` / `nomeCategoria` resolvem id → nome localmente | tarefa com responsável |
| 6.7 | erro de carga: `toast.error('Erro ao carregar tarefas recorrentes')` | derrubar a rede |

### Permissão

| # | funcionalidade | como se confere |
|---|---|---|
| 6.8 | `podeGerenciar` = `Administrador` **ou** `Tecnico` | os três perfis |
| 6.9 | sem permissão, **a tela inteira** vira o bloco de recusa — nada mais renderiza | perfil comum |

### As seis ações

| # | funcionalidade | como se confere |
|---|---|---|
| 6.10 | **criar** + `toast.success('Tarefa recorrente criada')` | modal nova tarefa |
| 6.11 | **editar** via `atualizar` + `toast.success('Tarefa atualizada')` | editar e salvar |
| 6.12 | **realizar** com observação opcional | modal realizar |
| 6.13 | **alternar ativo** — `atualizar(id, { ativo: !ativo })`, **terceiro ponto de chamada** do mesmo serviço | Desativar / Reativar |
| 6.14 | **excluir** | botão Excluir |
| 6.15 | **histórico** via `listarExecucoes`, com `historico` zerado antes | abrir Histórico |

### As regras que nenhuma captura mostraria

| # | funcionalidade | como se confere |
|---|---|---|
| 6.16 | título vazio **barra o envio** com `toast.error('Informe um título')` | salvar em branco |
| 6.17 | `intervalo` forçado a **mínimo 1** | digitar 0 |
| 6.18 | `dia_semana` só vai no payload se **semanal**; `dia_mes` só se **mensal** | trocar o tipo e salvar |
| 6.19 | campos vazios viram `null`, e não string vazia | salvar sem descrição |
| 6.20 | `sugerirPrimeiraData` **inclui hoje** | criar semanal no próprio dia |
| 6.21 | mensal com **clamp de fim de mês** — dia 31 vira o último do mês | dia 31 em abril |
| 6.22 | se o dia já passou, **avança o mês**, virando o ano em dezembro | dia 1 no dia 20 |
| 6.23 | `proximaEditada` — data tocada à mão **nunca** é recalculada | editar a data, depois o tipo |
| 6.24 | ao **editar**, `proximaEditada` já nasce `true` | abrir edição e trocar o tipo |
| 6.25 | o recálculo só acontece no modal de **criar** | idem, no criar |
| 6.26 | **a mensagem de exclusão MUDA quando há histórico**: diz a contagem, o plural certo e que o histórico será apagado | excluir com e sem execuções |
| 6.27 | `statusData` marca **Atrasada** e **Hoje**; futuro não marca | três tarefas |
| 6.28 | ordenação por `proxima_data` | lista com datas variadas |
| 6.29 | tarefa inativa com `opacity-60` e `Badge` "Desativada" | mostrar desativadas |
| 6.30 | `salvando` bloqueia o botão via `carregando`, que já põe `aria-busy` | salvar duas vezes |
| 6.31 | "Excluir" **encostado à direita** (`ml-auto`), fora do grupo, para não ser clicado por vizinhança | inspeção |

### Vizinhas

Nenhuma. Só o `router.tsx` a importa. **Conferido.**

---

### DEFEITO VIVO, achado ao ler a linha 829

    titulo="Histórico — {selecionada.titulo}"

**Está entre aspas.** Em JSX, atributo com string literal **não interpola** — o
modal mostra as chaves e o nome da variável, ao pé da letra.

Os outros quatro títulos da mesma tela estão certos: três são texto fixo e um usa
chaves de JSX. **Só este tentou interpolar dentro das aspas.**

**Por que ninguém viu:** `tsc` fica verde — é uma `string` válida para uma prop
`string`. O validador não olha texto. E só aparece **dentro de um modal que
precisa ser aberto**, numa tela que dois dos três perfis nem alcançam.

**Fora do escopo declarado desta fase**, que é o `Card`. Registrado, não
corrigido — a decisão é do operador.

> É a prova mais direta do que a §29 quer dizer com *"lendo o código, não a
> tela"*: nenhuma captura de nenhuma largura pegaria isto, porque exige abrir um
> modal específico com um perfil específico.

### Uma observação de primitivo, sem ação

`statusData` devolve pastilhas montadas à mão que, **pela função, são `Badge`**.
Mesmo padrão do cartão à mão, num componente menor.

Não entra nesta fase: a decisão foi sobre `Card`, e estender por conta própria
seria a "arrumação" que a regra da adoção por função veda.

---

## O que estas fichas já mostram

**Nenhuma das seis telas é "só visual".** Quatro têm estado, três têm chamada de
serviço, duas têm caminho de permissão que só um perfil vê, e uma tem regra de
data que nenhuma foto pegaria.

E há duas dependências para fora da fase, que a leitura do código revelou e a
leitura da tela não revelaria:

- **`Bloqueio` é usada pelo `CadastrosBasicos`**, que não é tela desta fase;
- **`NovoChamado` só embrulha o `NovoChamadoForm`**, que também não é.

Mexer no enquadramento das duas alcança arquivos fora do escopo declarado.
