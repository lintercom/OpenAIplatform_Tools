# Quick Start Guide

Rychlý průvodce pro spuštění AI Toolkit platformy.

## Požadavky

- Node.js 20+
- pnpm 8+
- Docker (pro PostgreSQL)

## 1. Instalace

```bash
# Instalace závislostí
pnpm install
```

## 2. Spuštění databáze

```bash
cd infra
docker-compose up -d
```

## 3. Nastavení databáze

```bash
# Generování Prisma clientu
pnpm prisma:generate

# Spuštění migrací
pnpm prisma:migrate

# Seed data
cd packages/toolkit-core
pnpm prisma:seed
```

## 4. Konfigurace

Vytvořte `.env` soubor v `apps/api/`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_toolkit"
OPENAI_API_KEY="sk-your-key-here"
OPENAI_MODEL="gpt-4-turbo-preview"
ADMIN_API_KEY="your-admin-key"
PORT=3000
```

## 5. Spuštění

### API Server

```bash
cd apps/api
pnpm dev
```

Server poběží na http://localhost:3000

### Web Demo (volitelné)

```bash
cd apps/web
pnpm dev
```

Web poběží na http://localhost:5173

## 6. Testování

```bash
# Testy
pnpm test

# Test API endpointu
curl http://localhost:3000/health
```

## 7. Synchronizace OpenAI dokumentace

```bash
pnpm docs:sync
pnpm docs:search "agents"
```

## Struktura projektu

- `packages/toolkit-core` - Tool Registry, Policy Engine, Audit
- `packages/toolkit-tools` - Built-in tools
- `packages/openai-runtime` - OpenAI workflow runner
- `packages/openai-doc-sync` - Dokumentační sync pipeline
- `packages/workflow-kit` - Workflow templates
- `packages/adapters` - Mock adapters
- `apps/api` - Fastify backend server
- `apps/web` - Demo UI

## Další kroky

- Přečtěte si README v jednotlivých packages
- Prozkoumejte workflow templates v `packages/workflow-kit`
- Přidejte vlastní tools do `packages/toolkit-tools`
