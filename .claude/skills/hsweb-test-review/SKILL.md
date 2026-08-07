---
name: hsweb-test-review
description: Revisa testes do ChamadosHS e identifica cenários sem cobertura — pytest no back FastAPI, Vitest/RTL no front React. Usar após implementar feature, antes de refatorar, ou ao decidir por onde começar a testar.
---

# Skill: Test Review — ChamadosHS

## Objetivo

Analisar testes de um módulo, apontar gaps e sugerir casos ausentes — sem gerar
código a menos que solicitado.

## Estado atual do projeto ⚠️

**Nenhum dos dois repositórios tem teste automatizado.** Não há `pytest`,
`vitest`, `jest`, nem script `test` no `package.json`.

Consequência prática: **toda validação hoje é manual, e o `.env` local aponta
para a API de produção** — ou seja, testar manualmente significa mexer em dados
reais da HS.

Enquanto não houver testes, esta skill opera em modo **"por onde começar"** em
vez de "revisar o que existe".

## Stack recomendada quando for implementar

| | Back (`chamadoshs-api`) | Front (`chamadoshs-sistema`) |
|---|---|---|
| Runner | `pytest` | `vitest` (integra com o Vite já usado) |
| HTTP | `TestClient` do FastAPI / `httpx` | `msw` para mockar a API |
| Componentes | — | `@testing-library/react` |
| Banco | SQLite em memória ou Postgres descartável via fixture | — |

> Nunca apontar a suíte de testes para o banco de produção. Se a fixture não
> conseguir subir um banco isolado, o teste não roda — falhar é melhor que
> escrever em dado real.

## Prioridade: por onde começar

Ordenado por risco × esforço:

1. **Autenticação da API** — que rota exige token e qual não exige. É o teste de
   maior valor hoje, dado que a API está aberta. Ver o procedimento de varredura
   em `hsweb-security-audit`
2. **Cálculo de SLA** (`app/services/sla_service.py`) — lógica pura, sem
   dependência de banco, com muitos casos de borda. Barato de testar e caro de
   quebrar sem perceber
3. **Recorrência** (`app/services/recorrencia_service.py`) — também função pura,
   com casos de borda óbvios (dia 31 em fevereiro, virada de ano)
4. **Endpoints de chamados** — CRUD + transições de status
5. **Front**: `roleMapper`, depois os serviços de API, depois componentes

Os itens 2 e 3 são o melhor ponto de partida: **função pura, entrada e saída
determinísticas, zero setup de banco**.

## O que analisar (quando houver testes)

### 1. Cobertura de cenários, não de linhas

- **Happy path** — o fluxo principal funciona?
- **Casos de borda** — nulo, vazio, limite. Exemplos reais deste domínio:
  chamado sem `data_abertura`, prioridade sem config de SLA, tarefa mensal no
  dia 31 caindo em fevereiro, chamado reaberto depois de resolvido
- **Erros** — banco fora do ar, n8n retornando 500 ou timeout (o webhook precisa
  falhar sem derrubar a criação do chamado)
- **Autenticação** — cada rota protegida testada **com e sem** token, e com token
  expirado
- **Autorização** — Usuário comum consegue ver chamado de outro? Deve falhar
- **Fuso horário** — o projeto usa horário de Brasília (`app/utils/timezone.py`);
  teste que passa em UTC e quebra em produção é armadilha clássica aqui

### 2. Qualidade dos testes existentes

- Assertion vaga (`assert result` / `expect(x).toBeTruthy()`) não prova nada
- Teste que depende da ordem de execução é frágil
- Mock que esconde o comportamento real em vez de isolá-lo
- Estado compartilhado entre testes por falta de setup/teardown
- Teste que depende de "hoje" sem congelar o relógio — com recorrência e SLA
  isso quebra sozinho com o passar do tempo

### 3. Nomenclatura

O nome do teste deve ler como documentação:

```
✅ "deve retornar 401 quando o token expirou"
✅ "tarefa mensal no dia 31 cai no dia 28 em fevereiro"
❌ "testa sla"
```

Como o projeto é escrito em português (commits, comentários, domínio), manter os
nomes de teste em português também.

## Formato de resposta

```
TEST REVIEW — [módulo]
======================
✅ Coberto: happy path, prioridade sem config
❌ Ausente: chamado reaberto, período em Aguardando cruzando fim de semana
⚠️  Frágil: usa datetime.now() sem congelar — vai quebrar sozinho
💡 Sugestão: extrair fixture de chamado com histórico para reuso
```

Ao final, perguntar: **"Quer que eu escreva os casos ausentes?"**

## Observações

- Não reescrever teste que funciona, só o que está incorreto
- Priorizar por criticidade do módulo
- Se o módulo não tem teste nenhum, sugerir de 3 a 5 casos iniciais concretos —
  não uma suíte inteira de uma vez
- Ver `hsweb-refactor`: refatoração sem teste é só reorganizar o risco
