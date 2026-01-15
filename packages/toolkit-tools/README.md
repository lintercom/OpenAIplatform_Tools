# Toolkit Tools

Built-in tools pro AI Toolkit platformu.

## Kategorie Tools

### Session Tools
- `session.start` - Vytvoří novou session
- `session.get` - Získá informace o session
- `session.set_consent` - Nastaví consent flags

### Lead Tools
- `lead.get_or_create` - Získá nebo vytvoří lead
- `lead.update` - Aktualizuje lead data
- `lead.set_stage` - Nastaví stage leadu
- `lead.add_tags` - Přidá tagy
- `lead.score` - Nastaví score

### Event Tools
- `event.track` - Trackuje event
- `event.timeline` - Získá timeline eventů

### Catalog Tools
- `catalog.get_services` - Seznam služeb
- `catalog.get_service` - Detail služby
- `catalog.get_faq` - FAQ položky

### Template Tools
- `template.render` - Renderuje template

### Message Tools
- `message.send_template` - Odešle zprávu pomocí template
- `message.send_for_review` - Odešle do fronty pro review

### CRM Tools
- `crm.upsert_lead` - Synchronizuje lead do CRM
- `crm.create_task` - Vytvoří task v CRM

### Pricing Tools
- `pricing.get_rules` - Získá pricing rules
- `pricing.get_allowed_offer` - Získá povolenou nabídku

### Verify Tools
- `verify.search` - Vyhledá na whitelisted doméně
- `verify.fetch` - Načte obsah z domény
- `verify.extract` - Extrahuje data z URL
- `verify.compare` - Porovná data ze dvou URL

## Použití

```typescript
import { registerAllTools } from '@ai-toolkit/tools';
import { ToolRegistry } from '@ai-toolkit/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);

registerAllTools(registry, prisma);
```
