# @ai-toolkit/cost-control

Enterprise Cost & Control layer pro LLM orchestration.

## Přehled

Tento balíček poskytuje kompletní vrstvu pro řízení nákladů na LLM:

- **TokenBudgetPolicy** - Kontrola token budgetu před voláním LLM
- **LLMRoleRouter** - Role-based model routing pro optimalizaci nákladů
- **ContextCache** - Cache pro opakované dotazy
- **FallbackResponseTool** - Garantovaná odpověď i při selhání
- **CostMonitoring** - Sledování a reporting nákladů

## Instalace

```bash
pnpm add @ai-toolkit/cost-control
```

## Použití

### Základní setup

```typescript
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import {
  LLMRoleRouter,
  TokenBudgetPolicy,
  ContextCache,
  FallbackResponseTool,
  CostMonitoring,
} from '@ai-toolkit/cost-control';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Token Budget Policy
const tokenBudgetPolicy = new TokenBudgetPolicy(prisma, {
  defaultSessionBudget: 10000,
  defaultWorkflowBudget: 5000,
  defaultToolBudget: 2000,
  defaultDailyBudget: 100000,
  enforceBudget: true,
  onBudgetExceeded: 'downgrade', // nebo 'truncate', 'fallback', 'reject'
});

// Context Cache
const contextCache = new ContextCache(prisma, {
  defaultTTL: 24 * 60 * 60, // 24 hodin
  maxCacheSize: 10000,
});

// Fallback Response Tool
const fallbackResponseTool = new FallbackResponseTool({
  enableRuleBased: true,
});

// LLM Role Router
const router = new LLMRoleRouter({
  openaiClient: openai,
  tokenBudgetPolicy,
  contextCache,
  fallbackResponseTool,
});

// Cost Monitoring
const costMonitoring = new CostMonitoring(prisma);
```

### Volání LLM s role-based routing

```typescript
const response = await router.callLLM({
  role: 'intent_detection', // nebo 'routing', 'recommendation', etc.
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What does the user want?' },
  ],
  context: {
    sessionId: 'session_123',
    workflowId: 'workflow_456',
    tenantId: 'tenant_789',
    role: 'intent_detection',
    period: 'session',
  },
});

console.log(response.content);
console.log(response.costUSD);
console.log(response.cached); // true pokud z cache
console.log(response.fallback); // true pokud fallback
```

### Cost Monitoring

```typescript
// Zaznamenat cost
await costMonitoring.recordCost({
  sessionId: 'session_123',
  workflowId: 'workflow_456',
  role: 'intent_detection',
  model: 'gpt-3.5-turbo',
  usage: {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
  },
  costUSD: 0.0001,
});

// Získat cost report
const report = await costMonitoring.getCosts({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  role: 'intent_detection',
});

console.log(report.totalCost);
console.log(report.breakdown.byRole);
console.log(report.breakdown.byModel);

// Dashboard
const dashboard = await costMonitoring.getDashboard('month');
console.log(dashboard.summary);
console.log(dashboard.trends);
console.log(dashboard.topConsumers);
```

## LLM Role Types

- `intent_detection` - Detekce záměru uživatele (gpt-3.5-turbo)
- `routing` - Routing konverzací (gpt-3.5-turbo)
- `recommendation` - Doporučení produktů (gpt-4-turbo-preview)
- `explanation` - Vysvětlení rozdílů (gpt-4-turbo-preview)
- `quote_generation` - Generování nabídek (gpt-4-turbo-preview)
- `analytics_batch` - Batch analýzy (gpt-4-turbo-preview)
- `general` - Obecné úlohy (gpt-4-turbo-preview)

## Token Budget Policy

Token Budget Policy kontroluje token budget před voláním LLM:

- **Pre-flight kontrola** - Odhad tokenů před voláním
- **Budget limity** - Per session/workflow/tool/daily
- **Reakce při překročení**:
  - `downgrade` - Použít levnější model
  - `truncate` - Zkrátit kontext
  - `fallback` - Použít fallback odpověď
  - `reject` - Zamítnout požadavek

## Context Cache

Context Cache ukládá LLM responses pro opakované dotazy:

- **Hashování** - Vstup + kontext → cache key
- **TTL** - Time-to-live pro cache entries
- **Invalidace** - Ruční nebo automatická

## Fallback Response Tool

Fallback Response Tool garantuje odpověď i při selhání:

- **Statické odpovědi** - Pro různé scénáře
- **Rule-based** - Kontext-aware fallback
- **Eskalace** - Na formulář nebo podporu

## Cost Monitoring

Cost Monitoring sleduje a reportuje náklady:

- **Token tracking** - Per request/session/tool/workflow/role
- **Agregace** - Den/týden/měsíc
- **Breakdown** - By role/model/tool
- **Dashboard** - Trends a top consumers

## Integrace s WorkflowRunner

Cost Control je automaticky integrován do `WorkflowRunner`:

```typescript
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';

const runner = new WorkflowRunner(
  {
    openaiApiKey: process.env.OPENAI_API_KEY,
    enableCostControl: true, // Default: true
    tokenBudgetConfig: {
      defaultSessionBudget: 10000,
      enforceBudget: true,
      onBudgetExceeded: 'downgrade',
    },
  },
  registry,
  prisma
);
```

## Prisma Schema

Cost Control vyžaduje následující Prisma modely:

```prisma
model TokenBudget {
  id          String   @id @default(uuid())
  sessionId   String?
  workflowId  String?
  toolId      String?
  tenantId    String?
  role        String?
  budgetLimit Int
  tokensUsed  Int      @default(0)
  period      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CostRecord {
  id          String   @id @default(uuid())
  sessionId   String?
  workflowId  String?
  toolId      String?
  role        String?
  tenantId    String?
  model       String
  inputTokens Int
  outputTokens Int
  totalTokens Int
  costUSD     Float
  createdAt   DateTime @default(now())
}

model ContextCache {
  id          String   @id @default(uuid())
  cacheKey    String   @unique
  role        String?
  model       String?
  inputHash   String
  response    Json     @db.Text
  hitCount    Int      @default(0)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Dokumentace

Více informací najdeš v:
- [COST_ARCHITECTURE_REPORT.md](../../docs/COST_ARCHITECTURE_REPORT.md) - Architektura a design
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Celková architektura platformy
