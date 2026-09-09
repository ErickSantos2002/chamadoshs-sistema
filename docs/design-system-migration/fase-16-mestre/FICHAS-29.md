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

A maior das seis, e a de maior risco: **doze estados, seis chamadas de serviço,
doze manipuladores de clique, sete `toast.error` e cinco `toast.success`.**

| # | funcionalidade | como se confere | depois |
|---|---|---|---|
| 6.1 | lista tarefas (`listar`) e usuários | abrir a tela | |
| 6.2 | **criar** tarefa (`criar`) | modal de nova tarefa | |
| 6.3 | **atualizar** tarefa (`atualizar`, dois pontos de chamada) | editar e salvar | |
| 6.4 | **excluir** tarefa (`excluir`) | excluir, com confirmação | |
| 6.5 | **realizar** tarefa (`realizar`) | marcar como feita | |
| 6.6 | **histórico de execuções** (`listarExecucoes`) | abrir o histórico | |
| 6.7 | alternar **mostrar inativas** | o botão de alternância | |
| 6.8 | recorrência calculada (`recorrenciaLabel`, `sugerirPrimeiraData`) | criar semanal e mensal | |
| 6.9 | `sugerirPrimeiraData` com `clamp` de fim de mês | dia 31 em mês de 30 | |
| 6.10 | `proximaEditada` — data tocada à mão **não** é recalculada | editar a data e trocar a recorrência | |
| 6.11 | ordenação (`useMemo` em `tarefasOrdenadas`) | ordem na lista | |
| 6.12 | estado **vazio**, com texto | conta sem tarefas | |
| 6.13 | **esqueleto** de carregamento (`h-48`) | carga lenta | |
| 6.14 | **permissão negada**: "Você não tem permissão para acessar Tarefas Recorrentes." | perfil sem acesso | |
| 6.15 | `salvando` desabilita durante a gravação | salvar duas vezes rápido | |

**A 6.9 e a 6.10 são as mais frágeis e as menos visíveis.** Nenhuma captura, em
nenhuma largura, mostraria que o dia 31 virou 30 em abril, ou que uma data
digitada à mão foi sobrescrita por um recálculo.

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
