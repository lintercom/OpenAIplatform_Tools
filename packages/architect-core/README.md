# @ai-toolkit/architect-core

Core logic for Architect - system architecture planning tool.

## Přehled

Architect Core poskytuje logiku pro:
- **Questionnaire Engine** - Shromažďování informací pro Project Brief
- **Decision Engine** - Rozhodování o AI vs Deterministic řešení
- **Planning Pipeline** - 3-fázové plánování (Capability -> Orchestration -> Delivery)
- **Plan Validator** - Validace všech artefaktů

## Schemas

Všechny artefakty mají Zod schemas pro validaci:

- `Blueprint` - Struktura systému (moduly, entity, eventy, integrace)
- `ToolTopology` - Jak jsou tools propojené
- `WorkflowCatalog` - Workflow definice
- `ImplementationPlan` - Epics, stories, tasks
- `DecisionRecord` - ADR pro AI vs Deterministic rozhodnutí
- `ProjectBrief` - Shromážděné informace z questionnaire

## Použití

```typescript
import {
  QuestionnaireEngine,
  CapabilityPlanner,
  OrchestrationPlanner,
  DeliveryPlanner,
  PlanValidator,
  RegistryClient,
} from '@ai-toolkit/architect-core';
import { ToolRegistryV2 } from '@ai-toolkit/core';

const registry = new ToolRegistryV2(prisma);
const registryClient = new RegistryClient(registry);

// Questionnaire
const questionnaire = new QuestionnaireEngine();
const nextQuestion = questionnaire.getNextQuestion(brief);

// Planning
const capabilityPlanner = new CapabilityPlanner(registryClient);
const capabilityPlan = capabilityPlanner.plan(brief);

const orchestrationPlanner = new OrchestrationPlanner();
const topology = orchestrationPlanner.createToolTopology(tools, brief);
const workflows = orchestrationPlanner.createWorkflowCatalog(capabilityPlan, brief);

const deliveryPlanner = new DeliveryPlanner();
const plan = deliveryPlanner.createImplementationPlan(brief, capabilityPlan, topology, workflows);

// Validation
const validator = new PlanValidator(registryClient);
const result = validator.validateBlueprint(blueprint);
```

## Dokumentace

Více informací v [docs/architect/OVERVIEW.md](../../docs/architect/OVERVIEW.md).
