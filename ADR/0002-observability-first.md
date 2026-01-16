# ADR-0002: Observability First

## Status
Accepted

## Context
Původní implementace měla pouze základní audit logging. Chybělo:
- Distributed tracing
- Structured logging
- Metrics collection
- Request/correlation IDs

## Decision
Zavedeme observability jako first-class citizen:

1. **Tracing** - Každý tool call má traceId a spanId
2. **Structured Logging** - JSON logs s kontextem
3. **Metrics** - Latency, success rate, cost tracking
4. **Request IDs** - requestId, correlationId pro každý request

## Consequences

### Positive
- ✅ Možné debugovat production issues
- ✅ Možné monitorovat performance
- ✅ Možné trackovat costs
- ✅ Distributed tracing pro komplexní workflows

### Negative
- ⚠️ Overhead na každý tool call (minimální)
- ⚠️ Více dat v audit logu

### Mitigation
- Tracing je lightweight (in-memory, cleanup starých spanů)
- Logging je asynchronní (v produkci by bylo do log aggregatoru)
- Metrics jsou agregované

## Alternatives Considered
1. **OpenTelemetry** - Zvažováno, ale pro teď vlastní implementace je jednodušší
2. **Datadog/New Relic** - Zvažováno, ale chceme vendor-agnostic řešení
3. **Bez observability** - Zamítnuto, enterprise requirement

## Implementation
- Balíček `@ai-toolkit/observability` vytvořen
- `Tracer` pro distributed tracing
- `StructuredLogger` pro JSON logging
- `MetricsCollector` pro metrics
- Integrace do `ToolRegistryV2`
