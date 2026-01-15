# AI Toolkit vs OpenAI Agents SDK

## Rozdíl mezi AI Toolkit a OpenAI Agents SDK

### OpenAI Agents SDK
[OpenAI Agents SDK](https://github.com/openai/openai-agents-js) je **framework pro vytváření agentů**:
- Poskytuje primitiva: Agents, Handoffs, Guardrails, Tools
- Zaměřuje se na **execution layer** - jak spustit agenty a orchestrovat je
- Je to **runtime framework** pro běh agentů

### AI Toolkit (náš projekt)
AI Toolkit je **meta-framework a toolkit builder**:
- Poskytuje **infrastrukturu** pro správu tools, policies, audit
- Zaměřuje se na **governance a management layer**
- Je to **platforma** pro vytváření a správu AI tools a workflows

## Jak se doplňují

```
┌─────────────────────────────────────┐
│      AI Toolkit (náš projekt)      │
│  - Tool Registry                    │
│  - Policy Engine                    │
│  - Audit Logging                    │
│  - Workflow Templates               │
│  - Doc Sync                         │
└──────────────┬──────────────────────┘
               │ používá
               ▼
┌─────────────────────────────────────┐
│    OpenAI Agents SDK                │
│  - Agent execution                  │
│  - Handoffs                         │
│  - Guardrails                       │
│  - Tool calling                     │
└─────────────────────────────────────┘
```

## Klíčové rozdíly

| Feature | OpenAI Agents SDK | AI Toolkit |
|---------|------------------|------------|
| **Účel** | Framework pro vytváření agentů | Platforma pro správu tools a workflows |
| **Tool Management** | Tools jsou definovány inline | Centralizovaný Tool Registry s validací |
| **Policy & Governance** | Základní guardrails | Pokročilý Policy Engine (rate limits, domain whitelist, PII redaction) |
| **Audit & Compliance** | Tracing pro debugging | Kompletní audit logging s PII redakcí |
| **Workflow Templates** | Vytváříte si sami | Předpřipravené workflow templates |
| **Documentation Sync** | Ne | Automatická synchronizace OpenAI dokumentace |
| **Multi-project** | Pro jeden projekt | Reusable across projects |

## Kdy použít co?

### Použijte OpenAI Agents SDK, když:
- Chcete rychle vytvořit agenta s handoffs a tools
- Potřebujete voice agents nebo realtime functionality
- Vytváříte jeden konkrétní projekt
- Nejdete potřebujete pokročilou governance

### Použijte AI Toolkit, když:
- Chcete **reusable tools** napříč projekty
- Potřebujete **centralizovanou správu** tools s policies
- Potřebujete **audit logging** a compliance
- Chcete **workflow templates** pro běžné use cases
- Budujete **platformu** pro více projektů/týmů
- Potřebujete **dokumentační sync** pro knowledge base

## Jak je náš toolkit postaven

Náš toolkit **používá OpenAI Agents SDK** jako runtime:

```typescript
// AI Toolkit poskytuje infrastrukturu
const registry = new ToolRegistry(prisma);
registerAllTools(registry, prisma);

// OpenAI Agents SDK poskytuje execution
import { AgentsSDKRunner } from '@ai-toolkit/openai-runtime';

const runner = new AgentsSDKRunner(config, registry);
// Runner interně používá @openai/agents
```

## Analogie

- **OpenAI Agents SDK** = React (framework pro UI)
- **AI Toolkit** = Next.js (meta-framework s routing, SSR, atd.)

Oba jsou užitečné, ale řeší různé problémy:
- React = jak vytvořit komponentu
- Next.js = jak strukturovat celou aplikaci

## Závěr

**Ne, není to to samé!** 

OpenAI Agents SDK je **execution framework** - řeší "jak spustit agenty".

AI Toolkit je **platforma a toolkit builder** - řeší "jak spravovat, auditovat a znovupoužívat tools napříč projekty".

**Doporučení:** Použijte oba společně:
- OpenAI Agents SDK pro execution
- AI Toolkit pro management, governance a reusable components
