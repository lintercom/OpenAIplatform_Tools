# Publishing Checklist - GitHub & npm

## ✅ Checklist před publikováním

### 1. Git Repository Setup
- [x] Repository URL v package.json
- [ ] Všechny změny commitnuté
- [ ] .gitignore správně nakonfigurován
- [ ] README.md aktualizován

### 2. Package Configuration
- [x] Všechny packages mají publishConfig
- [x] Workspace dependencies správně nastavené
- [ ] Všechny packages mají správné version
- [ ] Main entry points správně nastavené

### 3. Build & Test
- [ ] `pnpm build` projde bez chyb
- [ ] `pnpm test` projde
- [ ] `pnpm typecheck` projde
- [ ] `pnpm lint` projde

### 4. Dokumentace
- [ ] README.md obsahuje instrukce pro instalaci
- [ ] Všechny packages mají README.md
- [ ] API dokumentace je aktuální

### 5. GitHub Setup
- [ ] Repository vytvořen na GitHub
- [ ] Remote URL správně nastaven
- [ ] GitHub Actions workflows fungují

### 6. npm Publishing (volitelné)
- [ ] npm account vytvořen
- [ ] NPM_TOKEN secret nastaven v GitHub
- [ ] Packages jsou připravené k publikování

---

## Postup publikování

### Krok 1: Lokální příprava

```bash
# 1. Build všech packages
pnpm build

# 2. Test
pnpm test
pnpm typecheck
pnpm lint

# 3. Commit všech změn
git add .
git commit -m "chore: prepare for publishing"
```

### Krok 2: GitHub Repository

```bash
# Pokud ještě není vytvořený remote
git remote add origin https://github.com/lintercom/OpenAIplatform_Tools.git

# Push na GitHub
git push -u origin main
```

### Krok 3: Použití jako závislost

**Option A: Z GitHub (doporučeno pro development)**

```bash
# V jiném projektu
pnpm add @ai-toolkit/core@github:lintercom/OpenAIplatform_Tools
```

**Option B: Z npm (po publikování)**

```bash
pnpm add @ai-toolkit/core
```

---

## Instalace pro vývoj konkrétních systémů

Viz `INSTALLATION.md` pro kompletní instrukce.
