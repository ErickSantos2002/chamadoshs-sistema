---
name: hsweb-changelog-update
description: Gera ou atualiza o CHANGELOG.md do ChamadosHS a partir dos commits, com atenção a mudanças que exigem migration ou rebuild. Usar ao fechar um conjunto de entregas. Nunca sobrescreve versões já publicadas.
---

# Skill: Changelog Update — ChamadosHS

## Objetivo

Manter um `CHANGELOG.md` no formato [Keep a Changelog](https://keepachangelog.com),
com base nos commits do período.

## Estado atual

**Nenhum dos dois repositórios tem `CHANGELOG.md`** e **não há tags de versão** —
`package.json` está em `1.0.0` fixo. Na primeira execução, criar o arquivo do zero.

Como não há tags, a fonte é sempre o log por período:

```bash
git log --since="2026-01-01" --oneline
git log -20 --oneline
```

O histórico recente segue conventional commits (`feat`/`fix`/`chore` com escopo),
o que permite categorizar automaticamente. Commits antigos usam formato livre —
para esses, ler o diff antes de categorizar.

## Mapeamento de commit → categoria

| Commit | Categoria |
|---|---|
| `feat(...)` | **Added** (ou **Changed** se altera comportamento existente) |
| `fix(...)` | **Fixed** |
| `chore(deps)` com correção de vulnerabilidade | **Security** |
| `chore(...)` geral | normalmente não entra no changelog |
| remoção de endpoint/tela | **Removed** |

## Estrutura

```markdown
# Changelog

## [Não publicado]

## [1.1.0] - 2026-08-07

### Added
- Tarefas recorrentes: cadastro, execução e histórico

### Changed
- Lembrete do dia passa a manter a tarefa já realizada visível

### Fixed
- Dashboard não mostra mais 0% quando não há dados de SLA

### Security
- Autenticação obrigatória em todos os endpoints da API

### ⚠️ Requer ação no deploy
- Migration: `migrations/add_tarefas_recorrentes.sql`
- Rebuild da imagem do front (mudou `VITE_API_URL`)
```

A seção **"Requer ação no deploy"** é específica deste projeto e não faz parte do
Keep a Changelog padrão. Ela existe porque o deploy é manual e as migrations são
aplicadas à mão — sem esse aviso, a informação se perde.

## Regras de escrita

- Escrever para quem **usa** o sistema (equipe de TI da HS), não para quem programou
- Evitar jargão: "Refatorou o service de SLA" → "Cálculo de SLA passa a descontar
  o tempo em Aguardando"
- Ser específico: "correção de bug" não diz nada — qual bug, qual impacto
- Agrupar mudanças relacionadas numa entrada só
- Manter em **português**, como o resto do projeto
- Como são dois repositórios, deixar claro a qual se refere quando a entrada
  envolver os dois

## Observações

- **Nunca sobrescrever versão já publicada** — só adicionar em `[Não publicado]`
  ou criar seção nova
- Perguntar o número da versão antes de criar uma release
- Mudança que afeta contrato da API deve aparecer nos changelogs dos dois repositórios
