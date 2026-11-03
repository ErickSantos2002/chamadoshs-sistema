# FE-5 — Permissões da equipe da TI e integração com a API-9

Branch `feat/setor-destino-fe-5`, a partir do FE-4 (`d38c1e0`). Implementada
só localmente, sem publicação. Versão do produto mantida em **1.7.8**.

Contrapartes na API (`chamadoshs-api`, todas locais, sem push):

| Etapa | Branch | HEAD | O que o FE-5 usa dela |
|---|---|---|---|
| API-5 | `feat/setor-destino-api-5` | `d8e7f53` | leitura por chamado: quem não pode ver recebe **404** |
| API-6 | `feat/setor-destino-api-6` | `327c004` | `SETORES_TI_IDS`, responsável da TI só da equipe |
| API-7 | `feat/setor-destino-api-7` | `f78a5f4` | `require_equipe_ti` e `integra_equipe_ti` no `/auth/me` |
| API-8 | `feat/setor-destino-api-8` | `69902ae` | comentário interno só para admin e TI |
| API-9 | `feat/setor-destino-api-9` | `0ac2571` | `GET /chamados/responsaveis-ti` e recusa do inativo |

---

## 1. Decisões

- **F5-1:** a lista de novos responsáveis da TI vem só de
  `GET /chamados/responsaveis-ti`. Não há fallback para `GET /usuarios/` e a
  elegibilidade não é refeita no front.
- **F5-2:** administrador e técnico da equipe da TI criam comentário interno,
  com a marca "Interno". Público é o padrão.
- **F5-3:** menus e ações administrativas somem para quem não administra, e as
  rotas administrativas são guardadas contra URL digitada.
- **F5-4:** deploy coordenado depois. Nenhum deploy nesta etapa.

## 2. Contrato de autenticação

- `UsuarioLogado.integra_equipe_ti?: boolean`. Só o booleano `true` conta;
  ausente, `null`, `"true"` ou `1` valem como `false`.
- A permissão vem **só** do `/auth/me`. O `localStorage` guarda
  `{id, nome, role, role_id, setor_id}` e nunca `integra_equipe_ti`.
- Ao restaurar a sessão (F5), a tela parte do usuário guardado, sem permissão
  administrativa, e revalida o `/auth/me`. Até a resposta, `identidadeConfirmada`
  fica `false`.
- Depois de cada renovação de token (`aoRenovarToken`), a identidade é
  revalidada. A identidade guardada após renovar perde `integra_equipe_ti`.
- Controle de geração (`sessao` e `pedido`): uma resposta do `/auth/me` de
  outra sessão, de um pedido anterior ou chegando depois do logout é
  descartada.
- Erros da revalidação:
  - 401 limpa o usuário;
  - 403 tira a confirmação;
  - rede e 5xx marcam `falhaAoConfirmar` e mantêm a confirmação que já havia.

## 3. Permissões

`src/lib/permissoes.ts`, com o hook `usePermissoes`:

```
podeAdministrar         = confirmada && (role === 'Administrador' || role_id === 1 || integra_equipe_ti === true)
podeAdministrarUsuarios = confirmada && Administrador
```

| Perfil | Cadastros, Tarefas, Auditoria | Usuários | Responsável da TI | Interno |
|---|---|---|---|---|
| Administrador | sim | sim | sim | sim |
| Técnico com `integra_equipe_ti` | sim | não | sim | sim |
| Técnico fora da TI (Qualidade, outro setor, sem setor) | não | não | não | não |
| Usuário | não | não | não | não |
| Qualquer um com identidade pendente | não | não | não | não |

- **Menu:** o grupo Gestão só aparece com `podeAdministrar`.
- **Rotas** (`ProtectedRoute administrativa`):
  - com a identidade pendente, "Confirmando suas permissões…" e nenhuma
    requisição da tela;
  - se a revalidação falhou, um aviso e "Tentar de novo";
  - sem permissão, `Bloqueio`.
- **Cadastros:**
  - Setores e Categorias só com `podeAdministrar`; nenhuma exclusão nova.
  - SLA: o botão Editar é guardado, e a regra não muda.
  - A aba Usuários continua só para Administrador.
- **Chamados:** as tarefas do dia só são pedidas por quem administra. Os
  outros perfis não recebem 403, toast nem chamada periódica.
- A API é quem decide. O front só deixa de oferecer o que a API recusaria.

### Revalidação que falha (fechamento técnico)

Uma confirmação vale enquanto a última revalidação do `/auth/me` não falhou:

```
vigente        = identidadeConfirmada && !falhaAoConfirmar
podeAdministrar = podeAdministrar(user, vigente)
semConfirmacao  = user && falhaAoConfirmar        (antes: só sem confirmação anterior)
```

| Resposta da revalidação | Sessão | Funções de administração |
|---|---|---|
| 200 | segue | conforme o `/auth/me` novo (revogada → saem) |
| rede ou 5xx | **segue, sem logout** | **suspensas** até uma revalidação dar certo |
| 401 | encerrada | — |
| 403 | segue | nenhuma (`identidadeConfirmada = false`) |

- Suspensas: Gestão, troca do responsável da TI e comentário interno. O resto
  (comentário público, ações de atendimento, leitura) continua.
- Aviso na casca, para quem administraria — administrador, integrante
  confirmado, e técnico cuja equipe ainda não foi confirmada (no F5 o
  `integra_equipe_ti` não vem do armazenamento) — com "Confirmar de novo".
  Um clique por tentativa; nada se repete sozinho.
- Interno já marcado quando a confirmação caiu: não sai e não vira público. O
  bloqueio diz por quê (`MENSAGEM_INTERNO_SEM_CONFIRMACAO`) e oferece
  "Confirmar de novo" e "Tornar público".
- Responsável escolhido e permissão caída antes do "Salvar": o PUT da edição
  leva o responsável de antes; os outros campos seguem.
- Resposta antiga não desfaz a mais nova; logout e troca de conta descartam a
  revalidação em voo (testes do `AuthContext`).

## 4. Responsáveis da TI

- `chamadosService.listarResponsaveisTI()` valida o formato `[{id, nome}]`:
  - id inteiro positivo, nome não vazio, sem id repetido;
  - descarta os campos a mais;
  - formato inválido gera `ListaDeResponsaveisInvalida`.
- `useResponsaveisTI(ativo, chave)`:
  - pede a lista só com `ativo && podeAdministrar`;
  - um pedido por abertura (modal: por chamado aberto; página: por entrada na
    edição);
  - resposta de abertura, sessão ou pedido anterior é descartada.
- Falhas não têm fallback e travam a escolha. O motivo aparece inline, sem
  toast próprio, com "Tentar de novo":
  - 401: só a sessão (o interceptor redireciona);
  - 403: "sem permissão";
  - 404 ou 405: rota indisponível;
  - 422 ou formato inválido: versão incompatível (é o que a API-8 responde);
  - 5xx ou rede: falhou.
- Responsável atual fora da lista:
  - aparece como "Nome (fora da equipe)", ou "Usuário #id";
  - desabilitado, não escolhível;
  - nunca muda sozinho, e nada é escolhido automaticamente.
  - O nome vem de `useUsuariosPorId`, que lista todos os usuários, inativos
    inclusive.
- O `Seletor` não mostra mais a primeira opção quando o valor não está entre
  as opções, e ignora opção desabilitada.
- **400 no PUT** (inativo, fora da TI, conta de serviço):
  - mostra o `detail` com "Nada foi salvo…";
  - mantém o formulário e relê a lista;
  - não repete o PUT.
- Na Qualidade nada mudou: atendentes, versão e 409/428 seguem como no FE-4.

## 5. Perda de acesso

`src/lib/acesso.ts` e `AcessoEncerrado`. Desde a API-5, quem deixa de poder ver
um chamado recebe 404. Um 404 na **releitura ou numa escrita** de um chamado
que já estava na tela é perda de acesso.

- **Página:**
  - as ações param;
  - chamado, comentários, histórico e edição saem do estado;
  - os modais fecham;
  - aparece "Este chamado não está mais disponível para você.";
  - "Voltar para Chamados" navega com `replace`.
- **Troca de responsável seguida de 404:** "A atribuição foi salva, mas este
  chamado não está mais disponível para você."
- **Rascunhos:** comentário, solução do modal de resolução, solução em edição,
  motivo do cancelamento e solução do passo de atendimento ficam só leitura,
  para copiar. Nada é reenviado, nem a escrita nem a leitura.
- **Primeira carga com 404** continua "Chamado não encontrado": a página nunca
  mostrou o chamado.
- **Modal:** a mesma parada, com título "Chamado indisponível", o rascunho e
  "Fechar". O efeito de carga não relê o chamado depois de encerrado.
- **AcoesRapidas:**
  - `aoPrecisarRecarregar` pode devolver `Promise<boolean>`;
  - `true` encerra a espera pela versão e devolve os botões;
  - `false` ou rejeição encerra a espera e trava os botões com o motivo e
    "Tentar de novo" (um clique, nunca automático);
  - sem promessa, o comportamento do FE-4 (esperar a versão nova) fica;
  - `PUT` da equipe com 404 pede a releitura, sem toast próprio;
  - `versao`, `versao_esperada`, 409 e 428 não mudaram.

## 6. Kanban

- `removerChamado(id)` no `ChamadosContext` tira só aquele card. Não recarrega
  o quadro nem mexe nos outros.
- Uma listagem ou busca que já estava em voo quando o card saiu não o traz de
  volta: cada uma guarda a marca do seu início.
- Uma listagem que começa depois da remoção vale, porque o acesso pode ter
  voltado.
- O mapa de remoções é limpo na troca de usuário.

## 7. Comentários internos

- **Opção:** "Comentário interno" só para `podeAdministrar`, desmarcada.
  `is_interno` vai sempre explícito (`true` ou `false`). Depois de enviar, o
  próximo comentário volta a ser público.
- **Lista:** o interno ganha o selo "Interno" em texto e a marca na borda (não
  só cor).
- **403 num interno:**
  - o texto fica;
  - sem toast próprio (o do interceptor basta) e sem reenvio;
  - o envio trava, com o aviso, até "Tornar público";
  - enviar depois disso é outro clique;
  - o `/auth/me` é relido.
- **Permissão que sai com o interno marcado:** o mesmo bloqueio. O texto nunca
  vira público sozinho.
- **403 num comentário público:** só o toast do interceptor. O modal não troca
  mais o chamado por "Erro ao enviar o comentário."
- **Ordem no cliente:** `ordenarComentarios`, por `created_at` e, no empate,
  `id` (a mesma identidade da `key`). A posição na resposta nunca entra. A API
  não garante ordem.

## 8. Compatibilidade

- **Sem `integra_equipe_ti`** (API-6 ou anterior): ninguém é presumido da TI.
  Só o Administrador administra, e técnicos não veem Gestão nem o interno.
- **API-8:** `/chamados/responsaveis-ti` responde 422 (a rota de id tenta ler
  `responsaveis-ti`). O seletor da TI fica travado como "versão incompatível",
  sem fallback. O responsável atual continua à vista.
- **API sem a API-8:** a opção de interno só aparece para quem administra, e a
  API anterior aceita o que vier. Não há regressão de confidencialidade a
  partir do front, que antes nunca criava interno.
- **TI:** as escritas seguem sem versão contra qualquer API. Na Qualidade, as
  regras do FE-4 ficam.

## 9. Riscos residuais

1. ~~Rascunho do modal some quando o quadro muda~~ — **corrigido no
   fechamento técnico** (ver seção 13).
2. **Toast "Chamado não encontrado" junto da tela de perda de acesso** no
   atendimento da Qualidade. Vem de `interpretarErroDoAtendimento` e foi
   mantido para não mudar o comportamento testado do FE-3.
3. **404 na carga inicial do modal** (comentários ou chamado) é "não
   encontrado", não perda de acesso. Só a releitura e as escritas encerram.
4. **Falha não-404 na releitura da página** troca a página pela tela de erro,
   como antes. O estado "Não foi possível atualizar…" das ações aparece no
   modal.
5. **A limpeza só dos comentários na perda de acesso continua não
   observável.** A mutação que sobreviveu ("não limpa comentários") passou a
   ser pega (seção 13). A que tira só o `setComentarios([])` sobrevive: os
   comentários só aparecem com o chamado, e os dois são trocados no mesmo
   lote. Fica como defesa em profundidade.
6. ~~Revisão visual não feita~~ — **feita no navegador e os dois pontos
   corrigidos** (seção 13).
7. ~~Sem teste integrado~~ — **homologação local FE-5 × API-9 feita**
   (seção 13), com PostgreSQL descartável e dados fictícios.
8. **O front esconde, a API decide.** `podeAdministrar` é UX. A garantia é o
   `require_equipe_ti`, o `require_admin` e o `pode_acessar_comentario_interno`
   da API.

## 10. Regressões e expectativas mudadas de propósito

- `casca.test.tsx`: os testes das cinco áreas passam `mostrarGestao: true`.
  Sem ele, a Gestão some (F5-3).
- `ChamadoDetalhes.qualidade.test.tsx`, caso "chamado da TI: o seletor de
  sempre": o atual fora da lista passa a ser `Usuário #7 (fora da equipe)`,
  desabilitado. O `Seletor` deixou de mostrar a primeira opção para valor fora
  das opções.
- Fixtures dos testes da TI (modal, edição, Qualidade) passam a simular
  `GET /chamados/responsaveis-ti`.
- Fixtures de sessão ganharam `identidadeConfirmada`, `falhaAoConfirmar` e
  `revalidarIdentidade`.

## 11. Ordem de deploy

1. `SETORES_TI_IDS` configurada no ambiente da API, com os ids validados por
   pessoa (API-6). **Antes da imagem:** sem ela, a TI perde o quadro e ninguém
   além do Administrador administra.
2. A API com as etapas 5 a 9 (`feat/setor-destino-api-9`, `0ac2571`). Sem a
   API-9, o seletor de responsável da TI do FE-5 fica travado.
3. O rebuild do front com o FE-5.
4. `SETOR_QUALIDADE_ID` segue **desligado** até a homologação integrada.

Esta ordem segue a condição ativa do plano de segurança: API antes do front.

## 12. Rollback coordenado

- **Só o front para o FE-4,** com a API-9 no ar:
  - a TI volta a oferecer responsáveis de `GET /usuarios/`, e a API recusa os
    inelegíveis com 400 (o FE-4 mostra o `detail`);
  - técnicos fora da TI voltam a ver Gestão e recebem 403 da API;
  - o FE-4 nunca cria interno.
  - É seguro para a confidencialidade, mas pior para quem usa.
- **API para a API-8,** com o FE-5 no ar: a rota da lista some (422), e a troca
  de responsável da TI trava até a API voltar. O inativo volta a ser aceito no
  PUT. Coordenar com o rollback do front para o FE-4.
- **API para a API-7 ou anterior:** reexpõe o comentário interno ao técnico de
  fora da TI, no backend. Não é seguro, qualquer que seja o front.
- **API para a API-6 ou anterior:** sem `integra_equipe_ti`, o FE-5 só deixa o
  Administrador administrar. É conservador, mas tira da TI as telas de gestão.

## 13. Fechamento técnico e homologação local FE-5 × API-9

Feita em 03/11/2026, toda local. Sem push, PR, merge, deploy ou acesso a
produção; versão segue **1.7.8**. Nenhuma credencial neste documento.

### 13.1 Defeitos corrigidos (commits locais)

| Commit | O quê |
|---|---|
| `889d9db` fix(chamados): preserva rascunhos durante atualizacoes | O efeito de carga do `ChamadoModal` dependia da identidade de `buscarChamado`; cada mudança do quadro limpava o comentário e relia os comentários. Agora depende só do `chamadoId` e incorpora a versão nova do mesmo chamado vinda do quadro. Rascunho some só ao enviar, trocar de chamado, fechar, ou fica só-leitura na perda de acesso. Nada em `localStorage`/`sessionStorage`. |
| `bd82530` test(chamados): cobre perda de acesso e estado obsoleto | Torna observável a mutação que sobrevivia (ver 13.2). |
| `9dd592f` fix(auth): suspende privilegios sem revalidacao | Critério da seção 3, "Revalidação que falha". |
| `8e64da7` fix(auth): avisa o tecnico restaurado sem confirmacao | **Achado no navegador:** no F5 com o `/auth/me` caído, o técnico da TI perdia a Gestão sem aviso e sem nova tentativa. |
| `e2737b8` fix(ui): ajusta controles de atendimento | Contraste da opção escolhida do `Seletor` (4,31:1 → 14,56:1 claro, 11,31:1 escuro) e ações rápidas no tamanho padrão (30 → 38 px). |

### 13.2 Testes e mutação

- Vitest: **1.418** aprovados em 88 arquivos (base 1.384 no `12aac63`;
  +34). `tsc -b`, `validar:paleta` e `npm run build` limpos — sempre com
  `VITE_API_URL=http://127.0.0.1:9`.
- Novos: `ChamadoModal.rascunhos.test.tsx` (12), três em
  `perdaDeAcesso.test.tsx` (página: Voltar do navegador, GET forçado
  atrasado, perda no meio da releitura), `context/revalidacao.test.tsx` (16,
  com `AuthProvider`, casca e modal reais), um em
  `ChamadoDetalhes.edicao.test.tsx`, um em `Seletor.test.tsx`, um em
  `AcoesRapidas.test.tsx`.
- **Mutação sobrevivente da FE-5** ("página não limpa chamado e
  comentários"): agora **3 testes falham**. Variações: só o chamado, 3;
  releitura atrasada escreve depois da perda, 1; só os comentários,
  **sobrevive** (risco 5).
- Mutações de cada correção, todas pegas: efeito com as dependências antigas
  (6), sem incorporar o quadro (1), troca sem limpar rascunho (1); confirmação
  antiga vale apesar da falha (5), `semConfirmacao` só antes de confirmar (5),
  sem o aviso (5), bloqueio do interno sem o motivo (2), falha de rede não
  marcada (7), PUT com o responsável escolhido sem permissão (1); aviso só
  para admin/integrante (1), para técnico confirmado fora (1), para qualquer
  sessão (2); `text-sinal` de volta (1), `sm` de volta (1). Número de
  mutações não substitui a suíte.

### 13.3 Ambiente e isolamento

- **Banco:** PostgreSQL 15.19 portátil, cluster novo (`initdb -A trust`) em
  `127.0.0.1:54339`, banco `hml_fe5_api9`, `schema_chamados.sql` da API-9 e
  seed fictício. O PostgreSQL 18 do sistema (5432) não foi tocado.
- **API:** `0ac2571` exportada por `git archive` para uma pasta temporária (o
  checkout da API não foi usado nem alterado), `uvicorn` em
  `127.0.0.1:8095`, ambiente montado com `env -i`: `SETORES_TI_IDS=1`,
  `SETOR_QUALIDADE_ID=5` (**só neste banco descartável**), webhook vazio,
  chave aleatória local, `PROXY_HOPS_CONFIAVEIS=0`. Não há agendador na API.
- **Front:** `vite --host 127.0.0.1 --port 5295 --strictPort` com
  `VITE_API_URL=http://127.0.0.1:8095` no processo. Conferido no módulo
  servido: `import.meta.env.VITE_API_URL` = a API local. O `.env` (produção)
  não foi alterado.
- **Saída de rede bloqueada nos processos:** API e Vite subiram com um guarda
  que recusa `connect` fora de loopback (conferido: `1.1.1.1:443` recusado,
  `127.0.0.1` aceito). Nenhuma recusa registrada durante a homologação.
- **Navegador:** só as origens `127.0.0.1:5295` e `127.0.0.1:8095` aparecem
  nos recursos da página. URLs fixas no código: o fallback
  `http://localhost:8000` e o link da Central (só ao clicar, não clicado).
  Fontes auto-hospedadas; sem service worker, WebSocket ou EventSource.

### 13.4 Personas (fictícias)

`hml_admin` (administrador, ADM), `hml_ti` (técnico TI), `hml_qual`
(técnico Qualidade), `hml_outro` (técnico Laboratório), `hml_semsetor`,
`hml_comum` (usuário), `hml_ti_ativo`, `hml_ti_inativo`, `hml_servico`
(conta de serviço na TI), `hml_solicitante`, `hml_resp_atual`,
`hml_ex_resp` (saiu da TI), e `hml_admin_ti` (administrador na TI). Senha
única descartável, só no banco temporário.

### 13.5 B — HTTP real contra a API-9 (sem o front)

Script em loopback, sem registrar token nem senha: **167/167**.

- Autenticação: login das personas (inativo recusado), `/auth/me` com
  `integra_equipe_ti` esperado por persona, token guardado vale num pedido
  novo, `refresh` devolve token que vale, token inválido 401. Não há rota de
  logout na API (é do front). Mudança de setor de `hml_outro` para a TI e de
  volta: o mesmo token revalidado passa `integra_equipe_ti` a `true` e a
  `false`, e `responsaveis-ti` acompanha (200/403).
- Administração: admin e admin da TI 200 em tudo; técnico TI 200 em setores,
  categorias, SLA, tarefas e eventos de setor, **403** em eventos de conta;
  Qualidade, outro setor, sem setor e comum 403 em tarefas e eventos.
  Técnico TI cria setor e **não** exclui (403); admin exclui.
- Responsáveis: admin, admin TI e técnico TI recebem exatamente
  `{hml_ti, hml_ti_ativo, hml_resp_atual, hml_admin_ti}`, só `id` e `nome`;
  os demais 403. PUT com inativo, conta de serviço, outro setor, Qualidade,
  admin fora da TI e sem setor: 400 e nada gravado. Responsável antigo
  inelegível se mantém ao salvar outro campo.
- Interno: admin e TI criam e veem; solicitante e Qualidade não recebem,
  tentam e levam 403 sem gravação, comentam em público; o interno não sai por
  `GET /comentarios/{id}`, histórico nem chamado.
- Concorrência: Qualidade 428 sem versão, 409 com versão velha, 200 com a
  atual (versão sobe); atendimento idem; TI sem versão 200; sonda D-6 405
  "Method Not Allowed".
- Perda de acesso: A (responsável fora da TI) lê; B reatribui; A recebe 404
  na leitura, nos comentários e ao comentar, e o chamado sai da listagem.
  Autorreatribuição: PUT 200 e releitura **200** — quem reatribui na TI lê
  pelo perfil, então o 404 não se aplica pelas regras da API-9.

### 13.6 C — navegador real, front local + API local

Chrome, uma aba numa origem local, personas trocadas pelo formulário de login.

- `hml_ti`: Gestão; chamado com interno marcado "Interno"; opção de interno;
  seletor da TI com exatamente os quatro elegíveis. Escolha que ficou inválida
  (inativado no banco depois da lista carregada): PUT **400**, nada salvo,
  formulário mantido, lista relida sem ele. Escolha válida: 200. Responsável
  antigo inelegível aparece "(fora da equipe)", desabilitado, e é mantido ao
  salvar a prioridade. Interno enviado pelo navegador gravado como interno.
- `hml_qual`: sem Gestão; `/cadastros`, `/tarefas-recorrentes`, `/auditoria`
  por URL mostram o bloqueio, sem toast; **nenhuma** requisição a
  `responsaveis-ti`, tarefas, eventos ou setores, e nenhum 403 no log da API;
  chamado da Qualidade sem o interno e sem a opção; comentário público 201.
- `hml_outro`, `hml_semsetor`, `hml_comum`: sem Gestão, bloqueio por URL,
  abertura de chamado disponível, nenhum 4xx.
- `hml_admin` e `hml_ti`: as três telas de gestão abrem; a Auditoria da TI
  fica em Setores com o aviso de eventos de conta, e só pede `alvo=setor`.
  Exclusão de setor não é oferecida a ninguém (só desativar).
- Perda de acesso com dois usuários (A no navegador, B por HTTP): na página e
  no modal do Kanban, o comentário de A leva **um** 404, sem repetição; os
  dados do chamado somem, ações somem, o rascunho fica só-leitura para
  copiar, a mensagem aparece, e o cartão sai do quadro sem recarregar e não
  volta.
- Revalidação: com a API parada e F5, a sessão segue, a Gestão sai e o aviso
  com "Confirmar de novo" aparece (depois da correção `8e64da7`); com a API de
  volta, um clique devolve a Gestão.

### 13.7 Visual e acessibilidade (navegador)

360 e 1440 px, claro e escuro, por iframe da mesma origem com largura fixa
(a janela não redimensiona): Kanban, modal, página do chamado, seletor de
responsável aberto, Cadastros. Medido por script: transbordo horizontal
**nenhum**; controles sem rótulo **nenhum**; contraste de todo texto visível
≥ 4,5 (≥ 3 grande), exceto a opção escolhida do `Seletor` no tema claro
(corrigida); modal cabe em 360 px; foco visível (contorno de 2 px e anel de
4 px). Login, estados de erro e carregamento foram vistos nas passagens, não
medidos à parte.

### 13.8 Falhas reproduzidas e não corrigidas aqui

- **Classe 2 — técnico de fora do setor vê ações de equipe.** No chamado da
  TI que lê só por ser o responsável, `hml_outro` vê Editar, Iniciar
  atendimento, Arquivar e Cancelar. A API recusa (403 "Este chamado não é da
  sua equipe", nada gravado). `podeEditar = isAdmin || isTecnico` é anterior
  ao FE-5; espelhar o `pode_alterar_como_equipe` da API-6 pede uma regra de
  alcance que o front só conhece pela metade.
- **Classe 2 — erro de escrita troca a página pela tela de erro.** Na página,
  uma recusa que não é perda de acesso nem conflito de versão (o 403 acima,
  um 5xx) faz `setError`, e a página inteira vira "Erro ao atualizar status."
  com só "Voltar", perdendo o rascunho — com o chamado ainda legível.
  Anterior ao FE-5 (`c47954c`).
- **Classe 3 — conta de serviço da TI age como equipe (API).** Reprodução:
  `hml_servico` (técnico, setor da TI, `conta_de_servico = true`) faz login
  (200); `/auth/me` → `integra_equipe_ti: true`; `GET /tarefas-recorrentes/`
  200, `GET /eventos/?alvo=setor` 200, `GET /chamados/responsaveis-ti` 200, e
  `POST /comentarios/` com `is_interno: true` **201**. Esperado: a conta de
  serviço, que a API-9 já recusa como responsável, não ganhar as funções da
  equipe. Impacto: quem tiver a senha de uma conta de serviço da TI administra
  como técnico e lê/escreve interno; no front, ganha a Gestão. Correção mínima
  proposta: `integra_equipe_ti` (em `leitura_service`) exigir
  `not usuario.conta_de_servico` — ou o login recusar conta de serviço, se ela
  nunca deve entrar pela tela. **API não alterada.**
- Registrado, não é defeito: `GET /usuarios/` e `GET /sla-configs/` só pedem
  login (nomes e prazos para todo perfil), desenho anterior à API-9.

### 13.9 Limitações e riscos residuais

- 403 na revalidação deixa as rotas administrativas em "Confirmando suas
  permissões…" (não confirmada e sem falha). Seguro, mas sem saída além do
  logout. Não alterado.
- Capturas de tela do navegador falharam por tempo em parte das tentativas;
  a evidência visual é a medição por script e uma captura do aviso de
  revalidação.
- Um `npm run build` foi rodado uma vez **sem** o `VITE_API_URL` local e
  embutiu a URL de produção no `dist/` local (ignorado pelo Git, nada
  servido, nenhuma requisição). Refeito com a URL local na sequência; o
  `dist/` atual não tem a URL de produção.
- Leitura por tecnologia assistiva: só por nomes acessíveis e papéis ARIA;
  sem leitor de tela.

### 13.10 Pendências e próximos critérios de aceite

1. Decidir a classe 3 (conta de serviço) na API antes de ligar a FE-5.
2. Regra de ações de equipe no front (classe 2) e erro de escrita sem
   derrubar a página — numa etapa própria.
3. Saída para o 403 na revalidação.
4. Para publicar: a ordem da seção 11, `SETORES_TI_IDS` validada por pessoa,
   e a homologação repetida no ambiente que for receber a imagem.

Nada foi publicado: sem push, PR, merge ou deploy; a Qualidade não foi ligada
fora do banco descartável.
