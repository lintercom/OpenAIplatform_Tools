# AI Toolkit for OpenAI Platform

Produkční monorepo pro vytváření opakovatelné "AI Tools Library" na OpenAI Agent Platform. 

**AI Toolkit je meta-framework a platforma** pro správu, governance a znovupoužití AI tools napříč projekty. Poskytuje Tool Registry, Policy Engine, Audit Logging, Workflow Templates a integraci s [OpenAI Agents SDK](https://github.com/openai/openai-agents-js).

> **Rozdíl od OpenAI Agents SDK:** OpenAI Agents SDK je framework pro vytváření agentů (execution layer). AI Toolkit je platforma pro správu tools a workflows (governance & management layer). Oba se doplňují - viz [COMPARISON.md](COMPARISON.md).

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

## Instalace jako závislost

Pro použití v jiných projektech:

```bash
# Z GitHub (doporučeno)
pnpm add @ai-toolkit/core@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/tools@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/openai-runtime@github:lintercom/OpenAIplatform_Tools

# Nebo z npm (po publikování)
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime
```

Viz [INSTALLATION.md](INSTALLATION.md) pro kompletní instrukce a příklady použití.

## Quick Start (Development)

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

Toolkit má přístup k kompletní OpenAI dokumentaci včetně OpenAI Agents SDK:

```bash
# Synchronizace všech docs (včetně OpenAI Agents SDK)
pnpm docs:sync

# Vyhledání v dokumentaci
pnpm docs:search "agents"
pnpm docs:search "handoffs"
pnpm docs:search "guardrails"

# Generování prompt packu pro konkrétní task
pnpm docs:prompt-pack "build new tool with handoffs"
```

Synchronizované dokumentace:
- OpenAI Platform overview a guides (Overview, Agents, Tools, Function Calling, etc.)
- OpenAI Platform API Reference (Chat, Completions, Embeddings, Images, Audio, Assistants, etc.)
- OpenAI Agents SDK (https://openai.github.io/openai-agents-js/)
  - Agents, Handoffs, Guardrails, Multi-agent orchestration
  - Sessions, Context management, Tracing
  - Tools, Streaming, Human-in-the-loop

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

### Pro uživatele
- [Quick Start Guide](QUICKSTART.md) - Rychlý start pro lokální vývoj
- [Installation Guide](INSTALLATION.md) - Instalace jako závislost + použití
- [AI Tools Reference](AI_TOOLS_REFERENCE.md) - Kompletní seznam všech tools
- [API Key Management](docs/API_KEY_MANAGEMENT.md) - Per-tenant API keys

### Pro vývojáře
- [Architecture](ARCHITECTURE.md) - Architektura platformy
- [Contributing Guide](CONTRIBUTING.md) - Jak přispět
- [Deployment Guide](DEPLOYMENT.md) - Deployment instrukce
- [Publishing Guide](docs/PUBLISHING.md) - Publikování na GitHub/npm

### Reference
- [AI Toolkit vs OpenAI Agents SDK](COMPARISON.md) - **Přečtěte si, jak se lišíme!**
- [Tool Registry Guide](packages/toolkit-core/README.md)
- [Workflow Templates](packages/workflow-kit/README.md)
- [OpenAI Runtime](packages/openai-runtime/README.md)
- [API Reference](apps/api/README.md)
- [Architecture Decision Records](ADR/) - ADR dokumenty

## Vztah k OpenAI Agents SDK

AI Toolkit **používá a rozšiřuje** [OpenAI Agents SDK](https://github.com/openai/openai-agents-js):
- OpenAI Agents SDK = execution framework (jak spustit agenty)
- AI Toolkit = management platform (jak spravovat tools, policies, audit)

Viz [COMPARISON.md](COMPARISON.md) pro detailní srovnání.
