# Architektura AI Toolkit

## Přehled

AI Toolkit je modulární monorepo pro vytváření opakovatelné "AI Tools Library" na OpenAI Agent Platform. Systém je navržen tak, aby umožňoval kompozici tools a workflows pro různé business účely.

## Architektonické vrstvy

### 1. Core Layer (`packages/toolkit-core`)

**Tool Registry**
- Centrální registr všech tools
- Validace vstupů/výstupů pomocí Zod
- Export do OpenAI function calling formátu

**Policy Engine**
- Rate limiting (global/session/lead scope)
- Domain whitelist enforcement
- Role-based access control
- Human review requirements

**Audit Logger**
- Automatické logování všech tool invokací
- PII redakce podle policy
- Ukládání do PostgreSQL

### 2. Tools Layer (`packages/toolkit-tools`)

Built-in tools organizované do kategorií:
- **Session**: Správa session a consent
- **Lead**: CRM operace s leady
- **Event**: Event tracking a timeline
- **Catalog**: Služby a FAQ
- **Template**: Template rendering
- **Message**: Odesílání zpráv
- **CRM**: Synchronizace s externím CRM
- **Pricing**: Pricing rules a nabídky
- **Verify**: Verifikace na whitelisted doménách

### 3. Runtime Layer (`packages/openai-runtime`)

**WorkflowRunner**
- Wrapper pro OpenAI Responses API
- Automatické tool calling
- Streaming support
- Tracing a workflow run tracking

### 4. Workflow Layer (`packages/workflow-kit`)

**Workflow Templates**
- Router: Routing konverzací
- Qualification: Kvalifikace leadů
- Booking: Rezervace služeb
- Follow-up: Follow-up konverzace
- Support: Podpora zákazníka
- Content: Správa obsahu (admin)

Každý workflow definuje:
- Input/output schemas (Zod)
- System prompt
- Required tools
- UI Directive contract

### 5. Adapters Layer (`packages/adapters`)

Rozhraní pro externí služby:
- CRM Adapter
- Email Adapter
- Calendar Adapter
- Storage Adapter

Poskytuje mock implementace pro vývoj.

### 6. Doc Sync Layer (`packages/openai-doc-sync`)

Pipeline pro synchronizaci OpenAI dokumentace:
- Fetcher: Stahování HTML stránek
- Parser: Extrakce obsahu a sekcí
- Indexer: Full-text search v PostgreSQL
- CLI: `docs:sync`, `docs:search`, `docs:prompt-pack`

### 7. API Layer (`apps/api`)

Fastify backend server s endpoints:
- Session management
- Event tracking
- Tool invocation
- Agent workflows
- Admin audit/workflow runs

### 8. Web Layer (`apps/web`)

Minimální React demo UI pro testování.

## Data Flow

```
User Message
    ↓
API Endpoint (/agent/next)
    ↓
WorkflowRunner
    ↓
OpenAI API (with tools)
    ↓
Tool Registry (invoke tools)
    ↓
Policy Engine (check policies)
    ↓
Tool Handler (execute)
    ↓
Audit Logger (log)
    ↓
UI Directives (return)
```

## Bezpečnost

1. **PII Redakce**: Automatická redakce citlivých dat v audit logu
2. **Rate Limiting**: Per-tool, per-session, per-lead
3. **Domain Whitelist**: Pro verify tools
4. **Role-based Access**: Pro admin endpoints
5. **Human Review**: Fronta pro rizikové operace

## Rozšiřitelnost

### Přidání nového toolu

1. Vytvoř tool definici v `packages/toolkit-tools/src/tools/`
2. Implementuj handler s Zod schemas
3. Zaregistruj v `registerAllTools()`
4. Přidej testy

### Vytvoření nového workflow

1. Definuj workflow template v `packages/workflow-kit/src/workflows/`
2. Použij tools z registry
3. Implementuj system prompt
4. Zaregistruj v `workflows/index.ts`

### Přidání adaptéru

1. Implementuj interface z `packages/adapters/src/types.ts`
2. Vytvoř implementaci (mock nebo skutečnou)
3. Použij v tools, které to potřebují

## Databáze

PostgreSQL s Prisma ORM:
- `Tool` - Tool registry metadata
- `ToolCall` - Audit log
- `WorkflowRun` - Workflow execution tracking
- `OpenAIDoc` - Dokumentační cache
- `Session` - User sessions
- `Lead` - CRM leads
- `Event` - Event tracking
- `CatalogService`, `CatalogFAQ` - Katalog
- `Template` - Templates

## Deployment

1. Build: `pnpm build`
2. Migrace: `pnpm prisma:migrate`
3. Seed: `pnpm prisma:seed`
4. Start: `pnpm start` (v produkci použij PM2/systemd)

## Monitoring

- Audit logy: `/admin/audit/tool-calls`
- Workflow runs: `/admin/workflow-runs`
- Health check: `/health`
