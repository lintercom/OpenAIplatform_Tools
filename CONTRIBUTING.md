# Contributing to AI Tool Platform

## Development Setup

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Start development
pnpm dev
```

## Code Standards

### TypeScript
- **Strict mode:** Vždy zapnutý
- **No `any`:** Používej explicitní typy
- **Explicit return types:** Pro všechny public funkce

### Linting & Formatting
```bash
pnpm lint
pnpm format
```

### Testing
```bash
pnpm test
```

## Adding a New Tool

### 1. Create Tool
```bash
pnpm create-tool my-tool custom
```

### 2. Implement Tool
Edit `packages/toolkit-tools/src/tools/my-tool.ts`:
- Definuj input/output schemas
- Implementuj handler
- Přidej examples
- Nastav risk level, PII level, idempotency

### 3. Write Tests
Edit `packages/toolkit-tools/src/tools/my-tool.test.ts`:
- Test validace schemas
- Test handler logic
- Test error cases

### 4. Validate
```bash
pnpm tools:validate
```

### 5. Documentation
- Přidej description do tool kontraktu
- Přidej examples
- Aktualizuj README pokud je potřeba

## Definition of Done

Pro každý tool:
- [ ] Tool má validní `ToolContract`
- [ ] Input/output schemas jsou definované a validované
- [ ] Handler je implementovaný
- [ ] Testy procházejí (`pnpm test`)
- [ ] Examples jsou přidané
- [ ] Risk level a PII level jsou správně nastavené
- [ ] Policy je konfigurovaná (pokud je potřeba)
- [ ] Tool projde `pnpm tools:validate`
- [ ] Dokumentace je aktualizovaná

## Commit Messages

Používej [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new tool for X
fix: fix validation error in Y
docs: update README
refactor: simplify Z
test: add tests for W
```

## Pull Request Process

1. Vytvoř branch z `main`
2. Implementuj změny
3. Ujisti se, že všechny testy procházejí
4. Aktualizuj dokumentaci
5. Vytvoř PR s popisem změn
6. Počkej na review

## Architecture Decisions

Všechny významné architektonické rozhodnutí dokumentujeme v `ADR/`:
- ADR-0001: Tool Contract Standard
- ADR-0002: Observability First
- ...

Při navrhování nového ADR:
1. Vytvoř soubor `ADR/XXXX-description.md`
2. Použij template z existujících ADR
3. Projednej s týmem
4. Commit do repa
