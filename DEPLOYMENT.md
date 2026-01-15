# Deployment Guide

Průvodce pro publikaci AI Toolkit na GitHub a npm.

## Příprava repozitáře

### 1. Vytvoření GitHub repozitáře

1. Vytvořte nový repozitář na GitHub (např. `ai-toolkit-openai-platform`)
2. Aktualizujte URL v `package.json` souborech:
   - Nahraďte `YOUR_USERNAME` vaším GitHub username
   - Nahraďte název repozitáře pokud se liší

### 2. Aktualizace repository URLs

Všechny `package.json` soubory obsahují placeholder `YOUR_USERNAME`. Nahraďte:

```bash
# V root package.json
"repository": {
  "type": "git",
  "url": "https://github.com/VASE_USERNAME/ai-toolkit-openai-platform.git"
}

# V packages/*/package.json souborech
"repository": {
  "type": "git",
  "url": "https://github.com/VASE_USERNAME/ai-toolkit-openai-platform.git",
  "directory": "packages/toolkit-core"
}
```

### 3. První commit a push

```bash
git init
git add .
git commit -m "Initial commit: AI Toolkit for OpenAI Platform"
git branch -M main
git remote add origin https://github.com/VASE_USERNAME/ai-toolkit-openai-platform.git
git push -u origin main
```

## Publikace na npm

### Metoda 1: Automatická publikace přes GitHub Actions

1. Vytvořte npm token:
   - Jděte na https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Vytvořte "Automation" token
   - Zkopírujte token

2. Přidejte token do GitHub Secrets:
   - Jděte do Settings → Secrets and variables → Actions
   - Přidejte nový secret: `NPM_TOKEN` s hodnotou vašeho tokenu

3. Vytvořte release:
   - Jděte do Releases → Create a new release
   - Zadejte tag (např. `v1.0.0`)
   - GitHub Actions automaticky publikuje všechny packages

### Metoda 2: Manuální publikace

```bash
# Build všech packages
pnpm build

# Publikace jednotlivých packages
cd packages/toolkit-core
pnpm publish --access public

cd ../toolkit-tools
pnpm publish --access public

cd ../openai-runtime
pnpm publish --access public

cd ../openai-doc-sync
pnpm publish --access public

cd ../workflow-kit
pnpm publish --access public

cd ../adapters
pnpm publish --access public
```

## Instalace v jiných projektech

### Z npm (po publikaci)

```bash
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime @ai-toolkit/workflow-kit @ai-toolkit/adapters
```

### Z GitHub (před publikací nebo pro development)

V `package.json` vašeho projektu:

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools#main:packages/toolkit-core",
    "@ai-toolkit/tools": "github:VASE_USERNAME/ai-toolkit-openai-platform#main:packages/toolkit-tools",
    "@ai-toolkit/openai-runtime": "github:VASE_USERNAME/ai-toolkit-openai-platform#main:packages/openai-runtime",
    "@ai-toolkit/workflow-kit": "github:VASE_USERNAME/ai-toolkit-openai-platform#main:packages/workflow-kit",
    "@ai-toolkit/adapters": "github:VASE_USERNAME/ai-toolkit-openai-platform#main:packages/adapters"
  }
}
```

Nebo pomocí pnpm workspace:

```json
{
  "pnpm": {
    "overrides": {
      "@ai-toolkit/core": "github:VASE_USERNAME/ai-toolkit-openai-platform#main:packages/toolkit-core"
    }
  }
}
```

### Z lokálního monorepo (pro development)

V `package.json` vašeho projektu:

```json
{
  "dependencies": {
    "@ai-toolkit/core": "file:../ai-toolkit-openai-platform/packages/toolkit-core",
    "@ai-toolkit/tools": "file:../ai-toolkit-openai-platform/packages/toolkit-tools"
  }
}
```

## Verzování

Pro nové verze:

1. Aktualizujte `version` ve všech `package.json` souborech
2. Vytvořte git tag: `git tag v1.0.1`
3. Push tag: `git push origin v1.0.1`
4. GitHub Actions automaticky publikuje nové verze

Nebo použijte `npm version`:

```bash
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0
```

## CI/CD

GitHub Actions workflow automaticky:
- Spouští testy při push/PR
- Publikuje na npm při vytvoření release

## Kontrola publikovaných packages

```bash
npm view @ai-toolkit/core
npm view @ai-toolkit/tools versions
```
