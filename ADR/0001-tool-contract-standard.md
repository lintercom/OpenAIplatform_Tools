# ADR-0001: Tool Contract Standard

## Status
Accepted

## Context
Původní `ToolDefinition` interface byl minimální a neobsahoval metadata potřebná pro enterprise použití:
- Chyběl versioning
- Chyběl risk assessment
- Chyběl cost tracking
- Chyběl standardizovaný error handling
- Chyběl PII klasifikace

## Decision
Zavedeme nový `ToolContract` interface v samostatném balíčku `@ai-toolkit/tool-contract` s kompletními metadata:

- **Identifikace:** id, name, version
- **Kategorizace:** category, tags
- **Risk & Security:** riskLevel, piiLevel, idempotency
- **Access Control:** requiredRoles, requiredPermissions
- **Schemas:** inputSchema, outputSchema (Zod)
- **Policy:** rateLimits
- **Cost:** costProfile
- **Examples:** examples pro dokumentaci
- **Error Model:** errorModel (RFC 7807)
- **Metadata:** author, maintainer, documentationUrl

## Consequences

### Positive
- ✅ Standardizované rozhraní pro všechny tools
- ✅ Automatická validace kontraktů
- ✅ Risk assessment možný
- ✅ Cost tracking možný
- ✅ Lepší dokumentace
- ✅ Příprava na "Architect Tool"

### Negative
- ⚠️ Breaking change - existující tools musí být migrovány
- ⚠️ Více boilerplate kódu při vytváření toolu

### Mitigation
- Zachováme starý `ToolDefinition` interface pro backward compatibility
- Poskytneme migration guide
- Tool Authoring Kit automaticky generuje správný kontrakt

## Alternatives Considered
1. **Rozšířit existující ToolDefinition** - Zamítnuto, protože by to bylo breaking change bez benefitů
2. **Použít externí standard** - Zamítnuto, žádný standard neexistuje pro AI tools
3. **Metadata v samostatném souboru** - Zamítnuto, lepší je mít vše v jednom místě

## Implementation
- Balíček `@ai-toolkit/tool-contract` vytvořen
- `ToolContractValidator` pro validaci
- `ToolError` pro standardizované error handling
- Migration guide v dokumentaci
