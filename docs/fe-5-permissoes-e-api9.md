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

1. **Rascunho do modal some quando o quadro muda** (anterior ao FE-5, não
   corrigido). O efeito de carga do `ChamadoModal` depende de `buscarChamado`,
   que muda a cada mudança da lista do contexto. Cada `aplicarChamado` (mudar
   o status, por exemplo) refaz o efeito: limpa o comentário digitado e relê
   os comentários. Fora do escopo. Pede um efeito que dependa só do
   `chamadoId`.
2. **Toast "Chamado não encontrado" junto da tela de perda de acesso** no
   atendimento da Qualidade. Vem de `interpretarErroDoAtendimento` e foi
   mantido para não mudar o comportamento testado do FE-3.
3. **404 na carga inicial do modal** (comentários ou chamado) é "não
   encontrado", não perda de acesso. Só a releitura e as escritas encerram.
4. **Falha não-404 na releitura da página** troca a página pela tela de erro,
   como antes. O estado "Não foi possível atualizar…" das ações aparece no
   modal.
5. **A limpeza do estado na perda de acesso não é observável pelo DOM.** A
   tela de encerramento é desenhada antes de tudo. Por isso a mutação "não
   limpa comentários" sobreviveu aos testes; a limpeza é defesa em
   profundidade.
6. **Revisão visual e de acessibilidade não feita** (sem navegador isolado).
   Ficam registrados, sem correção nesta etapa:
   - o contraste da opção escolhida no `Seletor`
     (`font-medium text-sinal` sobre `bg-sinal/15`);
   - os botões pequenos (`tamanho="sm"`) do `AcoesRapidas`.
7. **Sem teste integrado** com as duas pontas no ar (API-9 e FE-5). Tudo foi
   validado por testes automatizados contra os contratos das APIs 5–9.
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
