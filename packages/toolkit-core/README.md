# Toolkit Core

Jádro AI Toolkit - Tool Registry, Policy Engine, Audit Logger.

## Komponenty

### ToolRegistry

Centrální registr všech tools s validací, policy enforcement a audit logging.

```typescript
import { ToolRegistry } from '@ai-toolkit/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);

// Registrace toolu
registry.register({
  id: 'my.tool',
  category: 'custom',
  description: 'Můj custom tool',
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  handler: async (ctx, input) => { ... },
});

// Invokace toolu
const result = await registry.invokeTool('my.tool', context, input);
```

### Policy Engine

Enforcement pravidel pro tools:
- Rate limiting
- Domain whitelist
- Role-based access
- Human review requirements

### Audit Logger

Automatické logování všech tool invokací do databáze s PII redakcí.

## Databáze

Používá Prisma s PostgreSQL. Spusťte migrace:

```bash
pnpm prisma:migrate
pnpm prisma:seed
```
