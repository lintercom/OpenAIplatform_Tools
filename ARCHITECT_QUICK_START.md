# Architect - Quick Start

## 🚀 Rychlý start

### 1. Instalace závislostí

```bash
pnpm install
```

### 2. Spuštění

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

### 3. Otevření v prohlížeči

- UI: http://localhost:5174
- API: http://localhost:3001

## 📝 Použití

1. **Začni chatovat** - Architect se tě zeptá na informace o projektu
2. **Odpovídej na otázky** - Architect postupně shromažďuje informace
3. **Po dokončení questionnaire** - Architect vygeneruje plán
4. **Zobraz artifacts** - Podívej se na Blueprint, Topology, Workflows, Plan, ADRs
5. **Export** - Stáhni JSON nebo Markdown

## 🎯 Co Architect umí

- ✅ **Questionnaire** - Shromažďuje informace o projektu
- ✅ **Decision Engine** - Rozhoduje AI vs Deterministic
- ✅ **Planning Pipeline** - Generuje 3-fázový plán
- ✅ **Validation** - Validuje všechny artefakty
- ✅ **Export** - JSON a Markdown

## 📚 Dokumentace

- [OVERVIEW.md](./docs/architect/OVERVIEW.md) - Architektura
- [ARCHITECT_IMPLEMENTATION_SUMMARY.md](./ARCHITECT_IMPLEMENTATION_SUMMARY.md) - Souhrn implementace

## 🔧 Next Steps

1. Připojit LLM pro lepší generování plánů
2. Implementovat Blueprint generování
3. Přesunout session storage do DB
4. Přidat vzorový demo scénář
5. Propojit Cost Control
6. Export do Jira/Linear

---

**Status:** ✅ MVP hotové, připraveno k použití
