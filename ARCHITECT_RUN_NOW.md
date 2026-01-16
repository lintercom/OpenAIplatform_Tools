# 🚀 Architect - Spuštění TEĎ

## ⚠️ Důležité

Architect **vyžaduje pnpm** (ne npm), protože používá workspaces.

## Rychlý start

### 1. Instalace pnpm (pokud ještě nemáš)

```bash
npm install -g pnpm
```

### 2. Instalace závislostí

```bash
pnpm install
```

### 3. Spuštění Architect

**Možnost A - Automaticky (Windows):**
```bash
pnpm architect:start
```

**Možnost B - Manuálně (2 terminály):**

**Terminál 1 - API:**
```bash
cd apps/architect-api
pnpm dev
```

**Terminál 2 - UI:**
```bash
cd apps/architect-ui
pnpm dev
```

## Otevření v prohlížeči

Po spuštění obou serverů:

1. Otevři **http://localhost:5174** v prohlížeči
2. Začni chatovat s Architectem
3. Odpovídej na otázky
4. Po dokončení questionnaire se vygeneruje plán

## Co uvidíš

- **Chat panel (vlevo)** - Konverzace s Architectem
- **Artifact panel (vpravo)** - Taby pro:
  - Blueprint
  - Tool Topology
  - Workflows
  - Implementation Plan
  - ADRs

## Troubleshooting

### "pnpm is not recognized"
```bash
npm install -g pnpm
```

### "workspace:* not supported"
- Použij `pnpm` místo `npm`

### Port je obsazený
- API: změň `PORT` v `.env` nebo `apps/architect-api/src/index.ts`
- UI: změň `port` v `apps/architect-ui/vite.config.ts`

---

**Po spuštění: http://localhost:5174**
