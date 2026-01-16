# Prisma Migrace - Instrukce

## ⚠️ Databáze není spuštěná

Prisma migrace vyžaduje běžící PostgreSQL databázi.

## Krok 1: Spuštění databáze

```bash
cd infra
docker-compose up -d
```

Ověř, že databáze běží:
```bash
docker-compose ps
```

## Krok 2: Prisma migrace

Po spuštění databáze spusť migraci:

```bash
cd packages/toolkit-core
npx prisma migrate dev --name add_cost_control_models
```

Toto vytvoří migraci pro:
- `TokenBudget` model
- `CostRecord` model
- `ContextCache` model
- `Session.tenantId` field a relation
- `Lead.tenantId` field a relation

## Krok 3: Ověření

```bash
# Z root adresáře
cd packages/cost-control
npx tsc --noEmit
```

## Status

- ✅ Závislosti nainstalované
- ✅ Chyby opraveny
- ✅ Prisma Client vygenerován
- ✅ TypeScript kompiluje bez chyb
- ⏳ Čeká na spuštění databáze a migraci

---

**Po dokončení migrace bude Cost Control plně funkční!**
