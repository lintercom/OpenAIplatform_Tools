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

### Platform Documentation
- Agents guide
- Agent Builder guide
- Tools guide
- Function calling guide
- Structured outputs guide
- Responses API reference
- Authentication reference

### OpenAI Agents SDK Documentation
- Overview a Quickstart
- Agents guide
- Running Agents
- Results
- Tools
- Orchestrating multiple agents
- Handoffs
- Context management
- Sessions
- Models
- Guardrails
- Streaming
- Human-in-the-loop
- Model Context Protocol (MCP)
- Tracing
- Configuring the SDK
- Troubleshooting

Kompletní dokumentace: https://openai.github.io/openai-agents-js/
