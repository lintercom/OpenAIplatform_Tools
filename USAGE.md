# Použití AI Toolkit v jiných projektech

Tento dokument popisuje, jak použít AI Toolkit jako závislost ve vašich projektech.

## Instalace

### Z npm (po publikaci)

```bash
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime @ai-toolkit/workflow-kit @ai-toolkit/adapters
```

### Z GitHub (před publikací nebo pro development)

V `package.json` vašeho projektu:

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:YOUR_USERNAME/ai-toolkit-openai-platform#main:packages/toolkit-core",
    "@ai-toolkit/tools": "github:YOUR_USERNAME/ai-toolkit-openai-platform#main:packages/toolkit-tools",
    "@ai-toolkit/openai-runtime": "github:YOUR_USERNAME/ai-toolkit-openai-platform#main:packages/openai-runtime",
    "@ai-toolkit/workflow-kit": "github:YOUR_USERNAME/ai-toolkit-openai-platform#main:packages/workflow-kit",
    "@ai-toolkit/adapters": "github:YOUR_USERNAME/ai-toolkit-openai-platform#main:packages/adapters"
  }
}
```

Pak spusťte:
```bash
pnpm install
```

### Z lokálního monorepo (pro development)

V `package.json` vašeho projektu:

```json
{
  "dependencies": {
    "@ai-toolkit/core": "file:../ai-toolkit-openai-platform/packages/toolkit-core",
    "@ai-toolkit/tools": "file:../ai-toolkit-openai-platform/packages/toolkit-tools"
  }
}
```

## Základní použití

### 1. Tool Registry Setup

```typescript
import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);

// Registrace všech built-in tools
registerAllTools(registry, prisma);

// Použití toolu
const result = await registry.invokeTool('lead.get_or_create', {
  sessionId: 'session-123',
}, {
  email: 'user@example.com',
  name: 'John Doe',
});
```

### 2. Workflow Runner

```typescript
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';
import { getWorkflow } from '@ai-toolkit/workflow-kit';

const runner = new WorkflowRunner(
  {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  },
  registry,
  prisma
);

const workflow = getWorkflow('router');
const result = await runner.runWorkflow(
  'router',
  { sessionId: 'session-123' },
  'Uživatelská zpráva',
  workflow?.systemPrompt
);
```

### 3. Vlastní Tools

```typescript
import { z } from 'zod';
import { ToolDefinition } from '@ai-toolkit/core';

const myTool: ToolDefinition = {
  id: 'my.custom_tool',
  category: 'custom',
  description: 'Můj vlastní tool',
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
  handler: async (ctx, input) => {
    return { output: `Processed: ${input.input}` };
  },
};

registry.register(myTool);
```

### 4. Workflow Templates

```typescript
import { getWorkflow, listWorkflows } from '@ai-toolkit/workflow-kit';

// Seznam všech workflows
const workflows = listWorkflows();

// Získání konkrétního workflow
const routerWorkflow = getWorkflow('router');
if (routerWorkflow) {
  console.log(routerWorkflow.systemPrompt);
  console.log(routerWorkflow.requiredTools);
}
```

## Kompletní příklad

```typescript
import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';
import { getWorkflow } from '@ai-toolkit/workflow-kit';

async function main() {
  const prisma = new PrismaClient();
  const registry = new ToolRegistry(prisma);
  
  // Registrace tools
  registerAllTools(registry, prisma);
  
  // Vytvoření workflow runneru
  const runner = new WorkflowRunner(
    {
      openaiApiKey: process.env.OPENAI_API_KEY!,
    },
    registry,
    prisma
  );
  
  // Spuštění workflow
  const workflow = getWorkflow('router');
  const result = await runner.runWorkflow(
    'router',
    { sessionId: 'session-123' },
    'Chci se dozvědět více o vašich službách',
    workflow?.systemPrompt
  );
  
  console.log(result.output);
  
  await prisma.$disconnect();
}

main();
```

## Požadavky

- Node.js 20+
- PostgreSQL (pro Prisma)
- OpenAI API key

## Konfigurace

Vytvořte `.env` soubor:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
OPENAI_API_KEY="sk-..."
```

## Další dokumentace

- [Tool Registry Guide](../packages/toolkit-core/README.md)
- [Workflow Templates](../packages/workflow-kit/README.md)
- [OpenAI Runtime](../packages/openai-runtime/README.md)
