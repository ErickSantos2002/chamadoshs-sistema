---
name: hsweb-refactor
description: Propõe refatorações no ChamadosHS (React/TypeScript e FastAPI/Python) com foco em legibilidade e manutenção. Usar em código que funciona mas é difícil de entender, ou antes de adicionar feature sobre código problemático. Nunca altera sem aprovação.
---

# Skill: Refactor — ChamadosHS

## Objetivo

Identificar e propor melhorias estruturais sem alterar comportamento externo.
Mais fácil de ler, testar e manter — não apenas mais "elegante".

## Princípio fundamental

> Refatoração sem teste é apenas reorganizar o risco.

**Este projeto não tem nenhum teste automatizado.** Toda proposta de refatoração
precisa começar reconhecendo isso e sugerir uma das duas rotas:

1. Escrever teste de caracterização antes (ver `hsweb-test-review`) — preferível
   para lógica de negócio como SLA e recorrência
2. Refatorar em passos pequenos e verificáveis manualmente, um commit por passo —
   aceitável para mudança estrutural de componente visual

Nunca propor refatoração grande e sem rede em código de SLA, recorrência ou
autenticação.

## Alvos conhecidos

Os maiores arquivos do front, todos concentrando tela + estado + lógica:

| Arquivo | Linhas |
|---|---|
| `src/pages/ChamadoDetalhes.tsx` | ~1590 |
| `src/pages/TarefasRecorrentes.tsx` | ~1121 |
| `src/pages/Dashboard.tsx` | ~1017 |
| `src/components/cadastros/UsuariosTab.tsx` | ~565 |

Não são urgentes. Valem refatoração **quando já houver motivo para mexer neles** —
não como projeto isolado.

## O que analisar

### Complexidade
- Componente React acumulando muitos `useState` — sinal de `useReducer` ou de
  estado que deveria estar num context
- Função com mais de 30 linhas fazendo mais de uma coisa
- Condicional aninhada além de 3 níveis
- JSX com lógica de negócio embutida no meio do markup

### Duplicação
- Mesma chamada de API repetida em vários componentes em vez de usar o service
- Formatação de data/status/prioridade copiada entre telas — candidata a util
- Modal com estrutura repetida (`CategoriaModal`, `SetorModal`, `UsuarioModal`
  seguem o mesmo formato)
- No back: bloco de histórico/auditoria repetido entre endpoints

### Acoplamento
- Componente chamando `axios` direto em vez de passar pelo service
- Página lendo `localStorage` direto em vez de usar o `AuthContext`
- Endpoint com regra de negócio que deveria estar em `app/services/`

### Nomenclatura
- Variável `data`, `result`, `temp`, `item` sem contexto
- Mistura de português e inglês no mesmo escopo — o domínio é em português,
  manter consistente
- Booleano sem prefixo `is/has/should/pode/tem`

### Específico deste projeto
- Lógica de permissão espalhada em vez de centralizada (`roleMapper` existe —
  usar)
- Cor hardcoded em vez de token do Tailwind, ou variante `dark:` faltando
- `useEffect` fazendo fetch que já é responsabilidade de um context

## Formato de resposta

Para cada oportunidade:

```
📍 src/pages/ChamadoDetalhes.tsx — bloco de comentários (linhas 890-1080)
🔍 Problema: 190 linhas misturando fetch, estado local e render
💡 Sugestão: extrair <ComentariosChamado chamadoId={id} /> com estado próprio
⚠️  Pré-requisito: sem teste cobrindo — refatorar em 3 commits verificáveis
📊 Impacto: alto (arquivo alterado com frequência)
```

Ao final, perguntar: **"Por qual quer começar?"**

## Regras

- **Nunca alterar código diretamente** — propor, explicar, aguardar aprovação
- Priorizar por impacto: complexidade alta em código frequentemente alterado
- Nada por gosto estético — todo item precisa de justificativa objetiva
- Refatoração que muda contrato da API afeta os **dois repositórios** — sinalizar
- Usar o contexto da sessão para não repropor o que já foi descartado
