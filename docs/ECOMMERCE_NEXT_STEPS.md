# E-commerce Tools - Další kroky

## ✅ Co je hotovo

- ✅ Všechny e-commerce tools implementované (37 tools)
- ✅ Prisma schema rozšířeno o 7 nových modelů
- ✅ Všechny tools registrované v index.ts
- ✅ Dokumentace kompletní
- ✅ Všechny změny commitnuté na GitHub

## 🔧 Co je potřeba udělat

### Krok 1: Spuštění databáze

```bash
cd infra
docker-compose up -d
```

### Krok 2: Prisma migrace

**Z root adresáře:**
```bash
pnpm prisma:migrate
```

**Nebo z packages/toolkit-core:**
```bash
cd packages/toolkit-core
pnpm prisma:migrate
```

Toto vytvoří novou migraci pro e-commerce modely.

### Krok 3: Generování Prisma Client

**Z root adresáře:**
```bash
pnpm prisma:generate
```

**Nebo z packages/toolkit-core:**
```bash
cd packages/toolkit-core
pnpm prisma:generate
```

### Krok 4: Ověření

```bash
# Type check
pnpm typecheck

# Build
pnpm build

# Testy
pnpm test
```

## 📝 Poznámky

- Pokud nemáš pnpm v PATH, použij `npm run` příkazy z package.json
- Ujisti se, že máš nastavený DATABASE_URL v .env souboru
- Prisma migrace vytvoří novou migrační složku v `packages/toolkit-core/prisma/migrations/`

## 🎯 Po dokončení

Po spuštění migrace a generování Prisma clientu můžeš:

1. ✅ Používat všechny e-commerce tools v kódu
2. ✅ Vytvářet produkty, košíky, objednávky
3. ✅ Používat intent detection a quote tools
4. ✅ Vytvářet servisní tickety

Všechny tools jsou připravené a čekají na migraci!

---

**Status:** Implementace dokončena, čeká na Prisma migraci
