# Architect - Overview

## Proč je Architect oddělený od core?

Architect je **produktová aplikace** postavená na platformě, ne součást platformy samotné.

### Dependency Boundaries

```
┌─────────────────────────────────────────┐
│     Architect UI (apps/architect-ui)     │
│     React + Vite                        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│     Architect API (apps/architect-api)  │
│     Fastify + Session Management         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│     Architect Core (packages/           │
│     architect-core)                     │
│     - Planning Pipeline                 │
│     - Decision Engine                   │
│     - Questionnaire Engine              │
│     - Plan Validator                    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Toolkit │ │ Cost    │ │ OpenAI  │
│ Core    │ │ Control │ │ Runtime │
└─────────┘ └─────────┘ └─────────┘
```

### Principy

1. **Architect čte z platformy, nepíše do ní**
   - Používá Tool Registry (read-only)
   - Používá Policy Engine pro validaci
   - Používá Cost Control pro budgety
   - **NEMODIFIKUJE** registry ani tools

2. **Architect generuje SPECIFIKACE, ne kód**
   - Blueprint (JSON schema)
   - Implementation Plan (epics/stories/tasks)
   - ADR (Architecture Decision Records)
   - Exportovatelné do Jira/Linear/Notion

3. **Architect je standalone produkt**
   - Může běžet samostatně
   - Má vlastní UI a API
   - Může být nasazen jako služba

## Struktura

### packages/architect-core

**Zodpovědnost:** Core logika pro generování plánů

**Komponenty:**
- `schemas/` - Zod schemas pro všechny artefakty
- `decision-engine/` - AI vs Deterministic rozhodování
- `planning-pipeline/` - 3-fázové plánování
- `questionnaire/` - Intake a dotazování
- `validator/` - Validace plánů
- `registry-client/` - Adapter pro Tool Registry

**Závislosti:**
- `@ai-toolkit/core` - Tool Registry (read-only)
- `@ai-toolkit/cost-control` - Cost budgets
- `@ai-toolkit/openai-runtime` - LLM pro generování
- `zod` - Schema validation

### apps/architect-api

**Zodpovědnost:** Backend API pro Architect

**Endpoints:**
- `POST /sessions` - Start session
- `POST /sessions/:id/messages` - Chat input
- `GET /sessions/:id/artifacts` - Get artifacts
- `POST /sessions/:id/export` - Export to JSON/Markdown

**Závislosti:**
- `@ai-toolkit/architect-core` - Core logika
- `fastify` - HTTP server
- `@prisma/client` - Database

### apps/architect-ui

**Zodpovědnost:** UI pro Architect

**Komponenty:**
- Chat panel (vlevo)
- Artifact panel (vpravo) - taby pro Blueprint/Topology/Workflows/Plan/ADRs
- Clarification mode - wizard-like otázky
- Export buttons

**Závislosti:**
- `react` + `vite` - UI framework
- API calls do `architect-api`

## Build & Run

### Development

```bash
# Build všechny packages
pnpm build

# Spustit API
cd apps/architect-api
pnpm dev

# Spustit UI (v jiném terminálu)
cd apps/architect-ui
pnpm dev
```

### Production

```bash
# Build
pnpm build

# API běží na portu 3001 (nebo z env)
# UI běží na portu 5174 (nebo z env)
```

## Data Flow

1. **User chatuje s Architectem**
   - UI → API → Core → Questionnaire Engine
   - Core se ptá na chybějící informace
   - Odpovědi se ukládají do `ProjectBrief`

2. **Architect generuje plán**
   - Core → Planning Pipeline
   - Pipeline volá Tool Registry (read-only)
   - Generuje Blueprint/Topology/Workflows/Plan/ADRs

3. **Validace**
   - Core → Plan Validator
   - Kontrola completeness, policy, budgets
   - Chyby se vrací do UI

4. **Export**
   - API → Export formatter
   - JSON nebo Markdown
   - Exportovatelné do Jira/Linear

## Integration Points

### Tool Registry

```typescript
import { ToolRegistryV2 } from '@ai-toolkit/core';

// Architect čte z registry
const tools = registry.listTools();
const toolMetadata = registry.getTool('tool.id');
```

### Cost Control

```typescript
import { TokenBudgetPolicy, LLMRoleRouter } from '@ai-toolkit/cost-control';

// Architect používá cost control pro budgety v plánech
const budget = tokenBudgetPolicy.getBudgetStatus(context);
```

### OpenAI Runtime

```typescript
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';

// Architect používá LLM pro generování plánů
const result = await workflowRunner.runWorkflow('architect', context, prompt);
```

## Next Steps

1. Implementovat core schemas
2. Implementovat Questionnaire Engine
3. Implementovat Planning Pipeline
4. Implementovat Decision Engine
5. Vytvořit API
6. Vytvořit UI
7. Přidat export funkcionalitu
