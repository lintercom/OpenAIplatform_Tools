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

## OpenAI Agents SDK

Tento runtime používá OpenAI Responses API. Pro pokročilejší funkcionalitu (handoffs, guardrails, multi-agent orchestration) zvažte použití [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/) přímo.

### Migrace na Agents SDK

Pro migraci na plný Agents SDK:

```typescript
import { Agent, run } from '@openai/agents';
import { tool } from '@openai/agents';

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
