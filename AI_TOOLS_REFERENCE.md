# AI Tools Reference - Kompletní seznam a použití

Tento dokument obsahuje kompletní seznam všech built-in AI tools dostupných v AI Toolkit platformě, včetně jejich popisu, vstupů, výstupů a příkladů použití.

## 📋 Obsah

- [Session Tools](#session-tools)
- [Lead Tools](#lead-tools)
- [Event Tools](#event-tools)
- [Catalog Tools](#catalog-tools)
- [Template Tools](#template-tools)
- [Message Tools](#message-tools)
- [CRM Tools](#crm-tools)
- [Pricing Tools](#pricing-tools)
- [Verify Tools](#verify-tools)
- [Commerce Tools - Cart](#commerce-tools---cart)
- [Commerce Tools - Order](#commerce-tools---order)
- [Commerce Tools - Product](#commerce-tools---product)
- [Commerce Tools - Checkout](#commerce-tools---checkout)
- [Intent Tools](#intent-tools)
- [Quote Tools](#quote-tools)
- [Service Tools](#service-tools)

---

## Session Tools

Tools pro správu konverzačních session.

### `session.start`

**Popis:** Vytvoří novou session pro konverzaci s uživatelem.

**Input:**
```typescript
{
  leadId?: string;        // ID existujícího leadu (volitelné)
  metadata?: Record<string, unknown>;  // Metadata pro session
}
```

**Output:**
```typescript
{
  sessionId: string;      // ID vytvořené session
  leadId: string | null;  // ID leadu (pokud byl poskytnut)
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('session.start', {}, {
  leadId: 'lead-123',
  metadata: { source: 'website', campaign: 'summer-2024' }
});
// result.output = { sessionId: 'session-abc', leadId: 'lead-123' }
```

**Použití:** Začátek nové konverzace, tracking interakcí s uživatelem.

---

### `session.get`

**Popis:** Získá informace o existující session.

**Input:**
```typescript
{
  sessionId: string;  // ID session
}
```

**Output:**
```typescript
{
  sessionId: string;
  leadId: string | null;
  consent: Record<string, boolean> | null;  // Consent flags
  metadata: Record<string, unknown> | null;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('session.get', {}, {
  sessionId: 'session-abc'
});
```

**Použití:** Kontrola stavu session, získání consent flags, metadata.

---

### `session.set_consent`

**Popis:** Nastaví consent flags pro session (GDPR compliance).

**Input:**
```typescript
{
  sessionId: string;
  consent: Record<string, boolean>;  // { marketing: true, analytics: false, ... }
}
```

**Output:**
```typescript
{
  sessionId: string;
  consent: Record<string, boolean>;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('session.set_consent', {}, {
  sessionId: 'session-abc',
  consent: {
    marketing: true,
    analytics: true,
    personalization: false
  }
});
```

**Použití:** GDPR compliance, správa souhlasů uživatele.

---

## Lead Tools

Tools pro správu leadů (potenciálních zákazníků).

### `lead.get_or_create`

**Popis:** Získá existující lead nebo vytvoří nový podle emailu nebo telefonu.

**Input:**
```typescript
{
  email?: string;         // Email leadu
  phone?: string;         // Telefon leadu
  name?: string;          // Jméno leadu
  metadata?: Record<string, unknown>;  // Další data
}
```

**Output:**
```typescript
{
  leadId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  stage: string;          // "new" | "qualified" | "contacted" | ...
  score: number;          // Lead score (0-100)
  tags: string[];         // Tagy leadu
}
```

**Policy:**
- PII redaction v audit logu (email, phone, name)

**Příklad použití:**
```typescript
const result = await registry.invokeTool('lead.get_or_create', {}, {
  email: 'john@example.com',
  name: 'John Doe',
  metadata: { source: 'landing-page' }
});
// result.output = { leadId: 'lead-123', email: 'john@example.com', ... }
```

**Použití:** Identifikace nebo vytvoření leadu při první interakci.

---

### `lead.update`

**Popis:** Aktualizuje data leadu.

**Input:**
```typescript
{
  leadId: string;
  email?: string;
  phone?: string;
  name?: string;
  data?: Record<string, unknown>;  // Další data
}
```

**Output:**
```typescript
{
  leadId: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  stage: string;
  score: number;
  tags: string[];
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('lead.update', {}, {
  leadId: 'lead-123',
  phone: '+420123456789',
  data: { company: 'Acme Corp', position: 'CTO' }
});
```

**Použití:** Aktualizace informací o leadu během konverzace.

---

### `lead.set_stage`

**Popis:** Nastaví stage (fázi) leadu v sales funnelu.

**Input:**
```typescript
{
  leadId: string;
  stage: string;  // "new" | "qualified" | "contacted" | "demo" | "proposal" | "closed"
}
```

**Output:**
```typescript
{
  leadId: string;
  stage: string;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('lead.set_stage', {}, {
  leadId: 'lead-123',
  stage: 'qualified'
});
```

**Použití:** Progrese leadu přes sales funnel.

---

### `lead.add_tags`

**Popis:** Přidá tagy k leadu.

**Input:**
```typescript
{
  leadId: string;
  tags: string[];  // ["vip", "enterprise", "interested-in-product-x"]
}
```

**Output:**
```typescript
{
  leadId: string;
  tags: string[];
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('lead.add_tags', {}, {
  leadId: 'lead-123',
  tags: ['vip', 'enterprise', 'product-interest']
});
```

**Použití:** Kategorizace a segmentace leadů.

---

### `lead.score`

**Popis:** Nastaví nebo aktualizuje lead score.

**Input:**
```typescript
{
  leadId: string;
  score: number;  // 0-100
}
```

**Output:**
```typescript
{
  leadId: string;
  score: number;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('lead.score', {}, {
  leadId: 'lead-123',
  score: 85  // Vysoký score = kvalitní lead
});
```

**Použití:** Scoring leadů pro prioritizaci.

---

## Event Tools

Tools pro tracking událostí a akcí.

### `event.track`

**Popis:** Trackuje event (akci) v systému.

**Input:**
```typescript
{
  sessionId?: string;     // ID session
  leadId?: string;         // ID leadu
  type: string;            // Typ eventu: "page_view" | "button_click" | "form_submit" | ...
  payload?: Record<string, unknown>;  // Data eventu
}
```

**Output:**
```typescript
{
  eventId: string;
  type: string;
  createdAt: string;      // ISO timestamp
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('event.track', {
  sessionId: 'session-abc',
  leadId: 'lead-123'
}, {
  type: 'button_click',
  payload: { button: 'cta-signup', page: '/pricing' }
});
```

**Použití:** Analytics, tracking uživatelského chování.

---

### `event.timeline`

**Popis:** Získá timeline (chronologický seznam) eventů pro session nebo lead.

**Input:**
```typescript
{
  sessionId?: string;
  leadId?: string;
  limit?: number;  // 1-100, default: 50
}
```

**Output:**
```typescript
{
  events: Array<{
    id: string;
    type: string;
    payload: Record<string, unknown> | null;
    createdAt: string;
  }>;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('event.timeline', {}, {
  leadId: 'lead-123',
  limit: 20
});
// result.output = { events: [...] }
```

**Použití:** Zobrazení historie interakcí, debugging.

---

## Catalog Tools

Tools pro práci s katalogem služeb a FAQ.

### `catalog.get_services`

**Popis:** Získá seznam služeb z katalogu.

**Input:**
```typescript
{
  category?: string;  // Filtrování podle kategorie
}
```

**Output:**
```typescript
{
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
  }>;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('catalog.get_services', {}, {
  category: 'hosting'
});
// result.output = { services: [...] }
```

**Použití:** Zobrazení dostupných služeb, filtrování podle kategorie.

---

### `catalog.get_service`

**Popis:** Získá detail konkrétní služby.

**Input:**
```typescript
{
  serviceId: string;
}
```

**Output:**
```typescript
{
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  metadata: Record<string, unknown> | null;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('catalog.get_service', {}, {
  serviceId: 'service-123'
});
```

**Použití:** Zobrazení detailu služby pro uživatele.

---

### `catalog.get_faq`

**Popis:** Získá FAQ (často kladené otázky) z katalogu.

**Input:**
```typescript
{
  category?: string;  // Filtrování podle kategorie
  limit?: number;    // 1-50, default: 10
}
```

**Output:**
```typescript
{
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    category: string | null;
  }>;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('catalog.get_faq', {}, {
  category: 'billing',
  limit: 5
});
```

**Použití:** Zobrazení FAQ pro uživatele, self-service support.

---

## Template Tools

Tools pro práci s templates (šablonami).

### `template.render`

**Popis:** Renderuje template s proměnnými.

**Input:**
```typescript
{
  templateName: string;  // Název template
  variables: Record<string, unknown>;  // Proměnné pro substituci
}
```

**Output:**
```typescript
{
  content: string;  // Renderovaný obsah
}
```

**Template syntax:**
- `{{variableName}}` - Substituce proměnné

**Příklad použití:**
```typescript
const result = await registry.invokeTool('template.render', {}, {
  templateName: 'welcome-email',
  variables: {
    name: 'John',
    company: 'Acme Corp',
    discount: 20
  }
});
// result.output = { content: "Hello John, welcome to Acme Corp! Get 20% off..." }
```

**Použití:** Generování personalizovaných zpráv, emailů, SMS.

---

## Message Tools

Tools pro odesílání zpráv.

### `message.send_template`

**Popis:** Odešle zprávu pomocí template.

**Input:**
```typescript
{
  leadId: string;
  templateName: string;
  variables?: Record<string, unknown>;  // Proměnné pro template
  channel: 'email' | 'sms' | 'message';  // Default: 'email'
}
```

**Output:**
```typescript
{
  messageId: string;
  status: string;  // "sent" | "pending" | "failed"
}
```

**Policy:**
- Vyžaduje human review (`requiresHumanReview: true`)

**Příklad použití:**
```typescript
const result = await registry.invokeTool('message.send_template', {}, {
  leadId: 'lead-123',
  templateName: 'welcome-email',
  variables: { name: 'John' },
  channel: 'email'
});
```

**Použití:** Odesílání personalizovaných zpráv leadům.

---

### `message.send_for_review`

**Popis:** Odešle zprávu k human review před odesláním.

**Input:**
```typescript
{
  leadId: string;
  message: string;  // Text zprávy
  channel: 'email' | 'sms' | 'message';
}
```

**Output:**
```typescript
{
  reviewId: string;
  status: 'pending_review';
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('message.send_for_review', {}, {
  leadId: 'lead-123',
  message: 'Custom message text...',
  channel: 'email'
});
```

**Použití:** Kontrola zpráv před odesláním, compliance.

---

## CRM Tools

Tools pro synchronizaci s externími CRM systémy.

### `crm.upsert_lead`

**Popis:** Synchronizuje lead do externího CRM systému (Salesforce, HubSpot, atd.).

**Input:**
```typescript
{
  leadId: string;
  crmData?: Record<string, unknown>;  // Dodatečná data pro CRM
}
```

**Output:**
```typescript
{
  crmLeadId: string;  // ID leadu v CRM systému
  synced: boolean;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('crm.upsert_lead', {}, {
  leadId: 'lead-123',
  crmData: { customField: 'value' }
});
// result.output = { crmLeadId: 'crm-456', synced: true }
```

**Použití:** Synchronizace leadů s CRM, integrace s sales týmem.

---

### `crm.create_task`

**Popis:** Vytvoří task v CRM systému.

**Input:**
```typescript
{
  leadId: string;
  title: string;
  description?: string;
  dueDate?: string;  // ISO datetime
}
```

**Output:**
```typescript
{
  taskId: string;
  created: boolean;
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('crm.create_task', {}, {
  leadId: 'lead-123',
  title: 'Follow up call',
  description: 'Call to discuss pricing',
  dueDate: '2024-01-15T10:00:00Z'
});
```

**Použití:** Vytváření follow-up úkolů pro sales tým.

---

## Pricing Tools

Tools pro práci s cenami a nabídkami.

### `pricing.get_rules`

**Popis:** Získá pricing rules (pravidla pro ceny) pro službu nebo lead.

**Input:**
```typescript
{
  serviceId?: string;
  leadId?: string;
}
```

**Output:**
```typescript
{
  rules: {
    discount: number;      // Sleva v % (0-100)
    minPrice: number;       // Minimální cena
    maxPrice: number | null; // Maximální cena
  };
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('pricing.get_rules', {}, {
  serviceId: 'service-123',
  leadId: 'lead-123'
});
// result.output = { rules: { discount: 10, minPrice: 1000, maxPrice: 5000 } }
```

**Použití:** Dynamické ceny, slevy pro VIP leady.

---

### `pricing.get_allowed_offer`

**Popis:** Získá povolenou nabídku (cenu) pro lead a službu.

**Input:**
```typescript
{
  serviceId: string;
  leadId: string;
}
```

**Output:**
```typescript
{
  offer: {
    serviceId: string;
    price: number;        // Základní cena
    discount: number;     // Sleva (0-1)
    finalPrice: number;   // Finální cena po slevě
  };
}
```

**Příklad použití:**
```typescript
const result = await registry.invokeTool('pricing.get_allowed_offer', {}, {
  serviceId: 'service-123',
  leadId: 'lead-123'
});
// result.output = { offer: { serviceId: 'service-123', price: 1000, discount: 0.1, finalPrice: 900 } }
```

**Použití:** Výpočet finální ceny pro leada, personalizované nabídky.

---

## Verify Tools

Tools pro ověřování a vyhledávání informací na whitelisted doménách.

### `verify.search`

**Popis:** Vyhledá informace na whitelisted doméně.

**Input:**
```typescript
{
  domain: string;  // Doména (musí být v whitelistu)
  query: string;   // Vyhledávací dotaz
}
```

**Output:**
```typescript
{
  results: string[];  // Seznam výsledků
  cached: boolean;    // Zda byly výsledky z cache
}
```

**Policy:**
- Domain whitelist (pouze povolené domény)
- Rate limit: 10 calls / 1 minuta / session
- Caching: 1 hodina

**Příklad použití:**
```typescript
const result = await registry.invokeTool('verify.search', {}, {
  domain: 'example.com',
  query: 'company information'
});
// result.output = { results: [...], cached: false }
```

**Použití:** Ověřování informací o společnostech, vyhledávání na důvěryhodných doménách.

---

### `verify.fetch`

**Popis:** Načte obsah z whitelisted domény.

**Input:**
```typescript
{
  domain: string;  // Doména (musí být v whitelistu)
  path: string;    // Cesta na doméně
}
```

**Output:**
```typescript
{
  content: string;  // Načtený obsah
  cached: boolean;  // Zda byl obsah z cache
}
```

**Policy:**
- Domain whitelist
- Rate limit: 5 calls / 1 minuta / session
- Caching: 30 minut

**Příklad použití:**
```typescript
const result = await registry.invokeTool('verify.fetch', {}, {
  domain: 'example.com',
  path: '/about'
});
```

**Použití:** Načítání informací z důvěryhodných zdrojů.

---

### `verify.extract`

**Popis:** Extrahuje specifické informace z URL na whitelisted doméně.

**Input:**
```typescript
{
  domain: string;
  url: string;      // Plná URL
  selector?: string; // CSS selector nebo XPath (volitelné)
}
```

**Output:**
```typescript
{
  extracted: Record<string, unknown>;  // Extrahované data
  cached: boolean;
}
```

**Policy:**
- Domain whitelist
- Rate limit: 5 calls / 1 minuta / session
- Caching: 30 minut

**Příklad použití:**
```typescript
const result = await registry.invokeTool('verify.extract', {}, {
  domain: 'example.com',
  url: 'https://example.com/company',
  selector: '.company-info'
});
```

**Použití:** Extrakce strukturovaných dat z webových stránek.

---

### `verify.compare`

**Popis:** Porovná data z dvou URL na whitelisted doméně.

**Input:**
```typescript
{
  domain: string;
  url1: string;     // První URL
  url2: string;     // Druhá URL
  field?: string;   // Pole k porovnání (volitelné)
}
```

**Output:**
```typescript
{
  differences: Array<{
    field: string;
    value1: unknown;
    value2: unknown;
  }>;
  cached: boolean;
}
```

**Policy:**
- Domain whitelist
- Rate limit: 3 calls / 1 minuta / session
- Caching: 1 hodina

**Příklad použití:**
```typescript
const result = await registry.invokeTool('verify.compare', {}, {
  domain: 'example.com',
  url1: 'https://example.com/page1',
  url2: 'https://example.com/page2',
  field: 'price'
});
```

**Použití:** Porovnání cen, verzí, změn na webu.

---

## Použití v kódu

### Základní příklad

```typescript
import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);

// Registrace všech tools
registerAllTools(registry, prisma);

// Použití toolu
const result = await registry.invokeTool(
  'lead.get_or_create',
  {
    sessionId: 'session-123',
    leadId: 'lead-123',
  },
  {
    email: 'john@example.com',
    name: 'John Doe',
  }
);

if (result.success) {
  console.log('Lead created:', result.output);
} else {
  console.error('Error:', result.error);
}
```

### V OpenAI Workflow

```typescript
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';

const workflowRunner = new WorkflowRunner(config, registry, prisma);

// Workflow automaticky používá tools z registry
const result = await workflowRunner.runWorkflow(
  'router',
  { sessionId: 'session-123', leadId: 'lead-123' },
  'I want to learn more about your services'
);
```

## Policy a bezpečnost

### PII (Personally Identifiable Information)

Některé tools automaticky redaktují PII v audit logu:
- `lead.get_or_create` - redaktuje email, phone, name
- `lead.update` - redaktuje email, phone, name

### Rate Limiting

Některé tools mají rate limiting:
- `verify.*` tools - 3-10 calls / minuta / session
- `message.send_template` - vyžaduje human review

### Domain Whitelist

`verify.*` tools kontrolují domain whitelist pro bezpečnost.

## Vytvoření vlastního toolu

Viz [CONTRIBUTING.md](CONTRIBUTING.md) nebo použij:

```bash
pnpm create-tool my-tool custom
```

## Další dokumentace

- [Tool Registry Guide](packages/toolkit-core/README.md)
- [Tool Authoring Guide](CONTRIBUTING.md)
- [API Key Management](docs/API_KEY_MANAGEMENT.md)
- [Architecture](ARCHITECTURE.md)

---

**Poslední aktualizace:** 2024-01-XX  
**Celkový počet tools:** 24
