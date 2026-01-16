# Dokumentační struktura - Plán reorganizace

## Analýza současného stavu

### Duplicity a překrývající se obsah:
1. **Implementation dokumenty** (4 soubory):
   - `REFACTORING_COMPLETE.md` - Shrnutí refactoringu
   - `IMPLEMENTATION_COMPLETE.md` - Shrnutí implementace
   - `IMPLEMENTATION_SUMMARY.md` - Shrnutí změn
   - `IMPLEMENTATION_PLAN.md` - Plán implementace (zastaralý)
   → **Sloučit do:** `docs/HISTORY.md` (historický přehled změn)

2. **Publishing dokumenty** (4 soubory):
   - `PUBLISHING_COMPLETE.md` - Status publikování
   - `PUBLISHING_GUIDE.md` - Detailní guide
   - `PUBLISHING_CHECKLIST.md` - Checklist
   - `GITHUB_PUBLISHING_STEPS.md` - Krok za krokem
   → **Sloučit do:** `docs/PUBLISHING.md` (jeden kompletní guide)

3. **Quick Start / Usage** (3 soubory):
   - `QUICKSTART.md` - Rychlý start
   - `USAGE.md` - Použití v projektech
   - `INSTALLATION.md` - Instalace
   → **Sloučit do:** `QUICKSTART.md` (rychlý start) + `INSTALLATION.md` (detailní instalace)

4. **Status dokumenty**:
   - `PROJECT_STATUS.md` - Zastaralý status
   → **Smazat** (informace jsou v README)

## Navržená struktura

```
/
  README.md                    # Hlavní dokumentace (přehled, quick links)
  QUICKSTART.md               # Rychlý start pro development
  INSTALLATION.md             # Instalace jako závislost + setup
  ARCHITECTURE.md             # Architektura platformy
  CONTRIBUTING.md             # Contributing guide
  DEPLOYMENT.md               # Deployment guide
  CHANGELOG.md                # Changelog
  COMPARISON.md               # AI Toolkit vs OpenAI Agents SDK
  AI_TOOLS_REFERENCE.md       # Reference všech tools
  
  docs/
    PUBLISHING.md             # Publishing guide (sloučený)
    API_KEY_MANAGEMENT.md     # Per-tenant API keys
    HISTORY.md                # Historický přehled změn (sloučený)
    
  ADR/
    0001-tool-contract-standard.md
    0002-observability-first.md
    
  packages/*/README.md        # Package-specific dokumentace
```

## Akce

### Smazat:
- `REFACTORING_COMPLETE.md`
- `IMPLEMENTATION_COMPLETE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_PLAN.md`
- `PUBLISHING_COMPLETE.md`
- `PUBLISHING_CHECKLIST.md`
- `GITHUB_PUBLISHING_STEPS.md`
- `PROJECT_STATUS.md`

### Sloučit:
- `PUBLISHING_GUIDE.md` → `docs/PUBLISHING.md`
- `USAGE.md` → `INSTALLATION.md` (přidat sekci "Usage")
- `QUICKSTART.md` → aktualizovat, zachovat jako samostatný

### Aktualizovat:
- `README.md` - aktualizovat odkazy
- `INSTALLATION.md` - sloučit s USAGE.md
- `QUICKSTART.md` - aktualizovat odkazy
