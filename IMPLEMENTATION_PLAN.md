# Implementation Plan - Vylepšení podle REPORT.md

## Přehled fází

### ✅ Fáze 1: Tool Contract - DOKONČENO
- Vytvořen `@ai-toolkit/tool-contract` package
- Definován `ToolContract` interface
- Standardizovány error typy (Problem Details)

### 🔄 Fáze 2: Policy Enhancement - V PROGRESU
- [ ] Rozšířit Policy Engine o ABAC
- [ ] Přidat tenant isolation
- [ ] Implementovat human review frontu
- [ ] Přidat policy recipes

### ✅ Fáze 3: Observability - DOKONČENO
- Vytvořen `@ai-toolkit/observability` package
- Tracing, logging, metrics implementovány

### 🔄 Fáze 4: Registry & Discovery - V PROGRESU
- [x] CLI příkazy (list, validate, docs)
- [ ] Automatické načítání tools z packages

### ✅ Fáze 5: Tool Authoring Kit - DOKONČENO
- CLI vytvořeno
- Templates připraveny

### 🔄 Fáze 6: Type Safety - V PROGRESU
- [ ] Odstranit `any` typy
- [ ] Přidat strict TypeScript flags
- [ ] Explicit return types

### 🔄 Fáze 7: CI/CD Enhancement - V PROGRESU
- [x] Type checking v CI
- [ ] Security scanning
- [ ] Changesets/semantic-release
- [ ] Coverage reporting

### ✅ Fáze 8: Architect Tool Skeleton - DOKONČENO
- Interface vytvořen
- Skeleton implementace připravena

---

## Postup implementace

### Krok 1: Policy Enhancement (Fáze 2)
**Priorita:** 🟡 STŘEDNÍ
**Odhad:** 2-3 hodiny

1. Rozšířit Policy Engine o ABAC
2. Přidat tenant isolation
3. Implementovat human review queue
4. Přidat policy recipes

### Krok 2: Automatické načítání tools (Fáze 4)
**Priorita:** 🟡 STŘEDNÍ
**Odhad:** 1-2 hodiny

1. Vytvořit tool discovery mechanismus
2. Automatické načítání z packages
3. Validace při načítání

### Krok 3: Type Safety (Fáze 6)
**Priorita:** 🟡 STŘEDNÍ
**Odhad:** 1-2 hodiny

1. Odstranit `any` typy z types.ts
2. Přidat strict TypeScript flags
3. Explicit return types

### Krok 4: CI/CD Enhancement (Fáze 7)
**Priorita:** 🟡 STŘEDNÍ
**Odhad:** 1 hodina

1. Security scanning (npm audit)
2. Coverage reporting
3. Changesets (volitelné)

---

**Začínám implementací...**
