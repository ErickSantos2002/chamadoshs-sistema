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

**Relida por inteiro.** Invólucro de rota para o `NovoChamadoForm`. A abertura
normal virou o modal do quadro; esta rota responde por link direto, favorito e
celular — *"onde um formulário dentro de modal fica espremido"*.

| # | funcionalidade | como se confere |
|---|---|---|
| 3.1 | botão "Voltar" navega para `/chamados` | clique |
| 3.2 | `aoCriar` navega para `/chamados/{id}` do chamado recém-criado | criar um chamado |
| 3.3 | `aoCancelar` navega para `/chamados` | cancelar no formulário |
| 3.4 | `max-w-3xl` centralizado, com `space-y-5` entre cabeçalho e cartão | tela larga |
| 3.5 | só o `router.tsx` a importa — **sem tela vizinha** | busca |

**A lógica de criação inteira vive no `NovoChamadoForm`**, que não é arquivo
desta fase. Esta tela não tem estado próprio.

O bloco de cabeçalho (`:18`) **ficou fora da conversão**: contém "Voltar", `h1` e
subtítulo, e pelo critério do operador é barra que organiza a página, não cartão
que carrega um item.

---

## 4. `Login` — 313 linhas

**Refeita em 09/09/2026 lendo o arquivo INTEIRO.** A primeira versão tinha 7
itens; esta tem 20 — e uma das sete **estava errada**.

### Autenticação — a §24 é literal aqui

| # | funcionalidade | como se confere |
|---|---|---|
| 4.1 | `username` e `password` em estado controlado | digitar |
| 4.2 | `enviar` chama `login(username, password)` — e **só isso**; o erro é tratado no hook | credencial errada |
| 4.3 | `onSubmit` no `<form>` — **Enter envia** | Enter na senha |
| 4.4 | os dois campos têm `required` | enviar vazio |
| 4.5 | os dois ficam `disabled` durante `loading` | envio lento |
| 4.6 | `autoComplete="username"` e `"current-password"` — gerenciador de senha funciona | navegador com senha salva |
| 4.7 | erro em bloco com **`role="alert"`** | credencial errada |
| 4.8 | botão com `carregando={loading}` e texto que vira **"Entrando…"** | envio lento |

> **Trava:** mudar `name`, `id`, `autoComplete` ou o evento de submit é
> **regressão**, e a fase para — §24, literal.

### Redirecionamento e tema

| # | funcionalidade | como se confere |
|---|---|---|
| 4.9 | `useEffect` redireciona quem já tem `user`, com **`replace: true`** | abrir `/login` logado |
| 4.10 | só redireciona **se `pathname !== '/dashboard'`** — evita o laço | idem |
| 4.11 | `setDarkModeOnLogin()` define escuro **só para quem nunca escolheu tema** | conta nova e conta com tema escolhido |

### O rodapé que o sistema diz de si

| # | funcionalidade | como se confere |
|---|---|---|
| 4.12 | `useSaudeDoSistema()` lê `/api/v1/health` e pinta o ponto por estado | derrubar o banco |
| 4.13 | o ponto **pulsa** enquanto `verificando` | recarregar |
| 4.14 | `useRelogio(1000)` faz a **idade da leitura** andar sem evento novo | esperar um minuto |
| 4.15 | `descreverIdade` diz **de quando** é a informação — *indicador sem hora continua verde vinte minutos depois de o sistema cair* | idem |
| 4.16 | versão do app e **relógio ao vivo**, em `tabular-nums` | observar |

### Layout e marca

| # | funcionalidade | como se confere |
|---|---|---|
| 4.17 | painel de apresentação **some abaixo de `lg`** — no celular empurraria o formulário para baixo da dobra | 390px |
| 4.18 | o logo aparece **uma vez só**: no painel, ou centralizado quando o painel some (`lg:hidden`) | duas larguras |
| 4.19 | os dois halos são `aria-hidden` **e** `pointer-events-none` | leitor de tela |
| 4.20 | `overflow-y-auto` no contêiner e `min-h-full` no miolo — centralizar sem rolagem **cortava pelos dois lados** numa TV em paisagem | janela baixa |

### O item que estava ERRADO

A primeira versão listava, como 4.7:

> *"malha + vinheta, e não `fundo-login.jpeg`"*

**`.malha` e `.vinheta` não existem no código.** A tela usa dois halos desfocados
sobre `bg-superficie`, no formato de duas colunas do HelpHS. Copiei a linha da
lista de exceções do prompt mestre **sem conferir se o código a cumpria** — e foi
o mesmo erro que levei para a lista da §33 no `VERSION.md`.

**Terceira ficha com erro, e a de pior tipo**: as duas primeiras listavam de
menos ou de mais dentro do arquivo; esta afirmava conformidade com uma exceção
oficial que o arquivo **não cumpre**.

E ao conferir apareceu uma **contradição no registro, anterior a mim** — está
escrita no `VERSION.md`, e a decisão é do operador.

### Vizinhas

Nenhuma. Só o `router.tsx`. **Conferido.**

---

## 5. `Auditoria` — 395 linhas

**Refeita em 09/09/2026 lendo o arquivo INTEIRO.** A primeira versão tinha 12
itens; esta tem 24, e o que faltava era o mais delicado da tela.

### Busca e proteção de corrida

| # | funcionalidade | como se confere |
|---|---|---|
| 5.1 | lista via `auditoriaService.listar` com `skip`/`limit` de `POR_PAGINA` = 50 | abrir a tela |
| 5.2 | **guarda de cancelamento** (`let atual = true` + limpeza do efeito) — resposta lenta não sobrescreve a mais nova | trocar filtro duas vezes rápido |
| 5.3 | `recarga` está nas dependências do `useCallback` **de propósito**: o botão Atualizar passa pelo mesmo efeito guardado, sem caminho paralelo | clicar Atualizar durante uma carga |
| 5.4 | erro vem de `err.response?.data?.detail`, com recuo para *"Não foi possível carregar a trilha."* | derrubar a rede |
| 5.5 | em erro, `eventos` volta a `null` — a tabela some, não fica velha | idem |
| 5.6 | usuários vêm do hook `useUsuariosPorId`, e não de chamada própria | seletor "Quem fez" |

### Permissão — e ela muda a CONSULTA, não só a tela

| # | funcionalidade | como se confere |
|---|---|---|
| 5.7 | `ehAdministrador` = `user?.role === 'Administrador'` | dois perfis |
| 5.8 | **`alvoEfetivo`**: técnico consulta **sempre `'setor'`**, nunca `''` — o filtro sai diferente da API | técnico, aba de rede |
| 5.9 | técnico não vê o seletor de tipo; vê um bloco fixo "Setores" com a frase que explica | entrar como técnico |
| 5.10 | o vazio **muda de texto** por perfil: *"A trilha ainda não registrou nenhum evento"* para administrador, *"Nenhum evento de setor registrado"* para técnico | base vazia, dois perfis |

**A 5.8 é a mais importante da ficha.** Não é tela escondida: é **pergunta
diferente feita à API**. Oferecer "Todos" ao técnico chamaria de todos uma lista
que traz metade, e oferecer "Usuários" seria oferecer um 403.

### Filtros

| # | funcionalidade | como se confere |
|---|---|---|
| 5.11 | filtro por **tipo**, **quem fez**, **de** e **até** | os quatro |
| 5.12 | qualquer filtro **volta à página 0** (`aoFiltrar`) | filtrar na página 2 |
| 5.13 | "Limpar filtros" **só aparece** quando há filtro (`temFiltro`) | tela limpa |
| 5.14 | limpar zera os quatro **e** a página | clicar |
| 5.15 | as datas são `<input>` montados à mão, com `id` pareado ao `htmlFor` do rótulo | leitor de tela |
| 5.16 | o seletor "Quem fez" ordena por nome (`localeCompare`) | lista longa |

### Os TRÊS vazios, que não são dois

| # | funcionalidade | como se confere |
|---|---|---|
| 5.17 | `pagina > 0` → *"Fim da lista"* **com botão de voltar** | 50 eventos exatos, ir à página 2 |
| 5.18 | com filtro → *"Nenhum evento neste recorte. Tente ampliar o período."* | filtro impossível |
| 5.19 | sem filtro → a frase por perfil, mais a `NotaDoInicioDaTrilha` | base vazia |

> O comentário do código conta por que são três: com **exatamente 50** eventos o
> botão Próxima habilita, a página 2 volta vazia, e a versão antiga declarava que
> a trilha nunca registrara nada — logo depois de a pessoa ter lido 50 linhas.

### Paginação e tabela

| # | funcionalidade | como se confere |
|---|---|---|
| 5.20 | `talvezTenhaMais` = a página veio com **exatamente** `limit` | 50 e 49 eventos |
| 5.21 | a barra de paginação **só existe** se `pagina > 0` ou há mais | uma página curta |
| 5.22 | cabeçalho da tabela é **`sticky`** sobre `superficie-elevada` | rolar a lista |
| 5.23 | a lista tem **rolagem própria** (`min-h-0 flex-1 overflow-auto`) | lista longa |
| 5.24 | coluna **`origem`** mostra a rota que gravou — é o motivo de a tela existir | qualquer evento |

### Vizinhas

`EstadosDaTrilha` — `TrilhaCarregando`, `TrilhaComFalha`, `TrilhaVazia` e
`NotaDoInicioDaTrilha` — é **compartilhado com `HistoricoDaConta`**, o painel
dentro do modal de usuário, que é tela da **Fase 15**.

Nada foi alterado neles, e o cartão de filtros ficou de fora da conversão — mas
a dependência fica registrada: **mexer nos estados da trilha alcança duas telas de
fases diferentes.**

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
