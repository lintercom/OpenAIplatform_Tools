# Instalace AI Toolkit pro vývoj konkrétních systémů

## Přehled

AI Toolkit může být použit jako závislost v jiných projektech pro vývoj konkrétních systémů s AI tools a workflows.

## Instalace

### Metoda 1: Z GitHub (doporučeno pro development)

```bash
# V tvém projektu
pnpm add @ai-toolkit/core@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/tools@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/openai-runtime@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/workflow-kit@github:lintercom/OpenAIplatform_Tools
```

**Nebo v package.json:**

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/tools": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/openai-runtime": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/workflow-kit": "github:lintercom/OpenAIplatform_Tools"
  }
}
```

### Metoda 2: Z npm (po publikování)

```bash
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime @ai-toolkit/workflow-kit
```

### Metoda 3: Lokální vývoj (monorepo)

Pokud máš lokální kopii:

```bash
# V tvém projektu
pnpm add @ai-toolkit/core@file:../path/to/ai-toolkit/packages/toolkit-core
```

## Setup v tvém projektu

### 1. Instalace závislostí

```bash
pnpm install
```

### 2. Databáze Setup

```bash
# Zkopíruj Prisma schema z @ai-toolkit/core
cp node_modules/@ai-toolkit/core/prisma/schema.prisma prisma/schema.prisma

# Nebo použij vlastní schema a extenduj ho
```

**Nebo použij Prisma schema z balíčku:**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Import schema z @ai-toolkit/core
// (Prisma nepodporuje import, takže zkopíruj potřebné modely)
```

### 3. Environment Variables

Vytvoř `.env` soubor:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/your_db"

# OpenAI (volitelné - můžeš použít per-tenant keys)
OPENAI_API_KEY="sk-..."

# API Key Encryption (pro per-tenant API keys)
API_KEY_ENCRYPTION_KEY="your-encryption-key-here"

# Admin API Key
ADMIN_API_KEY="your-admin-key"
```

### 4. Prisma Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

## Použití v kódu

### Základní Setup

```typescript
import { PrismaClient } from '@prisma/client';
import { ToolRegistry, APIKeyManager } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';
import { getWorkflow } from '@ai-toolkit/workflow-kit';

// 1. Inicializace
const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);

// 2. Registrace tools
registerAllTools(registry, prisma);

// 3. API Key Manager (pro per-tenant keys)
const apiKeyManager = new APIKeyManager(prisma);

// 4. Workflow Runner
const workflowRunner = new WorkflowRunner(
  {
    apiKeyManager, // Nebo openaiApiKey pro globální key
    model: 'gpt-4-turbo-preview',
  },
  registry,
  prisma
);

// 5. Spuštění workflow
const workflow = getWorkflow('router');
const result = await workflowRunner.runWorkflow(
  'router',
  {
    sessionId: 'session-123',
    tenantId: 'tenant-123', // Pro per-tenant API keys
  },
  'Hello, I need help',
  workflow?.systemPrompt
);
```

### Vytvoření vlastního toolu

```typescript
import { ToolContract, ToolRiskLevel, PIILevel, IdempotencyLevel } from '@ai-toolkit/tool-contract';
import { z } from 'zod';

const myTool: ToolContract = {
  id: 'my.custom.tool',
  name: 'My Custom Tool',
  version: '1.0.0',
  description: 'Description of my tool',
  category: 'custom',
  tags: ['custom'],
  riskLevel: ToolRiskLevel.LOW,
  piiLevel: PIILevel.NONE,
  idempotency: IdempotencyLevel.STRONG,
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  handler: async (ctx, input) => {
    // Tvá business logika
    return { result: `Processed: ${input.input}` };
  },
};

// Registrace
registry.register(myTool);
```

### Per-Tenant API Keys

```typescript
import { APIKeyManager } from '@ai-toolkit/core';

const apiKeyManager = new APIKeyManager(prisma);

// Vytvoření tenanta
await apiKeyManager.upsertTenant(
  'tenant-123',
  'Acme Corp',
  'acme-corp'
);

// Uložení API klíče
await apiKeyManager.storeAPIKey({
  tenantId: 'tenant-123',
  provider: 'openai',
  keyName: 'production',
  apiKey: 'sk-...',
  metadata: { model: 'gpt-4-turbo-preview' },
});

// Workflow automaticky použije API key z tenantId
```

## Struktura projektu

```
your-project/
  ├── src/
  │   ├── tools/          # Tvé vlastní tools
  │   ├── workflows/       # Tvé vlastní workflows
  │   └── index.ts
  ├── prisma/
  │   └── schema.prisma    # Extendovaný schema
  ├── package.json
  └── .env
```

## Příklady

### Fastify API Server

```typescript
import Fastify from 'fastify';
import { ToolRegistry, APIKeyManager } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);
registerAllTools(registry, prisma);

const apiKeyManager = new APIKeyManager(prisma);
const workflowRunner = new WorkflowRunner(
  { apiKeyManager },
  registry,
  prisma
);

const fastify = Fastify();

fastify.post('/agent/next', async (request, reply) => {
  const { userMessage, tenantId } = request.body;
  
  const result = await workflowRunner.runWorkflow(
    'router',
    { tenantId },
    userMessage
  );
  
  return result.output;
});

fastify.listen({ port: 3000 });
```

## Troubleshooting

### "Cannot find module '@ai-toolkit/core'"
Ujisti se, že:
1. Balíček je správně nainstalován: `pnpm install`
2. Workspace dependencies jsou správně nastavené
3. Pokud používáš GitHub, ujisti se, že máš přístup k repozitáři

### "Prisma schema not found"
Zkopíruj Prisma schema z `node_modules/@ai-toolkit/core/prisma/schema.prisma` do tvého projektu.

### "API_KEY_ENCRYPTION_KEY required"
Nastav `API_KEY_ENCRYPTION_KEY` environment variable, nebo použij globální `OPENAI_API_KEY`.

## Další dokumentace

- [API Key Management](docs/API_KEY_MANAGEMENT.md)
- [Tool Authoring Guide](CONTRIBUTING.md)
- [Architecture](ARCHITECTURE.md)
