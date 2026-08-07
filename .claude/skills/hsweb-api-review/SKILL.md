---
name: hsweb-api-review
description: Revisão de endpoints da API ChamadosHS (FastAPI) — contrato, status codes, segurança, paginação e alinhamento com o front. Usar ao criar ou alterar endpoints, ou quando front e back divergem no contrato.
---

# Skill: API Review — ChamadosHS

## Objetivo

Revisar endpoints do `chamadoshs-api` (FastAPI) verificando design, segurança e
**consistência com o que o front realmente consome**. Este último ponto é o que
mais gera bug neste projeto: os dois repositórios evoluem separados e o contrato
sai de sincronia.

## Contexto

- API FastAPI sob o prefixo `/api/v1/...`, um router por recurso em `app/api/endpoints/`
- Contratos em Pydantic (`app/schemas/`), models SQLAlchemy (`app/models/`)
- Consumidor único: o front `chamadoshs-sistema`, via `src/services/chamadoshsapi.ts`
- O n8n **recebe** webhook, não chama a API
- OpenAPI gerado automaticamente em `/openapi.json`, docs em `/docs`

## O que analisar

### 1. Alinhamento front ↔ back (prioridade neste projeto)

Sempre que revisar um endpoint, abrir o serviço correspondente no front:

- O tipo em `src/types/api.ts` bate campo a campo com o schema Pydantic?
- Campo opcional no back (`Optional[...]`) está opcional no TS (`?`)?
- O front espera envelope (`{data: [...]}`) ou array puro? A API hoje devolve **array puro** nas listagens
- Mudança de campo quebra o front? Não há versionamento além do `/v1` — toda alteração é breaking na prática

> Há precedente: o commit `d8d24b9 fix(cadastros): alinha leitura de campos ao
> contrato real da API` corrigiu exatamente esse tipo de divergência.

### 2. Segurança

> Acionar a skill `hsweb-security-audit` para endpoints de autenticação e para
> qualquer router recém-criado, e incorporar o resultado nesta seção.

- O router foi registrado em `main.py` **com** `dependencies=[Depends(get_current_user)]`?
- A identidade do autor vem de `current_user`, e não de `?usuario_id=`?
- Endpoint administrativo verifica `role_id`?
- Input validado pelo Pydantic antes de tocar o banco?

### 3. Design e nomenclatura

- Recurso no plural: `/chamados`, `/usuarios`, `/tarefas-recorrentes` ✅ (padrão já seguido)
- Verbos HTTP:
  - `GET` leitura sem efeito colateral
  - `POST` criação (`/chamados/`, `/tarefas-recorrentes/{id}/realizar`)
  - `PUT` substituição completa
  - `PATCH` mudança de estado pontual (`/chamados/{id}/cancelar`, `/arquivar`)
  - `DELETE` remoção
- Ação de estado como sub-recurso (`/{id}/cancelar`) é aceitável e é o padrão do projeto — manter consistente

### 4. Status codes

| Código | Quando |
|---|---|
| `200` | sucesso com body |
| `201` | criação (FastAPI: `status_code=status.HTTP_201_CREATED`) |
| `204` | sucesso sem body (DELETE) |
| `400` | erro de requisição |
| `401` | não autenticado |
| `403` | autenticado, sem permissão |
| `404` | não encontrado |
| `409` | conflito — **já usado**: excluir tarefa recorrente com execuções, excluir categoria com chamados vinculados |
| `422` | validação do Pydantic (automático) |
| `500` | erro inesperado |

Ao devolver `409`, o `detail` deve dizer **por quê** e trazer o dado que permite
ao front montar a mensagem (ex.: quantidade de vínculos).

### 5. Paginação

A listagem de chamados usa `skip`/`limit` com teto por resposta — por isso o
front tem `listarTodos()` que varre página a página em lotes de 200
(`src/services/chamadoshsapi.ts`).

- Endpoint novo que pode crescer tem `skip`/`limit`?
- O limite máximo está documentado no schema?
- Se mudar o teto do back, o front continua correto?

### 6. Performance

- **N+1 query**: listagem que percorre `chamado.solicitante`, `.categoria`,
  `.tecnico_responsavel` sem `joinedload`/`selectinload` dispara uma query por
  registro. Com paginação de 200, são 600+ queries.
- Cálculo de SLA percorre todo o histórico do chamado — verificar se está sendo
  feito por item dentro de um loop de listagem.
- Campo pesado (`descricao`, `solucao`) retornado em listagem que só mostra card.

## Formato de resposta

```
API REVIEW — POST /api/v1/chamados/
===================================
✅ Nomenclatura: recurso no plural, verbo correto
❌ Status code: retorna 200 na criação — deveria ser 201
🔒 Segurança: router sem dependencies=[Depends(get_current_user)] — main.py:50
⚠️  Contrato: campo `urgencia` é Optional no back mas obrigatório em types/api.ts
💡 Performance: sem joinedload em solicitante/categoria — N+1 na listagem
🔗 Front: src/services/chamadoshsapi.ts:168 precisa mudar junto
```

## Observações

- Revisar **todos os endpoints do mesmo recurso juntos** — inconsistência entre
  irmãos é o defeito mais comum
- Toda mudança de contrato exige listar o que muda no front, arquivo e linha
- Back-end não sobe sozinho: mudanças exigem deploy manual do usuário no Easypanel.
  Se front e back mudam juntos, avisar a **ordem** de subida para não quebrar produção
