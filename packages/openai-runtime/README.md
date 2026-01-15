# OpenAI Runtime

Wrapper pro OpenAI Agents SDK a Responses API s tool calling a tracing.

## WorkflowRunner

Spouští workflows pomocí OpenAI API s automatickým tool calling.

```typescript
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';

const runner = new WorkflowRunner(
  {
    openaiApiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
  },
  registry,
  prisma
);

const result = await runner.runWorkflow(
  'router',
  { sessionId: '...', leadId: '...' },
  'Uživatelská zpráva'
);
```

## Streaming

```typescript
for await (const chunk of runner.runWorkflowStream(...)) {
  console.log(chunk);
}
```

## Tracing

Všechny workflow runs jsou automaticky uloženy do databáze s trace reference.

## OpenAI Agents SDK Integration

Tento runtime podporuje jak OpenAI Responses API, tak i plný [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/) pro pokročilejší funkcionalitu.

### Použití Agents SDK Runner

```typescript
import { AgentsSDKRunner } from '@ai-toolkit/openai-runtime';

const agentsRunner = new AgentsSDKRunner(
  {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4-turbo-preview',
  },
  registry
);

const result = await agentsRunner.runWorkflowWithAgentsSDK(
  'router',
  { sessionId: '...', leadId: '...' },
  'Uživatelská zpráva',
  workflow.systemPrompt
);
```

### Výhody Agents SDK

- **Handoffs**: Delegace mezi agenty
- **Guardrails**: Input/output validace
- **Multi-agent orchestration**: Koordinace více agentů
- **Tracing**: Pokročilé tracing a debugging
- **Sessions**: Správa kontextu a session

### Přímé použití Agents SDK

Pro přímé použití bez wrapperu:

```typescript
import { Agent, run, tool } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
  tools: [
    tool({
      name: 'my_tool',
      description: 'My tool',
      parameters: z.object({ ... }),
      execute: async (args) => { ... },
    }),
  ],
});

const result = await run(agent, 'User message');
```

Viz [OpenAI Agents SDK dokumentace](https://openai.github.io/openai-agents-js/) pro více informací.
