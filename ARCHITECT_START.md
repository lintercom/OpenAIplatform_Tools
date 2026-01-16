# 🚀 Architect - Spuštění

## Rychlý start

### Krok 1: Instalace závislostí

**Z root adresáře:**
```bash
pnpm install
```

### Krok 2: Spuštění API (Terminál 1)

```bash
cd apps/architect-api
pnpm dev
```

**API poběží na:** http://localhost:3001

### Krok 3: Spuštění UI (Terminál 2)

```bash
cd apps/architect-ui
pnpm dev
```

**UI poběží na:** http://localhost:5174

## Otevření v prohlížeči

1. Otevři **http://localhost:5174**
2. Začni chatovat s Architectem
3. Odpovídej na otázky
4. Po dokončení se vygeneruje plán

## Co potřebuješ

- ✅ Node.js 20+
- ✅ pnpm 8+ (ne npm!)
- ✅ PostgreSQL (pokud chceš použít DB, jinak session storage je v paměti)

## Troubleshooting

### pnpm není nainstalované
```bash
npm install -g pnpm
```

### Port je obsazený
- API: změň `PORT` v `.env` nebo `index.ts`
- UI: změň `port` v `vite.config.ts`

### Workspace chyby
- Použij `pnpm` místo `npm` - npm nepodporuje workspaces

---

**Po spuštění obou serverů otevři http://localhost:5174!**
