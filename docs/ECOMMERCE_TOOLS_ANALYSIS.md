# Analýza E-commerce Tools - Co máme a co chybí

## 📊 Přehled

Tento dokument analyzuje, které tools máme v knihovně pro e-shop systém a které by měly být doplněny.

---

## ✅ CO MÁME (Současné tools)

### 1️⃣ SESSION & INTENT
- ✅ **session.start** → `StartSession` (částečně - chybí zdroj návštěvy)
- ✅ **session.get** → Získání session info
- ✅ **session.set_consent** → GDPR compliance
- ✅ **lead.score** → `ScoreLeadPotential` (hot/cold scoring)
- ✅ **event.track** → `TrackEvent` (tracking všech událostí)
- ✅ **event.timeline** → Timeline eventů

### 2️⃣ LEAD MANAGEMENT
- ✅ **lead.get_or_create** → Vytvoření/získání leadu
- ✅ **lead.update** → Aktualizace leadu
- ✅ **lead.set_stage** → Nastavení stage
- ✅ **lead.add_tags** → Tagování

### 3️⃣ CATALOG (Základní)
- ✅ **catalog.get_services** → `SearchProducts` (základní, ale ne fulltext search)
- ✅ **catalog.get_service** → Získání konkrétní služby
- ✅ **catalog.get_faq** → FAQ

### 4️⃣ PRICING
- ✅ **pricing.get_rules** → Pricing rules
- ✅ **pricing.get_allowed_offer** → B2B pricing

### 5️⃣ MESSAGING
- ✅ **message.send_template** → Odeslání template zprávy
- ✅ **message.send_for_review** → Zpráva k review

### 6️⃣ CRM
- ✅ **crm.upsert_lead** → CRM integrace
- ✅ **crm.create_task** → Vytvoření tasku

### 7️⃣ VERIFY
- ✅ **verify.search** → Vyhledání v dokumentech
- ✅ **verify.fetch** → Získání dokumentu
- ✅ **verify.extract** → Extrakce dat
- ✅ **verify.compare** → Porovnání dokumentů

---

## ❌ CO CHYBÍ (Potřebné pro e-shop)

### 1️⃣ SESSION & INTENT (Rozšíření)
- ❌ **DetectIntent** - Určení záměru (nákup/poptávka/servis/bazar)
- ❌ **ClassifyUserType** - B2C/B2B/farmář/servisák
- ❌ **DetectUrgency** - Urgence problému (servis/díly)

**Priorita:** 🟡 STŘEDNÍ - Důležité pro personalizaci

---

### 2️⃣ PRODUKTOVÝ & NÁKUPNÍ FLOW (Kritické)
- ❌ **SearchProducts** - Fulltext + sémantické vyhledávání produktů
- ❌ **FilterByCompatibility** - Filtr podle stroje/parametrů
- ❌ **ExplainDifferences** - Vysvětlení rozdílů mezi variantami
- ❌ **RecommendVariant** - Doporučení "nejlepší volby"
- ❌ **SuggestAccessories** - Cross-sell/upsell (doporučení doplňků)
- ❌ **CheckAvailability** - Dostupnost ze skladu (POHODA)

**Priorita:** 🔴 VYSOKÁ - Základní funkce e-shopu

---

### 3️⃣ KOŠÍK & OBJEDNÁVKA (Kritické)
- ❌ **CreateCart** - Vytvoření košíku
- ❌ **AddToCart** - Přidání produktu do košíku
- ❌ **RemoveFromCart** - Odebrání z košíku
- ❌ **UpdateCartItem** - Aktualizace množství
- ❌ **GetCart** - Získání košíku
- ❌ **ValidateCart** - Validace košíku (dostupnost, kombinace)
- ❌ **CalculateShipping** - Výpočet dopravy (balík/paleta/osobně)
- ❌ **SelectPaymentMethod** - Dostupné platební metody
- ❌ **CreateOrder** - Vytvoření objednávky
- ❌ **ConfirmOrder** - Potvrzení objednávky
- ❌ **GetOrderStatus** - Status objednávky

**Priorita:** 🔴 VYSOKÁ - Kritické pro e-commerce

---

### 4️⃣ POPTÁVKY / STROJE / SERVIS (Důležité)
- ❌ **CreateQuoteRequest** - Vytvoření strukturované poptávky
- ❌ **AttachPhotosOrDocs** - Připojení fotek/dokumentů
- ❌ **NormalizeQuoteData** - Sjednocení dat pro obchodníky
- ❌ **GenerateQuoteDraft** - Návrh nabídky (AI)
- ❌ **SendQuoteToCustomer** - Odeslání nabídky
- ❌ **AcceptQuote** - Přijetí nabídky zákazníkem
- ❌ **GetQuoteStatus** - Status poptávky

**Priorita:** 🟡 STŘEDNÍ - Důležité pro B2B/high-margin

---

### 5️⃣ SERVIS (Důležité)
- ❌ **CreateServiceTicket** - Vytvoření servisního případu
- ❌ **DetectRequiredParts** - Detekce potřebných dílů (AI)
- ❌ **EstimateServiceUrgency** - Odhad priority zásahu
- ❌ **GetServiceTicket** - Získání servisního ticketu
- ❌ **UpdateServiceTicket** - Aktualizace ticketu

**Priorita:** 🟡 STŘEDNÍ - Důležité pro servisní business

---

### 6️⃣ POHODA CONNECTOR (Kritické pro integraci)
- ❌ **SyncProductsFromPohoda** - Synchronizace produktů
- ❌ **SyncStockFromPohoda** - Synchronizace skladu
- ❌ **SyncPricesFromPohoda** - Synchronizace cen
- ❌ **ExportOrderToPohoda** - Export objednávky
- ❌ **CreateCustomerInPohoda** - Vytvoření zákazníka
- ❌ **GetPohodaSyncStatus** - Status synchronizace

**Priorita:** 🔴 VYSOKÁ - Kritické pro integraci s POHODA

---

### 7️⃣ DATA, UČENÍ, ZISK (Důležité pro optimalizaci)
- ✅ **event.track** - Máme (základní tracking)
- ❌ **DetectDropOff** - Detekce opuštění (kdo odešel a kdy)
- ❌ **EvaluateConversionPath** - Analýza cesty k nákupu
- ❌ **GenerateInsights** - Generování insights (co zlepšit)
- ❌ **BuildAdAudience** - Vytvoření remarketing publika
- ❌ **RecommendExperiment** - Návrh A/B testů
- ❌ **OptimizeFlow** - Optimalizace flow (automatické úpravy)

**Priorita:** 🟡 STŘEDNÍ - Důležité pro dlouhodobý růst

---

## 📦 Doporučené balíčky k vytvoření

### 1. `@ai-toolkit/commerce` (VYSOKÁ PRIORITA)
**Tools:**
- Cart management (create, add, remove, update, get, validate)
- Order management (create, confirm, get status)
- Shipping calculation
- Payment method selection
- Product search (fulltext + semantic)
- Product filtering (compatibility, parameters)
- Product recommendations (variants, accessories)

**Soubory:**
- `packages/toolkit-tools/src/tools/commerce.ts`
- `packages/toolkit-tools/src/tools/cart.ts`
- `packages/toolkit-tools/src/tools/order.ts`
- `packages/toolkit-tools/src/tools/product.ts`

---

### 2. `@ai-toolkit/intent` (STŘEDNÍ PRIORITA)
**Tools:**
- DetectIntent (nákup/poptávka/servis/bazar)
- ClassifyUserType (B2C/B2B/farmář/servisák)
- DetectUrgency (akutní problém)

**Soubory:**
- `packages/toolkit-tools/src/tools/intent.ts`

---

### 3. `@ai-toolkit/quote` (STŘEDNÍ PRIORITA)
**Tools:**
- CreateQuoteRequest
- AttachPhotosOrDocs
- NormalizeQuoteData
- GenerateQuoteDraft (AI)
- SendQuoteToCustomer
- AcceptQuote

**Soubory:**
- `packages/toolkit-tools/src/tools/quote.ts`

---

### 4. `@ai-toolkit/service` (STŘEDNÍ PRIORITA)
**Tools:**
- CreateServiceTicket
- DetectRequiredParts (AI)
- EstimateServiceUrgency
- GetServiceTicket
- UpdateServiceTicket

**Soubory:**
- `packages/toolkit-tools/src/tools/service.ts`

---

### 5. `@ai-toolkit/pohoda` (VYSOKÁ PRIORITA - pokud používáte POHODA)
**Tools:**
- SyncProductsFromPohoda
- SyncStockFromPohoda
- SyncPricesFromPohoda
- ExportOrderToPohoda
- CreateCustomerInPohoda
- GetPohodaSyncStatus

**Soubory:**
- `packages/toolkit-tools/src/tools/pohoda.ts`
- `packages/adapters/src/pohoda-adapter.ts` (nový adapter)

**Poznámka:** Vyžaduje POHODA API nebo XML export/import

---

### 6. `@ai-toolkit/analytics` (STŘEDNÍ PRIORITA)
**Tools:**
- DetectDropOff
- EvaluateConversionPath
- GenerateInsights
- BuildAdAudience
- RecommendExperiment
- OptimizeFlow

**Soubory:**
- `packages/toolkit-tools/src/tools/analytics.ts`

---

## 🎯 Implementační plán

### Fáze 1: Kritické (E-commerce Core) 🔴
1. **Commerce Tools** - Cart, Order, Product Search
2. **Pohoda Connector** - Synchronizace produktů, skladu, cen

**Odhad:** 2-3 dny

---

### Fáze 2: Důležité (UX Enhancement) 🟡
3. **Intent Tools** - DetectIntent, ClassifyUserType, DetectUrgency
4. **Quote Tools** - Poptávky a nabídky
5. **Service Tools** - Servisní tickety

**Odhad:** 2-3 dny

---

### Fáze 3: Optimalizace (Analytics) 🟡
6. **Analytics Tools** - Insights, conversion path, experiments

**Odhad:** 1-2 dny

---

## 💡 Doporučení

### Okamžité akce:
1. ✅ Vytvořit `commerce.ts` s cart a order tools
2. ✅ Vytvořit `product.ts` s search a filter tools
3. ✅ Pokud používáte POHODA, vytvořit `pohoda-adapter.ts`

### Střednědobé:
4. ✅ Přidat intent detection tools
5. ✅ Přidat quote a service tools
6. ✅ Rozšířit analytics tools

### Dlouhodobé:
7. ✅ AI-powered recommendations
8. ✅ Automated flow optimization
9. ✅ Advanced analytics a insights

---

## 📝 Poznámky

- **POHODA Connector** vyžaduje znalost POHODA API nebo XML formátu
- **Product Search** by měl podporovat fulltext i sémantické vyhledávání
- **Cart/Order** tools potřebují integraci s Commerce Core (nebo vlastní implementaci)
- **Analytics Tools** mohou vyžadovat externí analytics službu (Google Analytics, Mixpanel, atd.)

---

**Status:** Analýza dokončena - připraveno k implementaci
