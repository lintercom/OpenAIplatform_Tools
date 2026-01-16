# Enterprise AI Tool Platform - Architecture

## Přehled

Platforma je navržena jako monorepo s jasně oddělenými zodpovědnostmi:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (apps/api)                    │
│  - Request routing                                           │
│  - Authentication/Authorization                              │
│  - Observability middleware (tracing, logging, metrics)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Tool Registry (toolkit-core)                    │
│  - Tool registration & discovery                             │
│  - Contract validation                                        │
│  - Policy enforcement                                        │
│  - Audit logging                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Tools      │ │  Workflows   │ │  Observability│
│ (toolkit-    │ │ (workflow-   │ │ (observability│
│  tools)      │ │  kit)        │ │  )            │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Balíčky

### @ai-toolkit/tool-contract
**Zodpovědnost:** Enterprise standardizované rozhraní pro tools

**Klíčové komponenty:**
- `ToolContract` - Kompletní metadata pro tool
- `ToolExecutionContext` - Context s observability
- `ToolExecutionResult` - Standardizovaný výsledek
- `ToolError` - RFC 7807 Problem Details errors
- `ToolContractValidator` - Validace kontraktů

**Použití:**
```typescript
import { ToolContract, ToolRiskLevel, PIILevel } from '@ai-toolkit/tool-contract';

const myTool: ToolContract = {
  id: 'my.tool',
  name: 'My Tool',
  version: '1.0.0',
  // ... metadata
  handler: async (ctx, input) => { ... },
};
```

### @ai-toolkit/observability
**Zodpovědnost:** Tracing, logging, metrics

**Klíčové komponenty:**
- `Tracer` - Distributed tracing
- `StructuredLogger` - JSON logging
- `MetricsCollector` - Metrics collection

**Použití:**
```typescript
import { tracer, logger, metrics } from '@ai-toolkit/observability';

const context = tracer.startSpan('operation');
logger.info('Operation started', { userId: '123' });
metrics.increment('operation.count');
```

### @ai-toolkit/core
**Zodpovědnost:** Tool Registry, Policy Engine, Audit Logger

**Klíčové komponenty:**
- `ToolRegistryV2` - Enterprise registry s observability
- `PolicyEngine` - Policy enforcement
- `AuditLogger` - Audit logging

**Použití:**
```typescript
import { ToolRegistryV2 } from '@ai-toolkit/core';

const registry = new ToolRegistryV2(prisma);
registry.register(tool);
const result = await registry.invokeTool('my.tool', context, input);
```

### @ai-toolkit/tools
**Zodpovědnost:** Built-in tools

**Struktura:**
- Každý tool je v samostatném souboru
- Exportuje funkci `create*Tools()` která vrací `ToolContract[]`
- Automatická registrace v `index.ts`

### @ai-toolkit/workflow-kit
**Zodpovědnost:** Reusable workflow templates

**Struktura:**
- Workflow definice jako TypeScript moduly
- Každý workflow má: inputs, outputs, steps, systemPrompt

### @ai-toolkit/openai-runtime
**Zodpovědnost:** OpenAI API wrapper

**Klíčové komponenty:**
- `WorkflowRunner` - Spouštění workflows
- `AgentsSDKRunner` - OpenAI Agents SDK wrapper

## Data Flow

### Tool Execution Flow

```
1. Request přijde do API Gateway
   ↓
2. Middleware vytvoří execution context (requestId, correlationId, traceId)
   ↓
3. Gateway volá registry.invokeTool(toolId, context, input)
   ↓
4. Registry:
   a) Validuje input podle schema
   b) Kontroluje policy (rate limits, roles, etc.)
   c) Začne trace span
   d) Spustí handler
   e) Validuje output
   f) Zaznamená metrics
   g) Loguje do audit logu
   ↓
5. Vrátí ToolExecutionResult
   ↓
6. Gateway vrací response s observability headers
```

### Policy Enforcement

```
Policy Engine kontroluje:
1. Role-based access (requiredRoles)
2. Rate limiting (maxCalls, windowMs, scope)
3. Domain whitelist (pro verify tools)
4. Tenant isolation (tenantId)
5. Human review requirements
```

### Observability

**Tracing:**
- Každý tool call má traceId a spanId
- Spany jsou hierarchické (parent-child)
- Export do OpenTelemetry formátu

**Logging:**
- Structured JSON logs
- Každý log má: timestamp, level, message, context (requestId, correlationId, traceId)
- Tool execution logs obsahují: latency, cost, policy decision

**Metrics:**
- Latency histogramy
- Success/error counters
- Cost tracking
- Policy decision metrics

## Security

### PII Handling
- Tools mají `piiLevel` (none, low, medium, high, critical)
- Audit logs automaticky redaktují PII podle levelu
- Redakce je konfigurovatelná per tool

### Access Control
- Role-based (RBAC)
- Permission-based (ABAC) - připravováno
- Tenant isolation - připravováno

### Rate Limiting
- Per tool, per scope (global, session, user, tenant)
- In-memory cache (v produkci by bylo v Redis)

## Tool Authoring

### Vytvoření nového toolu

```bash
pnpm create-tool my-tool custom
```

Toto vytvoří:
- `packages/toolkit-tools/src/tools/my-tool.ts` - Tool implementace
- `packages/toolkit-tools/src/tools/my-tool.test.ts` - Testy
- Automatickou registraci v `index.ts`

### Definition of Done pro tool

- [ ] Tool má validní `ToolContract`
- [ ] Input/output schemas jsou definované
- [ ] Handler je implementovaný
- [ ] Testy procházejí
- [ ] Examples jsou přidané
- [ ] Dokumentace je aktualizovaná
- [ ] Risk level a PII level jsou správně nastavené
- [ ] Policy je konfigurovaná (pokud je potřeba)
- [ ] Tool projde `pnpm tools:validate`

## Deployment

### Build
```bash
pnpm build
```

### Test
```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm tools:validate
```

### Database
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

## Monitoring

### Health Checks
- `/health` - Basic health check
- `/health/ready` - Readiness check (DB connection)
- `/health/live` - Liveness check

### Metrics Endpoint
- `/metrics` - Prometheus format (připravováno)

### Audit Logs
- `/admin/audit/tool-calls` - Query audit logs
- `/admin/workflow-runs` - Query workflow runs

## Next Steps

1. **Architect Tool** - Tool pro skládání architektur z capability tools
2. **ABAC Policy Engine** - Attribute-based access control
3. **Multi-tenancy** - Tenant isolation
4. **Workflow DAG Runner** - Orchestrace workflows s dependencies
5. **Cost Tracking** - Detailní cost tracking a budgeting
6. **Human Review Queue** - Fronta pro human review
7. **OpenTelemetry Integration** - Export traces do OTel
8. **Prometheus Metrics** - Export metrics do Prometheus
