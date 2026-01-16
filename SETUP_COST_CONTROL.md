# Cost Control - Rychlý Setup

## ✅ Co je hotovo

- ✅ Všechny komponenty implementované
- ✅ Prisma schema rozšířeno
- ✅ WorkflowRunner integrován
- ✅ Dokumentace kompletní
- ✅ Vše commitnuté na GitHub

## 🔧 Co je potřeba udělat (manuálně)

Protože `pnpm` není v PATH, spusť tyto příkazy ručně:

### 1. Prisma migrace

```bash
cd packages/toolkit-core
pnpm prisma:migrate --name add_cost_control_models
```

**Nebo pokud nemáš pnpm:**
```bash
cd packages/toolkit-core
npx prisma migrate dev --name add_cost_control_models
```

### 2. Generování Prisma Client

```bash
pnpm prisma:generate
```

**Nebo:**
```bash
npx prisma generate
```

### 3. Ověření

```bash
# Z root adresáře
pnpm typecheck
pnpm build --filter cost-control
pnpm build --filter openai-runtime
```

## 📝 Poznámky

- Ujisti se, že máš spuštěnou databázi (`docker-compose up -d` v `infra/`)
- Ujisti se, že máš nastavený `DATABASE_URL` v `.env`
- Po migraci budeš moci používat všechny Cost Control funkce

## 🎯 Po dokončení

Po spuštění migrace můžeš:

1. ✅ Používat Cost Control v WorkflowRunner (automaticky)
2. ✅ Trackovat náklady na LLM
3. ✅ Používat role-based routing
4. ✅ Využívat cache
5. ✅ Mít garantovaný fallback

---

**Všechny soubory jsou připravené, čeká jen na Prisma migraci!**
