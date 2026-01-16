# Cost Control - Setup Guide

## Krok 1: Prisma migrace

Cost Control vyžaduje 3 nové Prisma modely. Spusť migraci:

```bash
cd packages/toolkit-core
pnpm prisma:migrate --name add_cost_control_models
```

Nebo pokud nemáš pnpm v PATH:
```bash
cd packages/toolkit-core
npx prisma migrate dev --name add_cost_control_models
```

## Krok 2: Generování Prisma Client

```bash
pnpm prisma:generate
```

Nebo:
```bash
npx prisma generate
```

## Krok 3: Ověření

```bash
# Z root adresáře
pnpm typecheck
pnpm build --filter cost-control
pnpm build --filter openai-runtime
```

## Krok 4: Spuštění databáze (pokud ještě neběží)

```bash
cd infra
docker-compose up -d
```

## Co bylo přidáno do Prisma schema

### TokenBudget
- Tracking token budgetu per session/workflow/tool/daily
- Budget limity a aktuální použití

### CostRecord
- Záznamy všech LLM volání
- Token usage, cost v USD
- Metadata (cached, fallback, atd.)

### ContextCache
- Cache entries pro opakované dotazy
- TTL, hit count, expiration

## Po dokončení

Po spuštění migrace můžeš:

1. ✅ Používat Cost Control vrstvu v WorkflowRunner
2. ✅ Trackovat náklady na LLM
3. ✅ Používat role-based routing
4. ✅ Využívat cache pro opakované dotazy
5. ✅ Mít garantovaný fallback při selhání

## Troubleshooting

### Chyba: "pnpm is not recognized"
- Použij `npx prisma` místo `pnpm prisma`
- Nebo nainstaluj pnpm: `npm install -g pnpm`

### Chyba: "Database connection failed"
- Zkontroluj, že PostgreSQL běží: `docker-compose ps` (v `infra/`)
- Zkontroluj DATABASE_URL v `.env`

### Chyba: "Model already exists"
- Migrace už byla spuštěna
- Zkontroluj `packages/toolkit-core/prisma/migrations/`

---

**Status:** Po dokončení migrace je Cost Control připraven k použití
