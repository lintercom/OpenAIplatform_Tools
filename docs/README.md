# Dokumentace

Tento adresář obsahuje rozšířenou dokumentaci pro AI Toolkit platformu.

## Dostupné dokumenty

- [Publishing Guide](PUBLISHING.md) - Kompletní průvodce pro publikování na GitHub a npm
- [API Key Management](API_KEY_MANAGEMENT.md) - Per-tenant API key management
- [History](HISTORY.md) - Historie vývoje a refactoringu

## Struktura dokumentace

### Root dokumenty
- `README.md` - Hlavní dokumentace projektu
- `QUICKSTART.md` - Rychlý start pro lokální vývoj
- `INSTALLATION.md` - Instalace jako závislost + použití
- `ARCHITECTURE.md` - Architektura platformy
- `CONTRIBUTING.md` - Contributing guide
- `DEPLOYMENT.md` - Deployment guide
- `COMPARISON.md` - AI Toolkit vs OpenAI Agents SDK
- `AI_TOOLS_REFERENCE.md` - Reference všech tools
- `CHANGELOG.md` - Changelog

### Package dokumentace
Každý package má svůj vlastní `README.md`:
- `packages/toolkit-core/README.md`
- `packages/toolkit-tools/README.md`
- `packages/openai-runtime/README.md`
- atd.

### Architecture Decision Records
- `ADR/0001-tool-contract-standard.md`
- `ADR/0002-observability-first.md`
