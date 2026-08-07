---
name: hsweb-env-check
description: Verifica variáveis de ambiente do ChamadosHS — VITE_ no front, settings do FastAPI no back, e build args do Docker/Easypanel. Usar antes de deploy, ao alterar configuração, ou quando a aplicação aponta para o ambiente errado.
---

# Skill: Env Check — ChamadosHS

## Objetivo

Garantir que as variáveis estejam corretas em cada ambiente, sem valor de
desenvolvimento vazando para produção e sem segredo exposto.

> Não usar checagens de `NODE_ENV` — este projeto usa `VITE_*` no front e
> `ENVIRONMENT` no back.

## Mapa de variáveis

### Front-end (`chamadoshs-sistema`)

| Variável | Origem | Observação |
|---|---|---|
| `VITE_API_URL` | `.env` (local) / build arg (Docker) | URL base da API |

Consumida em `src/services/api.ts`, com fallback para `http://localhost:8000`.

### Back-end (`chamadoshs-api`)

Definidas em `app/core/config.py` via `pydantic-settings`:

| Variável | Obrigatória | Padrão |
|---|---|---|
| `DATABASE_URL` | ✅ sim | — (app não sobe sem) |
| `SECRET_KEY` | ✅ sim | — (app não sobe sem) |
| `ALGORITHM` | não | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | não | `30` |
| `ALLOWED_ORIGINS` | não | `http://localhost:5173` ⚠️ |
| `ENVIRONMENT` | não | `development` ⚠️ |

As duas últimas têm padrão de desenvolvimento: **se não forem definidas
explicitamente em produção, o app sobe com valor de dev silenciosamente.**

## O que verificar

### 1. A pegadinha do `VITE_` (a mais importante deste projeto)

Variáveis `VITE_*` são **embutidas no bundle em tempo de build**, não lidas em
runtime. Duas consequências:

- **Nunca colocar segredo em `VITE_*`** — fica legível no navegador de qualquer usuário
- Trocar a variável no painel do Easypanel **não muda nada** se a imagem não for
  rebuildada. Tem que ser **build arg**, não env var de runtime

O `dockerfile` do front declara `ARG VITE_API_URL` / `ENV VITE_API_URL=${VITE_API_URL}`
antes do `npm run build`. Se o build arg não for passado, o bundle sai com o
fallback `localhost:8000` e o sistema não funciona em produção.

### 2. `.env` entrando no contexto de build ⚠️

O `.dockerignore` do front **não exclui `.env`**, e o `dockerfile` faz `COPY . .`.
Ou seja: o `.env` da máquina de quem builda entra na imagem e o Vite o lê durante
o build, disputando com o `ARG`.

Ao revisar, verificar:
- `.env` está listado no `.dockerignore` do front? (hoje: **não**)
- Se não estiver, qual valor efetivamente venceu no bundle?

Como conferir o valor que foi embutido de fato:
```bash
grep -o "https\?://[^\"']*" dist/assets/*.js | sort -u
```

> O `.dockerignore` do back **já** exclui `.env` corretamente — usar como referência.

### 3. Vazamento de ambiente

- `ENVIRONMENT=development` em produção → ❌
- `ALLOWED_ORIGINS` contendo `localhost` em produção → ❌
- `VITE_API_URL` apontando para `localhost` na imagem de produção → ❌
- `DATABASE_URL` de produção usado em desenvolvimento → ❌ (risco de escrever em dado real)
- `SECRET_KEY` igual ao exemplo (`sua-chave-secreta-aqui...`) ou ao do
  `docker-compose.yml` (`dev-secret-key-change-in-production`) → 🔴 crítico:
  quem conhece a chave forja qualquer token

### 4. Secrets no código

- Padrão de chave/token/hash hardcoded fora de variável de ambiente
- Connection string com senha direto no código
- URL de webhook com identificador fixo no código-fonte
  (hoje: `WEBHOOK_URL` está hardcoded em `app/services/webhook_service.py` —
  não é segredo forte, mas é configuração que deveria ser variável)

### 5. Consistência com o `.env.example`

- Variável usada no código mas ausente do `.env.example` → ⚠️ não documentada
- Variável no `.env.example` mas nunca usada → ℹ️ pode remover
- O `.env.example` do front sugere `localhost:8000`; o `.env` real aponta para
  produção. **Isso é intencional** — o usuário não roda o back localmente. Não
  reportar como erro.

## Formato de saída

```
ENV CHECK — ChamadosHS
======================
✅ Presença: DATABASE_URL e SECRET_KEY definidas
❌ Vazamento: ENVIRONMENT=development na imagem de produção
⚠️  Build: .env não está no .dockerignore do front — pode sobrescrever o ARG
🔴 Secret: SECRET_KEY igual ao valor do docker-compose
ℹ️  Doc: WEBHOOK_URL hardcoded — considerar mover para variável
```

## Observações

- **Nunca logar o valor** de uma variável, só presença/ausência
- Ao reportar secret exposto, citar só o caminho e a linha, nunca o valor
- Lembrar que o deploy é manual pelo usuário no Easypanel — mudança de variável
  no front **exige rebuild**, no back basta restart
