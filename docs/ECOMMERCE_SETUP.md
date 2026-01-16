# E-commerce Tools - Setup Guide

## Přehled

Tento dokument popisuje, jak nastavit a použít nové e-commerce tools v AI Toolkit platformě.

## Požadavky

- Node.js 20+
- pnpm 8+
- PostgreSQL (Docker nebo lokální)
- Prisma CLI

## Krok 1: Prisma Migrace

Po přidání nových e-commerce modelů je potřeba spustit migraci:

```bash
# Z root adresáře projektu
pnpm prisma:migrate

# Nebo z packages/toolkit-core
cd packages/toolkit-core
pnpm prisma:migrate
```

Toto vytvoří novou migraci s názvem `add_ecommerce_models` (nebo podobným).

## Krok 2: Generování Prisma Client

Po migraci vygeneruj Prisma client:

```bash
# Z root adresáře
pnpm prisma:generate

# Nebo z packages/toolkit-core
cd packages/toolkit-core
pnpm prisma:generate
```

## Krok 3: Ověření

Zkontroluj, že vše funguje:

```bash
# Type check
pnpm typecheck

# Build
pnpm build

# Testy (pokud existují)
pnpm test
```

## Nové Prisma Modely

### Product
```prisma
model Product {
  id          String   @id @default(uuid())
  sku         String   @unique
  name        String
  description String?  @db.Text
  category    String?
  price       Float
  stock       Int      @default(0)
  metadata    Json?
  // ...
}
```

### Cart & CartItem
```prisma
model Cart {
  id          String   @id @default(uuid())
  sessionId   String?  @unique
  leadId      String?
  tenantId    String?
  items       CartItem[]
  // ...
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  productId String
  quantity  Int      @default(1)
  price     Float
  // ...
}
```

### Order & OrderItem
```prisma
model Order {
  id              String      @id @default(uuid())
  orderNumber     String      @unique
  leadId          String?
  status          String      @default("pending")
  totalAmount     Float
  // ...
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  price     Float
  // ...
}
```

### QuoteRequest & Quote
```prisma
model QuoteRequest {
  id          String   @id @default(uuid())
  leadId      String?
  sessionId   String?
  status      String   @default("draft")
  data        Json
  attachments Json?
  // ...
}

model Quote {
  id            String   @id @default(uuid())
  quoteRequestId String  @unique
  status        String   @default("draft")
  totalAmount   Float?
  items         Json
  // ...
}
```

### ServiceTicket
```prisma
model ServiceTicket {
  id          String   @id @default(uuid())
  leadId      String?
  sessionId   String?
  status      String   @default("open")
  urgency     String   @default("normal")
  description String   @db.Text
  requiredParts Json?
  // ...
}
```

## Použití Tools

### Cart Tools

```typescript
import { registerAllTools } from '@ai-toolkit/tools';
import { ToolRegistry } from '@ai-toolkit/core';

const registry = new ToolRegistry(prisma);
registerAllTools(registry, prisma);

// Vytvoření košíku
const cart = await registry.invokeTool('cart.create', {}, {
  sessionId: 'session-123'
});

// Přidání produktu
await registry.invokeTool('cart.add_item', {}, {
  sessionId: 'session-123',
  productId: 'product-123',
  quantity: 2
});

// Získání košíku
const cartData = await registry.invokeTool('cart.get', {}, {
  sessionId: 'session-123'
});
```

### Order Tools

```typescript
// Vytvoření objednávky z košíku
const order = await registry.invokeTool('order.create', {}, {
  sessionId: 'session-123',
  shippingMethod: 'standard',
  shippingCost: 99,
  paymentMethod: 'card',
  shippingAddress: {
    street: 'Hlavní 123',
    city: 'Praha',
    postalCode: '12000'
  }
});

// Získání statusu
const status = await registry.invokeTool('order.get_status', {}, {
  orderNumber: order.output.orderNumber
});
```

### Product Tools

```typescript
// Vyhledávání produktů
const products = await registry.invokeTool('product.search', {}, {
  query: 'ložisko',
  category: 'díly',
  inStock: true
});

// Kontrola dostupnosti
const availability = await registry.invokeTool('product.check_availability', {}, {
  sku: 'BEARING-123'
});

// Doporučení doplňků
const accessories = await registry.invokeTool('product.suggest_accessories', {}, {
  productId: 'product-123',
  limit: 5
});
```

### Intent Tools

```typescript
// Detekce záměru
const intent = await registry.invokeTool('intent.detect', {}, {
  sessionId: 'session-123',
  message: 'Potřebuji koupit ložisko'
});

// Klasifikace uživatele
const userType = await registry.invokeTool('intent.classify_user_type', {}, {
  leadId: 'lead-123'
});
```

### Quote Tools

```typescript
// Vytvoření poptávky
const quoteRequest = await registry.invokeTool('quote.create_request', {}, {
  leadId: 'lead-123',
  data: {
    items: [
      { name: 'Stroj XYZ', quantity: 1 }
    ],
    requirements: 'Potřebuji stroj pro farmu'
  }
});

// Generování nabídky
const quote = await registry.invokeTool('quote.generate_draft', {}, {
  quoteRequestId: quoteRequest.output.quoteRequestId
});
```

### Service Tools

```typescript
// Vytvoření servisního ticketu
const ticket = await registry.invokeTool('service.create_ticket', {}, {
  leadId: 'lead-123',
  description: 'Stroj nefunguje, potřebuji opravu',
  urgency: 'high'
});

// Detekce potřebných dílů
const parts = await registry.invokeTool('service.detect_required_parts', {}, {
  ticketId: ticket.output.ticketId
});
```

## Seed Data (volitelné)

Pro testování můžete přidat seed data do `packages/toolkit-core/prisma/seed.ts`:

```typescript
// Příklad seed dat
await prisma.product.createMany({
  data: [
    {
      sku: 'BEARING-001',
      name: 'Ložisko 6205',
      description: 'Ložisko pro traktor',
      category: 'díly',
      price: 450,
      stock: 10,
      metadata: {
        machineType: 'tractor',
        compatibility: ['model-a', 'model-b']
      }
    },
    // ...
  ]
});
```

## Troubleshooting

### "Model not found" chyba
- Ujisti se, že jsi spustil migraci: `pnpm prisma:migrate`
- Zkontroluj, že Prisma client je vygenerovaný: `pnpm prisma:generate`

### "Cannot find module '@prisma/client'"
- Spusť `pnpm install` v root adresáři
- Spusť `pnpm prisma:generate`

### TypeScript chyby
- Spusť `pnpm typecheck` pro kontrolu typů
- Ujisti se, že všechny imports jsou správné

## Další kroky

- Přidej seed data pro testování
- Vytvoř testy pro nové tools
- Integruj tools do workflow templates
- Přidej UI komponenty pro e-commerce flow

---

**Status:** Setup guide připraven
