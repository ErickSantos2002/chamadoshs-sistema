---
name: hsweb-security-audit
description: Auditoria de segurança do ChamadosHS — FastAPI/PostgreSQL no back e React/Vite no front. Usar ao revisar autenticação, routers da API, configuração de CORS/env, ou quando o usuário pedir auditoria. Também é acionada pela hsweb-code-review em arquivos críticos.
---

# Skill: Security Audit — ChamadosHS

## Objetivo

Encontrar vulnerabilidades antes que cheguem à produção, considerando que o
ChamadosHS existe para atender **ISO 27001** — uma falha de rastreabilidade aqui
não é só bug, é achado de auditoria.

## Contexto do sistema

Dois repositórios independentes:

| | Back-end | Front-end |
|---|---|---|
| Repo | `chamadoshs-api` | `chamadoshs-sistema` |
| Stack | FastAPI 0.110, SQLAlchemy 2.0, Pydantic 2.5 | React 19, Vite 7, TypeScript, Axios |
| Banco | PostgreSQL (psycopg2) | — |
| Auth | JWT via python-jose, hash via passlib/bcrypt | token no `localStorage` |
| Deploy | Docker → Easypanel | Docker + nginx → Easypanel |

A API é **pública na internet** (`chamadoshsapi.healthsafetytech.com`). O n8n
recebe webhooks de saída, mas **não consome** a API — nenhum outro cliente além
do front depende dela.

> ⚠️ Não aplicar checagens de Node.js/Express/MongoDB/Vercel — não é a stack deste projeto.

## Categorias de análise

### 1. Autenticação e autorização (FastAPI)

O ponto de maior risco neste projeto. Verificar:

- **Router sem proteção**: todo `include_router()` em `main.py` que não tenha
  `dependencies=[Depends(get_current_user)]` está aberto ao mundo. Conferir
  também dependência no próprio `APIRouter()` e por endpoint.
- **Identidade vinda do cliente**: parâmetros como `?usuario_id=` definindo quem
  praticou a ação. É falsificável — a identidade deve sair de `current_user.id`,
  nunca da URL ou do body. Em sistema com trilha de auditoria isso é 🔴.
- **`SECRET_KEY`**: valor de exemplo, curto ou versionado? Deve ser gerado com
  `openssl rand -hex 32` e vir só do ambiente.
- **Expiração**: `ACCESS_TOKEN_EXPIRE_MINUTES` definido? Existe fluxo de refresh
  realmente usado pelo front, ou o usuário só é expulso?
- **Rate limiting** em `/auth/login` — sem isso, brute force é livre.
- **Roles**: endpoints administrativos verificam `role_id`? Esconder o botão no
  React **não é** controle de acesso.
- **Enumeração de usuário**: `/auth/login` responde diferente para "usuário não
  existe" e "senha errada"?

### 2. Injeção

- **SQL**: `db.execute(text(...))` construído com f-string ou concatenação de
  input do usuário. `text()` com string literal fixa é seguro; o perigo é a
  interpolação. Queries via ORM (`.filter(Model.campo == valor)`) são
  parametrizadas e seguras.
- **XSS no front**: `dangerouslySetInnerHTML` com conteúdo vindo da API
  (descrição de chamado, comentário) — campos preenchidos pelo usuário.
- **Path traversal**: nome de arquivo do usuário usado direto ao salvar anexo.

### 3. Exposição de dados

- Schema Pydantic de resposta devolvendo `senha_hash` ou campos internos.
  Conferir `response_model` — sem ele, o FastAPI devolve o objeto inteiro.
- **Endpoints de diagnóstico/debug públicos** — expõem topologia, contagem de
  usuários, quais contas não têm senha.
- `/docs` e `/redoc` abertos em produção: entregam o mapa completo da API.
- `HTTPException(detail=str(e))` vazando stack trace ou erro de banco.
- `print()` de payload com dado pessoal (fica no log do container).

### 4. Configuração

- `allow_origins=["*"]` combinado com `allow_credentials=True`.
- `ALLOWED_ORIGINS` contendo `localhost` em produção.
- `ENVIRONMENT=development` em produção.
- **CORS não é proteção de API** — é regra que o navegador respeita
  voluntariamente. `curl` ignora. Nunca tratar CORS como controle de acesso.
- HTTPS forçado no proxy do Easypanel?

### 5. Front-end

- **Segredo em variável `VITE_*`**: tudo que tem esse prefixo é embutido no
  bundle em tempo de build e fica legível no navegador. 🔴 se houver token,
  senha ou chave.
- Token em `localStorage` é vulnerável a XSS (`httpOnly cookie` é mais seguro,
  porém é mudança de arquitetura — classificar como 🔵 a menos que haja XSS real).
- Regra de permissão existente só no front, sem contrapartida no back.

### 6. Dependências

- Back: `pip-audit` ou `pip list --outdated` (**não** `npm audit`).
- Front: `npm audit` — esse sim se aplica.
- Versões pinadas no `requirements.txt` facilitam rastrear CVE.

## Procedimento: varredura de autenticação

Teste que responde objetivamente "a API está protegida?":

1. Baixar a superfície da API: `GET /openapi.json`
2. Para cada rota, chamar **sem** header `Authorization`
3. Esperado: `401` em tudo, exceto `/`, `/health` e `/api/v1/auth/login`

Qualquer rota que devolva `200` sem token é 🔴. Como usa só requisições de
leitura, pode rodar contra produção sem escrever nada.

## Severidade

- 🔴 **Crítico** — exploração direta, autenticação ausente, dado sensível exposto, auditoria falsificável
- 🟠 **Alto** — requer encadeamento mas tem impacto real
- 🟡 **Médio** — configuração ruim, boa prática violada
- 🔵 **Informativo** — sugestão de hardening

## Formato de saída

```
SECURITY AUDIT — ChamadosHS
===========================
🔴 CRÍTICO: router de chamados sem autenticação — chamadoshs-api/main.py:50
   → adicionar dependencies=[Depends(get_current_user)] no include_router
🔴 CRÍTICO: usuario_id vindo da query string permite forjar autoria no histórico
   → chamadoshs-api/app/api/endpoints/chamados.py — usar current_user.id
🟠 ALTO: sem rate limiting em /auth/login — brute force livre
🟡 MÉDIO: /docs público em produção
🔵 INFO: token em localStorage — avaliar httpOnly cookie no futuro
```

## Observações

- **Não corrija automaticamente** — liste, explique, decisão é do usuário
- Para cada 🔴, incluir o trecho de código da correção
- Nunca imprimir valor de secret no relatório, só o caminho onde foi encontrado
- Alterações no back-end **não sobem sozinhas**: o deploy é manual via Easypanel
- Ver [[hsweb-api-review]] para revisão de contrato de endpoint e [[hsweb-env-check]]
  para variáveis de ambiente
