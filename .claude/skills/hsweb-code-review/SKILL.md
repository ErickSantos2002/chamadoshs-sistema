---
name: hsweb-code-review
description: Revisão de código do ChamadosHS — React/TypeScript no front e FastAPI/Python no back. Usar ao revisar arquivo, função ou alteração antes de commitar. Delega para hsweb-security-audit e hsweb-api-review conforme o tipo de arquivo.
---

# Skill: Code Review — ChamadosHS

## Objetivo

Revisão detalhada e contextualizada, aproveitando o histórico da sessão para não
repetir sugestão já discutida nem contrariar decisão já tomada.

## Contexto dos dois repositórios

| | `chamadoshs-sistema` (front) | `chamadoshs-api` (back) |
|---|---|---|
| Linguagem | TypeScript / React 19 | Python 3.11 / FastAPI |
| Estado | Context API (4 contexts) — **não usa React Query** | — |
| HTTP | Axios com interceptors em `src/services/api.ts` | — |
| Camadas | `pages` → `context` → `services` → API | `endpoints` → `services` → `models` |
| Deploy | Easypanel (manual, pelo usuário) | Easypanel (manual, pelo usuário) |

Convenções do projeto:
- Código, comentários, commits e domínio em **português**
- Tailwind com suporte a dark mode em toda tela
- Toda chamada à API passa pelos serviços de `src/services/chamadoshsapi.ts` —
  componente **nunca** chama `axios` direto

## Como executar

### 1. Contexto da sessão

Antes de revisar, considerar o que já foi estabelecido: decisões de arquitetura
tomadas, padrões acordados, e itens que o usuário já decidiu não tratar.

### 2. Delegação por tipo de arquivo

| Arquivo | Delegar para |
|---|---|
| `app/api/endpoints/*.py` | `hsweb-api-review` |
| `auth.py`, `deps.py`, `security.py`, `config.py`, `main.py` | `hsweb-security-audit` |
| `.env*`, `dockerfile`, `docker-compose.yml` | `hsweb-env-check` |
| Arquivo de teste | `hsweb-test-review` |

Incorporar o resultado na seção correspondente em vez de duplicar a análise.

### 3. Categorias de análise

**Qualidade**
- O código faz o que se propõe?
- Lógica duplicada que caberia extrair?
- Nomes comunicam intenção? (domínio em português — `chamado`, `solicitante`,
  `tarefa recorrente`; evitar mistura com inglês no mesmo escopo)

**Front-end especificamente**
- `useEffect` sem array de dependência correto, ou faltando cleanup
- `useCallback`/`useMemo` com dependência errada causando loop de render
- Chamada à API dentro de componente sem passar pelo service
- Estado derivado guardado em `useState` quando poderia ser calculado
- Tratamento de erro: o usuário vê um toast, ou o erro morre no `console.error`?
- Dark mode: toda cor nova tem variante `dark:`?
- Lista sem `key` estável (índice de array não conta)

**Back-end especificamente**
- Sessão do banco (`db`) obtida fora do `Depends(get_db)`
- N+1 query em listagem — falta `joinedload`/`selectinload`
- `commit()` sem `rollback()` no caminho de erro
- Exceção genérica engolindo erro real (`except Exception: pass`)
- Datas: usar `agora_brasilia()` de `app/utils/timezone.py`, nunca
  `datetime.now()` puro — o sistema opera em horário de Brasília
- `response_model` ausente, devolvendo o objeto ORM inteiro

**Segurança**
- Ver delegação acima. Nunca aprovar endpoint novo sem verificar autenticação

**Manutenibilidade**
- Segue o padrão do restante do projeto?
- Arquivos já grandes (`ChamadoDetalhes.tsx`, `TarefasRecorrentes.tsx`,
  `Dashboard.tsx` passam de 1000 linhas) — evitar engordar mais sem necessidade
- Está testável? (hoje não há testes — ver `hsweb-test-review`)

### 4. Formato da resposta

1. **Resumo geral** — 1 a 2 linhas
2. **Pontos críticos** — precisa corrigir
3. **Sugestões** — recomendado, não obrigatório
4. **Positivos** — o que está bem feito (não pular)

## Observações

- Direto, mas construtivo
- Sempre incluir exemplo de correção quando aplicável
- Se a alteração for no back-end, lembrar que **o usuário precisa subir manualmente
  pelo Easypanel** — e se front e back mudam juntos, dizer a ordem
- Não sugerir bibliotecas novas sem necessidade real; o projeto é deliberadamente
  enxuto no front
