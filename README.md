# AI Toolkit for OpenAI Platform

Produkční monorepo pro vytváření opakovatelné "AI Tools Library" na OpenAI Agent Platform. Tento toolkit poskytuje Tool Registry, OpenAI runtime integraci, workflow templates, dokumentační sync pipeline a sadu built-in tools.

## Struktura projektu

```
/
  apps/
    api/                # Backend API (Fastify) - tool gateway + agent gateway
    web/                # Minimální demo UI
  packages/
    toolkit-core/       # Tool Registry, policy engine, audit, schemas
    toolkit-tools/      # Built-in tools (session, lead, event, messaging, crm, etc.)
    openai-runtime/     # OpenAI Agents SDK/Responses runtime wrapper
    openai-doc-sync/    # OpenAI docs fetcher + parser + indexer
    workflow-kit/       # Reusable workflow templates
    adapters/           # Adapters: email, crm, calendar, storage
  infra/
    docker-compose.yml
    prisma/
      schema.prisma
```

## Quick Start

### 1. Instalace závislostí

```bash
pnpm install
```

### 2. Spuštění databáze

```bash
cd infra
docker-compose up -d
```

### 3. Nastavení databáze

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Konfigurace prostředí

Vytvořte `.env` soubory v `apps/api` a dalších balíčcích podle potřeby:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_toolkit"
OPENAI_API_KEY="sk-..."
```

### 5. Spuštění vývoje

```bash
pnpm dev
```

## Přidání nového toolu

1. Vytvořte tool definici v `packages/toolkit-tools/src/tools/`
2. Implementujte handler s Zod schemas
3. Zaregistrujte tool v registry
4. Přidejte testy

Viz `packages/toolkit-tools/README.md` pro detaily.

## Vytvoření workflow

1. Definujte workflow template v `packages/workflow-kit/src/workflows/`
2. Použijte tools z registry
3. Implementujte runner v `packages/workflow-kit/src/runners/`
4. Zaregistrujte workflow v `apps/api`

Viz `packages/workflow-kit/README.md` pro detaily.

## Synchronizace OpenAI dokumentace

```bash
pnpm docs:sync
pnpm docs:search "query"
```

## Testování

```bash
pnpm test
```

## Build

```bash
pnpm build
```

## 🚀 Rychlý start

### Pro vývojáře, kteří chtějí použít toolkit:

**Z npm (po publikaci):**
```bash
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime @ai-toolkit/workflow-kit
```

**Z GitHub (před publikací):**
```bash
pnpm add @ai-toolkit/core@github:YOUR_USERNAME/ai-toolkit-openai-platform#main:packages/toolkit-core
```

Viz [USAGE.md](USAGE.md) pro kompletní příklady použití.

### Pro vývojáře, kteří chtějí přispět:

1. **Nastavení GitHub repozitáře:**
   ```bash
   pnpm setup:github YOUR_USERNAME
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/ai-toolkit-openai-platform.git
   git push -u origin main
   ```

2. **Publikace na npm:**
   - Vytvořte npm token a přidejte do GitHub Secrets jako `NPM_TOKEN`
   - Vytvořte release na GitHubu → automatická publikace

Viz [SETUP_GITHUB.md](SETUP_GITHUB.md) a [DEPLOYMENT.md](DEPLOYMENT.md) pro detaily.

## Dokumentace

- [Quick Start Guide](QUICKSTART.md)
- [Architecture](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Tool Registry Guide](packages/toolkit-core/README.md)
- [Workflow Templates](packages/workflow-kit/README.md)
- [OpenAI Runtime](packages/openai-runtime/README.md)
- [API Reference](apps/api/README.md)
