# Workflow Kit

Reusable workflow templates pro OpenAI Agent Platform.

## Dostupné Workflows

### Router
Routing workflow pro rozhodování o dalším kroku konverzace.

### Qualification
Workflow pro kvalifikaci leadů - shromažďování informací.

### Booking
Workflow pro rezervace služeb.

## Použití

```typescript
import { getWorkflow } from '@ai-toolkit/workflow-kit';

const workflow = getWorkflow('router');
if (workflow) {
  // Použij workflow.systemPrompt a workflow.requiredTools
}
```

## Vytvoření nového workflow

1. Vytvořte soubor v `src/workflows/`
2. Definujte workflow template s input/output schemas
3. Přidejte system prompt
4. Zaregistrujte v `src/workflows/index.ts`
