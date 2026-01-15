# Contributing Guide

Děkujeme za zájem o přispění do AI Toolkit!

## Jak přispět

### 1. Fork a Clone

```bash
git clone https://github.com/YOUR_USERNAME/ai-toolkit-openai-platform.git
cd ai-toolkit-openai-platform
pnpm install
```

### 2. Vytvoření branch

```bash
git checkout -b feature/my-new-feature
# nebo
git checkout -b fix/bug-fix
```

### 3. Vývoj

- Vytvářejte změny v příslušných packages
- Přidávejte testy pro nové funkce
- Ujistěte se, že všechny testy procházejí: `pnpm test`
- Zkontrolujte linting: `pnpm lint`

### 4. Commit

```bash
git add .
git commit -m "feat: add new feature"
# nebo
git commit -m "fix: resolve bug"
```

Používejte konvenční commit messages:
- `feat:` - nová funkce
- `fix:` - oprava bugu
- `docs:` - dokumentace
- `test:` - testy
- `refactor:` - refaktoring
- `chore:` - údržba

### 5. Push a Pull Request

```bash
git push origin feature/my-new-feature
```

Vytvořte Pull Request na GitHubu s popisem změn.

## Struktura projektu

- `packages/toolkit-core` - Core funkcionalita
- `packages/toolkit-tools` - Built-in tools
- `packages/openai-runtime` - OpenAI runtime
- `packages/workflow-kit` - Workflow templates
- `packages/adapters` - Adapters
- `apps/api` - API server
- `apps/web` - Demo UI

## Přidání nového toolu

1. Vytvořte soubor v `packages/toolkit-tools/src/tools/`
2. Implementujte handler s Zod schemas
3. Zaregistrujte v `packages/toolkit-tools/src/index.ts`
4. Přidejte testy

## Přidání nového workflow

1. Vytvořte soubor v `packages/workflow-kit/src/workflows/`
2. Definujte input/output schemas
3. Zaregistrujte v `packages/workflow-kit/src/workflows/index.ts`

## Testování

```bash
# Všechny testy
pnpm test

# Konkrétní package
cd packages/toolkit-core
pnpm test
```

## Code Style

- Používejte TypeScript strict mode
- Dodržujte ESLint pravidla
- Formátujte kód pomocí Prettier: `pnpm format`

## Otázky?

Otevřete Issue nebo kontaktujte maintainery.
