# OpenAI Doc Sync

Pipeline pro synchronizaci OpenAI platform dokumentace.

## CLI

```bash
# Synchronizace všech docs
pnpm docs:sync

# Vyhledání
pnpm docs:search "agents"

# Generování prompt packu
pnpm docs:prompt-pack "build new tool"
```

## Programové použití

```typescript
import { DocSync } from '@ai-toolkit/openai-doc-sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const sync = new DocSync(prisma);

await sync.syncAll();
const results = await sync.search('agents');
const prompt = await sync.generatePromptPack('build new tool');
```

## Synchronizované URL

- Agents guide
- Agent Builder guide
- Tools guide
- Function calling guide
- Structured outputs guide
- Responses API reference
- Authentication reference
