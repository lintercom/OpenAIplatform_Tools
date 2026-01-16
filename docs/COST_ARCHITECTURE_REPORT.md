# COST & CONTROL Architecture Report

## 📊 Analýza současného stavu

### Kde se volá LLM

1. **WorkflowRunner** (`packages/openai-runtime/src/workflow-runner.ts`)
   - Přímé volání `openai.chat.completions.create()`
   - Model: `this.config.model || 'gpt-4-turbo-preview'` (hardcoded)
   - Žádná kontrola tokenů před voláním
   - Žádný fallback mechanismus

2. **AgentsSDKRunner** (`packages/openai-runtime/src/agents-sdk-runner.ts`)
   - Používá `@openai/agents` SDK
   - Model: `this.config.model` (volitelný)
   - Žádná kontrola nákladů

3. **OpenAIClientFactory** (`packages/toolkit-core/src/openai-client-factory.ts`)
   - Pouze vytváří OpenAI klienty
   - Žádná logika pro výběr modelu nebo kontrolu nákladů

### Kde se rozhoduje o modelech

- **WorkflowRunner**: Config `model?: string` → vždy stejný model pro všechny úlohy
- **AgentsSDKRunner**: Config `model?: string` → vždy stejný model
- **Žádné role-based routing** - všechny úlohy používají stejný model

### Kde se logují náklady

1. **ToolContract** (`packages/tool-contract/src/types.ts`)
   - `CostProfile` interface existuje
   - `estimatedCostPerCall` a `maxCostPerCall` - ale jen metadata, ne skutečné tracking

2. **RegistryV2** (`packages/toolkit-core/src/registry-v2.ts`)
   - Trackuje `cost` v `ToolExecutionResult`
   - Ale cost je z `contract.costProfile?.estimatedCostPerCall` - statický, ne skutečný

3. **Observability** (`packages/observability/src/metrics.ts`)
   - `tool.execution.cost` metric
   - Ale cost je statický estimate, ne skutečný z OpenAI API

### Problémy

1. ❌ **Žádná kontrola tokenů** - může se překročit budget
2. ❌ **Žádné role-based routing** - drahé modely pro jednoduché úlohy
3. ❌ **Žádný cache** - opakované volání pro stejné dotazy
4. ❌ **Žádný fallback** - selhání LLM = selhání celého systému
5. ❌ **Žádné skutečné cost tracking** - jen statické estimates
6. ❌ **Přímé volání LLM** - porušuje architektonické pravidlo

---

## 🎯 Cílová architektura

### Tok dat

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow / Tool Call                     │
└──────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              LLMRoleRouter (role → model mapping)            │
│  - intent_detection → gpt-3.5-turbo                         │
│  - routing → gpt-3.5-turbo                                  │
│  - recommendation → gpt-4-turbo-preview                     │
│  - quote_generation → gpt-4-turbo-preview                   │
│  - analytics_batch → gpt-4-turbo-preview                    │
└──────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│          TokenBudgetPolicy (pre-flight kontrola)            │
│  - Odhad tokenů (input + output)                            │
│  - Kontrola budget (session/workflow/tool)                  │
│  - Reakce při překročení:                                   │
│    * Downgrade modelu                                       │
│    * Zkrácení kontextu                                      │
│    * Fallback odpověď                                       │
└──────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              ContextCacheTool (cache layer)                  │
│  - Hashování vstupu + kontextu                              │
│  - TTL + invalidace                                         │
│  - Cache hit/miss metriky                                   │
└──────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              LLMClient (unified API)                         │
│  - OpenAI API wrapper                                       │
│  - Cost tracking (tokens → $)                               │
│  - Error handling                                           │
└──────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         FallbackResponseTool (krizový fallback)             │
│  - Statická odpověď                                         │
│  - Rule-based doporučení                                    │
│  - Eskalace na formulář                                     │
└──────────────────────┬────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         CostMonitoringDashboard (tracking)                  │
│  - Tokeny / request                                         │
│  - Tokeny / session                                         │
│  - Tokeny / tool                                            │
│  - Tokeny / workflow                                        │
│  - Tokeny / role                                            │
│  - Agregace (den/týden/měsíc)                               │
└─────────────────────────────────────────────────────────────┘
```

### Architektonické principy

1. **ŽÁDNÝ tool ani workflow nesmí volat LLM přímo**
   - Všechna volání jdou přes `LLMRoleRouter`
   - Unified API přes `LLMClient`

2. **Všechna LLM volání jdou přes pipeline:**
   ```
   LLMRoleRouter → TokenBudgetPolicy → ContextCache → LLMClient
   ```

3. **Fallback je vždy dostupný:**
   - Pokud selže LLM → `FallbackResponseTool`
   - Pokud překročí budget → `FallbackResponseTool`

4. **Vše je auditovatelné:**
   - Každé rozhodnutí se loguje
   - Každý cost se trackuje
   - Každý fallback se zaznamená

---

## 📦 Nové komponenty

### 1. TokenBudgetPolicy

**Účel:** Centrální kontrola token budgetu

**Funkce:**
- Pre-flight kontrola (odhad tokenů před voláním)
- Budget limity (per session/workflow/tool)
- Reakce při překročení (downgrade/zkrácení/fallback)
- Audit log rozhodnutí

**Interface:**
```typescript
interface TokenBudgetPolicy {
  checkBudget(context: BudgetContext): Promise<BudgetDecision>;
  estimateTokens(messages: Message[], model: string): number;
  recordUsage(context: BudgetContext, tokens: TokenUsage): Promise<void>;
}
```

### 2. LLMRoleRouter

**Účel:** Role-based model routing

**Funkce:**
- Mapování role → model
- Možnost override (policy/experiment)
- Fallback na levnější model při chybě
- Unified API pro volání LLM

**Interface:**
```typescript
interface LLMRoleRouter {
  route(role: LLMRole, context: RoutingContext): Promise<ModelConfig>;
  callLLM(role: LLMRole, messages: Message[], options?: LLMOptions): Promise<LLMResponse>;
}
```

### 3. ContextCacheTool

**Účel:** Cache pro opakované dotazy

**Funkce:**
- Hashování vstupu + kontextu
- TTL + invalidace
- Cache hit/miss metriky
- Ruční invalidace

**Interface:**
```typescript
interface ContextCache {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, value: CachedResponse, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}
```

### 4. FallbackResponseTool

**Účel:** Garantovaná odpověď i při selhání

**Funkce:**
- Konfigurovatelné fallback scénáře
- Kontext-aware fallback
- Audit rozhodnutí

**Interface:**
```typescript
interface FallbackResponseTool {
  getFallback(scenario: FallbackScenario, context: FallbackContext): Promise<FallbackResponse>;
}
```

### 5. CostMonitoringDashboard

**Účel:** Přehled nákladů

**Funkce:**
- Token tracking (request/session/tool/workflow/role)
- Agregace (den/týden/měsíc)
- Export pro billing

**Interface:**
```typescript
interface CostMonitoring {
  recordCost(cost: CostRecord): Promise<void>;
  getCosts(filters: CostFilters): Promise<CostReport>;
  getDashboard(period: Period): Promise<DashboardData>;
}
```

---

## 🔄 Migrační plán

### Fáze 1: LLMRoleRouter + LLMClient
- Vytvořit `LLMRoleRouter` a `LLMClient`
- Refaktorovat `WorkflowRunner` aby používal `LLMRoleRouter`
- Přidat role do workflow kontextu

### Fáze 2: TokenBudgetPolicy
- Implementovat `TokenBudgetPolicy`
- Integrovat do `LLMRoleRouter` pipeline
- Přidat budget limity do config

### Fáze 3: ContextCacheTool
- Implementovat cache layer
- Integrovat do pipeline
- Přidat cache metriky

### Fáze 4: FallbackResponseTool
- Implementovat fallback mechanismus
- Integrovat do pipeline
- Přidat fallback scénáře

### Fáze 5: CostMonitoringDashboard
- Implementovat cost tracking
- Přidat Prisma modely pro cost data
- Vytvořit dashboard API

---

## 📝 Prisma Schema rozšíření

```prisma
// Token Budget Tracking
model TokenBudget {
  id          String   @id @default(uuid())
  sessionId   String?
  workflowId  String?
  toolId      String?
  tenantId    String?
  role        String?  // LLM role
  budgetLimit Int      // Max tokens
  tokensUsed  Int      @default(0)
  period      String   // "session" | "workflow" | "tool" | "daily"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([sessionId])
  @@index([workflowId])
  @@index([toolId])
  @@index([tenantId])
}

// Cost Tracking
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
  metadata    Json?
  createdAt   DateTime @default(now())
  
  @@index([sessionId])
  @@index([workflowId])
  @@index([toolId])
  @@index([role])
  @@index([tenantId])
  @@index([createdAt])
}

// Context Cache
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
  
  @@index([cacheKey])
  @@index([role])
  @@index([expiresAt])
}
```

---

## 🎯 Kritéria kvality

- ✅ Přidání nového toolu NEVYŽADUJE řešit cost/logiku
- ✅ Token budget se NIKDY nepřekročí tiše
- ✅ LLM selhání NIKDY nerozbije UX
- ✅ Náklady jsou čitelné bez googlení
- ✅ Architekt systému má plnou kontrolu

---

**Status:** Analýza dokončena, připraveno k implementaci
