# Tool Contract

Enterprise standardizované rozhraní pro AI tools s kompletními metadata pro policy, observability, cost tracking a dokumentaci.

## Tool Contract Interface

```typescript
import { ToolContract, ToolRiskLevel, PIILevel, IdempotencyLevel } from '@ai-toolkit/tool-contract';
import { z } from 'zod';

const myTool: ToolContract = {
  id: 'my.tool',
  name: 'My Tool',
  version: '1.0.0',
  description: 'Description of my tool',
  category: 'custom',
  tags: ['tag1', 'tag2'],
  riskLevel: ToolRiskLevel.MEDIUM,
  piiLevel: PIILevel.LOW,
  idempotency: IdempotencyLevel.STRONG,
  requiredRoles: ['user'],
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  handler: async (ctx, input) => { ... },
};
```

## Validace

```typescript
import { ToolContractValidator } from '@ai-toolkit/tool-contract';

const validation = ToolContractValidator.validate(tool);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

## Error Handling

```typescript
import { ToolError } from '@ai-toolkit/tool-contract';

try {
  // tool execution
} catch (error) {
  throw ToolError.fromError(error, 'my.tool', 500);
}
```
