---
name: hsweb-deploy-check
description: Checklist pré-deploy do ChamadosHS para Easypanel + Docker (front React/nginx e back FastAPI/PostgreSQL). Usar antes de subir qualquer alteração para produção. Nunca executa o deploy.
---

# Skill: Deploy Check — ChamadosHS

## Objetivo

Rodar um checklist completo antes de subir para produção, cobrindo código,
ambiente, banco, container e rollback.

> Este projeto **não usa Vercel**. Ambos os repositórios sobem como container
> Docker no **Easypanel**, e **o deploy é sempre manual, feito pelo usuário**.
> Nunca executar deploy — apenas preparar e verificar.

## Contexto de infraestrutura

| | Front (`chamadoshs-sistema`) | Back (`chamadoshs-api`) |
|---|---|---|
| Build | Node 20 alpine → `npm run build` | Python 3.11 slim |
| Runtime | nginx 1.25 alpine | uvicorn |
| Porta | nginx escuta **80** (`EXPOSE 40` no dockerfile ⚠️ divergente) | 8000 |
| Config | **build arg** `VITE_API_URL` | env vars em runtime |
| Rebuild obrigatório ao mudar env? | **sim** | não, basta restart |
| Healthcheck | não tem | `/health`, configurado no Dockerfile |

## Sequência de verificação

### 1. Código

- [ ] Branch correto (`main` é produção)
- [ ] `git status` limpo — nada não commitado que devesse subir
- [ ] Build passa: `npm run build` (front) — **não existe `npm test` neste projeto**
- [ ] Nenhum `console.log` de debug ou `TODO` crítico esquecido
- [ ] Nenhum `print()` de dado sensível no back (vai para o log do container)

### 2. Variáveis de ambiente

> Executar a skill `hsweb-env-check` e incorporar o resultado aqui.

- [ ] `VITE_API_URL` passado como **build arg** no Easypanel (não como env de runtime)
- [ ] `DATABASE_URL` e `SECRET_KEY` definidos no serviço do back
- [ ] `ENVIRONMENT=production` e `ALLOWED_ORIGINS` sem `localhost`
      (ambos têm padrão de dev — se esquecer, sobe errado em silêncio)
- [ ] `SECRET_KEY` diferente do valor do `docker-compose.yml`

### 3. Banco de dados

Não há Alembic em uso apesar de estar no `requirements.txt` — as migrations são
**arquivos `.sql` aplicados à mão** (`migrations/*.sql`, `add_*.sql` na raiz).

- [ ] Há `.sql` novo para aplicar? Qual, e em que ordem?
- [ ] **Backup do banco feito antes de aplicar** — não há down migration escrita
- [ ] O SQL é idempotente (`IF NOT EXISTS`) ou quebra se rodar duas vezes?
- [ ] A ordem está certa: migration **antes** do código que depende dela

### 4. Ordem de subida (crítico — dois repositórios)

Quando front e back mudam juntos, a ordem evita janela de erro:

| Tipo de mudança | Ordem |
|---|---|
| Campo novo na API (aditivo) | back → front |
| Campo removido/renomeado | front → back |
| Endpoint novo consumido pelo front | back → front |
| Só visual no front | front |

- [ ] A ordem foi decidida e comunicada?
- [ ] Se o back subir primeiro, o front antigo continua funcionando?

### 5. Container

- [ ] Imagem buildada a partir do commit certo
- [ ] Front: confirmar que o bundle saiu com a URL certa
      (`grep -o "https\?://[^\"']*" dist/assets/*.js | sort -u`)
- [ ] Back: healthcheck em `/health` respondendo depois de subir
- [ ] Front: sem healthcheck configurado — validar manualmente abrindo a aplicação

### 6. Verificação pós-deploy (smoke test manual)

Não há teste automatizado, então esta etapa é obrigatória:

- [ ] Login funciona
- [ ] Listagem de chamados carrega
- [ ] Abrir um chamado de teste → confirmar que o webhook do n8n disparou
- [ ] Dashboard renderiza os gráficos
- [ ] Se mexeu em autenticação: rota protegida sem token devolve `401`

### 7. Rollback

- [ ] Sabe qual commit/imagem anterior restaurar?
- [ ] Se aplicou migration, dá para voltar sem perder dado? (não há down migration —
      o rollback do banco é o backup do item 3)
- [ ] Alguém está usando o sistema agora? Deploy em horário de expediente derruba
      a sessão de quem está com chamado aberto

## Formato de resposta

Para cada seção: ✅ OK · ⚠️ Atenção — [detalhe] · ❌ Bloqueante — [não suba até resolver]

## Observações

- **Nunca executar o deploy** — quem sobe é o usuário, pelo Easypanel
- Qualquer ❌ bloqueia o deploy
- Alteração no back-end exige avisar o usuário explicitamente: ele precisa subir
  o repositório `chamadoshs-api` separadamente
- Divergência conhecida: `EXPOSE 40` no dockerfile do front contra `listen 80`
  no `nginx.conf`. Como `EXPOSE` é apenas declarativo, hoje funciona — mas se o
  Easypanel for configurado pela porta declarada, falha. Verificar se o serviço
  aponta para a **80**
