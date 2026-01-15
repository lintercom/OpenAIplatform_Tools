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
