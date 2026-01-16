# Observability

Observability package pro tracing, structured logging a metrics.

## Tracing

```typescript
import { tracer, startSpan } from '@ai-toolkit/observability';

const context = tracer.startSpan('my-operation');
// ... operation ...
tracer.endSpan(context.spanId, 'ok');
```

## Logging

```typescript
import { logger, ContextLogger } from '@ai-toolkit/observability';

logger.info('Operation started', { userId: '123' });

const ctxLogger = new ContextLogger(logger, { requestId: 'req-123' });
ctxLogger.info('Context-aware log');
```

## Metrics

```typescript
import { metrics } from '@ai-toolkit/observability';

metrics.increment('operation.count', { type: 'create' });
metrics.histogram('operation.latency', 150, { type: 'create' });
```
