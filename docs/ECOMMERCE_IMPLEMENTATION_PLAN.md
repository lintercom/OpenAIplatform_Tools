# Implementační plán - E-commerce Tools

## 📋 Přehled

Tento dokument popisuje implementační plán pro e-commerce tools potřebné pro e-shop systém s AI asistentem.

---

## 🎯 Fáze 1: Commerce Core (Kritické) 🔴

### 1.1 Prisma Schema - Commerce modely

**Soubory:**
- `packages/toolkit-core/prisma/schema.prisma` (rozšíření)

**Modely:**
```prisma
model Product {
  id          String   @id @default(uuid())
  sku         String   @unique
  name        String
  description String?
  category    String?
  price       Float
  stock       Int      @default(0)
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  cartItems   CartItem[]
  orderItems  OrderItem[]
  
  @@index([sku])
  @@index([category])
}

model Cart {
  id          String   @id @default(uuid())
  sessionId   String?  @unique
  leadId      String?
  tenantId    String?
  items       CartItem[]
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([sessionId])
  @@index([leadId])
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  productId String
  quantity  Int      @default(1)
  price     Float    // Snapshot ceny při přidání
  metadata  Json?
  createdAt DateTime @default(now())
  
  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])
  
  @@unique([cartId, productId])
}

model Order {
  id              String      @id @default(uuid())
  orderNumber     String      @unique
  leadId          String?
  tenantId        String?
  status          String      @default("pending") // pending, confirmed, paid, shipped, delivered, cancelled
  totalAmount     Float
  shippingMethod  String?
  shippingCost    Float       @default(0)
  paymentMethod   String?
  paymentStatus   String      @default("pending") // pending, paid, failed, refunded
  shippingAddress Json?
  billingAddress  Json?
  metadata        Json?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  items           OrderItem[]
  
  @@index([leadId])
  @@index([orderNumber])
  @@index([status])
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  productId String
  quantity  Int
  price     Float    // Snapshot ceny při objednání
  metadata  Json?
  createdAt DateTime @default(now())
  
  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])
}
```

---

### 1.2 Commerce Tools - Cart

**Soubor:** `packages/toolkit-tools/src/tools/cart.ts`

**Tools:**
- `cart.create` - Vytvoření košíku
- `cart.get` - Získání košíku
- `cart.add_item` - Přidání produktu
- `cart.remove_item` - Odebrání produktu
- `cart.update_item` - Aktualizace množství
- `cart.clear` - Vyprázdnění košíku
- `cart.validate` - Validace košíku (dostupnost, kombinace)

---

### 1.3 Commerce Tools - Order

**Soubor:** `packages/toolkit-tools/src/tools/order.ts`

**Tools:**
- `order.create` - Vytvoření objednávky z košíku
- `order.get` - Získání objednávky
- `order.confirm` - Potvrzení objednávky
- `order.update_status` - Aktualizace statusu
- `order.get_status` - Status objednávky

---

### 1.4 Commerce Tools - Product (Rozšíření)

**Soubor:** `packages/toolkit-tools/src/tools/product.ts`

**Tools:**
- `product.search` - Fulltext + sémantické vyhledávání
- `product.get` - Získání produktu
- `product.filter_by_compatibility` - Filtr podle kompatibility
- `product.explain_differences` - Vysvětlení rozdílů mezi variantami
- `product.recommend_variant` - Doporučení varianty
- `product.suggest_accessories` - Doporučení doplňků
- `product.check_availability` - Kontrola dostupnosti

---

### 1.5 Commerce Tools - Checkout

**Soubor:** `packages/toolkit-tools/src/tools/checkout.ts`

**Tools:**
- `checkout.calculate_shipping` - Výpočet dopravy
- `checkout.select_payment_method` - Dostupné platební metody
- `checkout.validate` - Validace před checkout

---

## 🎯 Fáze 2: Intent Detection (Střední priorita) 🟡

### 2.1 Intent Tools

**Soubor:** `packages/toolkit-tools/src/tools/intent.ts`

**Tools:**
- `intent.detect` - Detekce záměru (nákup/poptávka/servis/bazar)
- `intent.classify_user_type` - Klasifikace typu uživatele (B2C/B2B/farmář/servisák)
- `intent.detect_urgency` - Detekce urgency (akutní problém)

**Implementace:**
- Použití OpenAI pro klasifikaci
- Uložení výsledků do session metadata
- Cache pro opakované dotazy

---

## 🎯 Fáze 3: Quote & Service (Střední priorita) 🟡

### 3.1 Quote Tools

**Soubor:** `packages/toolkit-tools/src/tools/quote.ts`

**Prisma modely:**
```prisma
model QuoteRequest {
  id          String   @id @default(uuid())
  leadId      String?
  sessionId   String?
  status      String   @default("draft") // draft, submitted, quoted, accepted, rejected
  data        Json     // Strukturovaná data poptávky
  attachments Json?    // Reference na fotky/dokumenty
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([leadId])
  @@index([status])
}

model Quote {
  id            String   @id @default(uuid())
  quoteRequestId String  @unique
  leadId        String?
  status        String   @default("draft") // draft, sent, accepted, rejected
  totalAmount   Float?
  items         Json     // Položky nabídky
  validUntil    DateTime?
  metadata      Json?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([leadId])
  @@index([status])
}
```

**Tools:**
- `quote.create_request` - Vytvoření poptávky
- `quote.attach_files` - Připojení fotek/dokumentů
- `quote.normalize_data` - Sjednocení dat
- `quote.generate_draft` - Generování návrhu (AI)
- `quote.send_to_customer` - Odeslání nabídky
- `quote.accept` - Přijetí nabídky
- `quote.get_status` - Status poptávky/nabídky

---

### 3.2 Service Tools

**Soubor:** `packages/toolkit-tools/src/tools/service.ts`

**Prisma modely:**
```prisma
model ServiceTicket {
  id          String   @id @default(uuid())
  leadId      String?
  sessionId   String?
  status      String   @default("open") // open, in_progress, waiting_parts, resolved, closed
  urgency     String   @default("normal") // low, normal, high, critical
  description String
  requiredParts Json?  // Detekované potřebné díly
  metadata    Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([leadId])
  @@index([status])
  @@index([urgency])
}
```

**Tools:**
- `service.create_ticket` - Vytvoření servisního ticketu
- `service.detect_required_parts` - Detekce potřebných dílů (AI)
- `service.estimate_urgency` - Odhad priority
- `service.get_ticket` - Získání ticketu
- `service.update_ticket` - Aktualizace ticketu

---

## 🎯 Fáze 4: Analytics (Nízká priorita) 🟢

### 4.1 Analytics Tools

**Soubor:** `packages/toolkit-tools/src/tools/analytics.ts`

**Tools:**
- `analytics.detect_dropoff` - Detekce opuštění
- `analytics.evaluate_conversion_path` - Analýza cesty k nákupu
- `analytics.generate_insights` - Generování insights
- `analytics.build_ad_audience` - Vytvoření remarketing publika
- `analytics.recommend_experiment` - Návrh A/B testů
- `analytics.optimize_flow` - Optimalizace flow

**Implementace:**
- Použití existujících event.track dat
- Agregace a analýza
- Generování reportů

---

## 📝 Implementační pořadí

### Krok 1: Prisma Schema
1. ✅ Přidat Commerce modely (Product, Cart, CartItem, Order, OrderItem)
2. ✅ Přidat Quote modely (QuoteRequest, Quote)
3. ✅ Přidat Service modely (ServiceTicket)
4. ✅ Vytvořit migraci

### Krok 2: Commerce Tools
1. ✅ `cart.ts` - Cart management
2. ✅ `order.ts` - Order management
3. ✅ `product.ts` - Product search & recommendations
4. ✅ `checkout.ts` - Checkout flow

### Krok 3: Intent Tools
1. ✅ `intent.ts` - Intent detection

### Krok 4: Quote & Service
1. ✅ `quote.ts` - Quote management
2. ✅ `service.ts` - Service tickets

### Krok 5: Integrace
1. ✅ Aktualizovat `packages/toolkit-tools/src/index.ts`
2. ✅ Aktualizovat `AI_TOOLS_REFERENCE.md`
3. ✅ Přidat testy

---

## 🧪 Testování

Pro každý tool:
- ✅ Unit testy pro handler funkce
- ✅ Integration testy s Prisma
- ✅ Testy edge cases (prázdný košík, nedostupný produkt, atd.)

---

## 📚 Dokumentace

- ✅ Aktualizovat `AI_TOOLS_REFERENCE.md`
- ✅ Přidat příklady použití
- ✅ Dokumentovat Prisma modely

---

**Status:** Plán připraven k implementaci
