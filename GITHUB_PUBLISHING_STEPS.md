# 🚀 Kroky pro publikování na GitHub a použití jako závislost

## ✅ Co je připraveno

Všechny potřebné soubory a konfigurace jsou připravené:
- ✅ Package.json soubory s publishConfig
- ✅ .gitignore správně nakonfigurován
- ✅ .npmignore pro npm publikování
- ✅ GitHub Actions workflows (CI + Publish)
- ✅ Dokumentace (INSTALLATION.md, PUBLISHING_GUIDE.md)
- ✅ Pre-publish check script

## 📋 Postup krok za krokem

### Krok 1: Pre-publish kontrola

```bash
# Spusť kontrolu před publikováním
pnpm pre-publish
```

Tento script zkontroluje:
- Build projde
- Testy projdou
- TypeScript check projde
- Lint projde
- Package.json soubory jsou správně

### Krok 2: Commit všech změn

```bash
# Přidej všechny změny
git add .

# Commit
git commit -m "chore: prepare project for publishing"

# Zkontroluj status
git status
```

### Krok 3: Vytvoření GitHub Repository (pokud ještě neexistuje)

1. Jdi na https://github.com/new
2. Repository name: `OpenAIplatform_Tools` (nebo jiný název)
3. Vyber Public nebo Private
4. **Nevytvářej** README, .gitignore, nebo license (už je máme)
5. Klikni "Create repository"

### Krok 4: Nastavení Git Remote

```bash
# Zkontroluj aktuální remote
git remote -v

# Pokud není nastavený, přidej ho
git remote add origin https://github.com/lintercom/OpenAIplatform_Tools.git

# Nebo změň existující
git remote set-url origin https://github.com/lintercom/OpenAIplatform_Tools.git

# Ověř
git remote -v
```

### Krok 5: Push na GitHub

```bash
# Push main branch
git push -u origin main

# Pokud máš jiné branches, pushni je také
git push --all origin
```

### Krok 6: Ověření na GitHub

1. Otevři https://github.com/lintercom/OpenAIplatform_Tools
2. Zkontroluj, že:
   - ✅ README.md se zobrazuje
   - ✅ Všechny soubory jsou přítomné
   - ✅ Struktura projektu je správná

## 📦 Použití jako závislost v jiném projektu

### Metoda 1: Z GitHub (doporučeno pro development)

V tvém projektu vytvoř/uprav `package.json`:

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/tools": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/openai-runtime": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/workflow-kit": "github:lintercom/OpenAIplatform_Tools"
  }
}
```

**Nebo pomocí pnpm:**

```bash
pnpm add @ai-toolkit/core@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/tools@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/openai-runtime@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/workflow-kit@github:lintercom/OpenAIplatform_Tools
```

**Pro konkrétní branch:**

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools#main"
  }
}
```

### Metoda 2: Z npm (po publikování)

```bash
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime @ai-toolkit/workflow-kit
```

## 🔧 Setup v tvém projektu

Po instalaci závislostí:

### 1. Instalace

```bash
pnpm install
```

### 2. Databáze Setup

```bash
# Zkopíruj Prisma schema
cp node_modules/@ai-toolkit/core/prisma/schema.prisma prisma/schema.prisma

# Nebo použij vlastní schema a extenduj ho
```

### 3. Environment Variables

Vytvoř `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/your_db"
OPENAI_API_KEY="sk-..."  # Volitelné - můžeš použít per-tenant keys
API_KEY_ENCRYPTION_KEY="your-encryption-key"  # Pro per-tenant keys
```

### 4. Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Použití v kódu

```typescript
import { PrismaClient } from '@prisma/client';
import { ToolRegistry, APIKeyManager } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);
registerAllTools(registry, prisma);

const apiKeyManager = new APIKeyManager(prisma);
const workflowRunner = new WorkflowRunner(
  { apiKeyManager },
  registry,
  prisma
);

// Použití...
```

Viz [INSTALLATION.md](INSTALLATION.md) pro kompletní příklady.

## 📚 Dokumentace

- **INSTALLATION.md** - Kompletní instrukce pro instalaci a použití
- **PUBLISHING_GUIDE.md** - Detailní guide pro publikování
- **PUBLISHING_CHECKLIST.md** - Checklist před publikováním
- **docs/API_KEY_MANAGEMENT.md** - Per-tenant API key management

## ⚠️ Důležité poznámky

### Workspace Dependencies

Při instalaci z GitHub musí pnpm správně vyřešit workspace dependencies. Pokud máš problémy:

1. Ujisti se, že používáš pnpm 8+
2. Zkontroluj `.npmrc` v root projektu
3. Pokud to nefunguje, použij lokální instalaci:

```bash
# Clone repository
git clone https://github.com/lintercom/OpenAIplatform_Tools.git

# V tvém projektu
pnpm add @ai-toolkit/core@file:../OpenAIplatform_Tools/packages/toolkit-core
```

### Prisma Schema

Prisma nepodporuje import z node_modules, takže musíš:
- Zkopírovat schema z `@ai-toolkit/core/prisma/schema.prisma`
- Nebo použít vlastní schema a extendovat ho

### Environment Variables

- `API_KEY_ENCRYPTION_KEY` - Vygeneruj: `openssl rand -base64 32`
- `OPENAI_API_KEY` - Volitelné, pokud používáš per-tenant keys

## 🎯 Rychlý start

```bash
# 1. V tvém projektu
pnpm add @ai-toolkit/core@github:lintercom/OpenAIplatform_Tools

# 2. Setup
cp node_modules/@ai-toolkit/core/prisma/schema.prisma prisma/
npx prisma generate
npx prisma migrate dev

# 3. Použij v kódu
# (viz INSTALLATION.md)
```

## ✅ Hotovo!

Po dokončení těchto kroků můžeš:
- ✅ Používat AI Toolkit jako závislost v jiných projektech
- ✅ Každý projekt může mít svůj vlastní API klíč (per-tenant)
- ✅ Vytvářet vlastní tools a workflows
- ✅ Rozšiřovat platformu podle potřeb

---

**Potřebuješ pomoc?** Viz dokumentaci nebo otevři issue na GitHub.
