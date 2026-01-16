# Architect - Instrukce pro spuštění

## ⚠️ Důležité

Architect používá **pnpm workspaces**, takže musíš použít `pnpm` (ne `npm`).

## Spuštění

### 1. Instalace závislostí (z root adresáře)

```bash
pnpm install
```

**Nebo pokud nemáš pnpm:**
```bash
npm install -g pnpm
pnpm install
```

### 2. Spuštění Architect API

**Terminál 1:**
```bash
cd apps/architect-api
pnpm dev
```

API poběží na **http://localhost:3001**

### 3. Spuštění Architect UI

**Terminál 2:**
```bash
cd apps/architect-ui
pnpm dev
```

UI poběží na **http://localhost:5174**

## Otevření v prohlížeči

1. Otevři **http://localhost:5174** v prohlížeči
2. Začni chatovat s Architectem
3. Odpovídej na otázky
4. Po dokončení questionnaire se vygeneruje plán

## Troubleshooting

### Chyba: "workspace:* not supported"
- **Řešení:** Použij `pnpm` místo `npm`
- `pnpm` podporuje workspaces, `npm` ne

### Chyba: "pnpm is not recognized"
- **Řešení:** Nainstaluj pnpm:
  ```bash
  npm install -g pnpm
  ```

### Chyba: "Port already in use"
- **Řešení:** Změň port v `vite.config.ts` (UI) nebo `index.ts` (API)

### Chyba: "Database connection failed"
- **Řešení:** Spusť databázi:
  ```bash
  cd infra
  docker-compose up -d
  ```

---

**Po spuštění obou serverů otevři http://localhost:5174 v prohlížeči!**
