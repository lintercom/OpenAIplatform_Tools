# Nastavení GitHub repozitáře

Krok za krokem průvodce pro nastavení projektu na GitHub.

## Krok 1: Vytvoření repozitáře na GitHub

1. Jděte na https://github.com/new
2. Zadejte název: `ai-toolkit-openai-platform`
3. Vyberte **Public** (pro open source) nebo **Private**
4. **NEVYTVÁŘEJTE** README, .gitignore nebo LICENSE (už máme)
5. Klikněte "Create repository"

## Krok 2: Aktualizace repository URLs

### Automaticky (doporučeno)

```bash
pnpm setup:github lintercom
```

Nahradí `lintercom` ve všech package.json souborech.

### Manuálně

Otevřete a nahraďte `lintercom` vaším GitHub username v těchto souborech:

- `package.json` (root)
- `packages/toolkit-core/package.json`
- `packages/toolkit-tools/package.json`
- `packages/openai-runtime/package.json`
- `packages/openai-doc-sync/package.json`
- `packages/workflow-kit/package.json`
- `packages/adapters/package.json`

**Rychlá náhrada (PowerShell):**
```powershell
# V root adresáři projektu
$username = "lintercom"
Get-ChildItem -Recurse -Filter "package.json" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "lintercom", $username
    Set-Content $_.FullName -Value $content -NoNewline
}
```

## Krok 3: Git inicializace a první commit

```bash
# Inicializace git
git init

# Přidání všech souborů
git add .

# První commit
git commit -m "Initial commit: AI Toolkit for OpenAI Platform"

# Přidání remote 
git remote add origin https://github.com/lintercom/ai-toolkit-openai-platform.git

# Push na GitHub
git branch -M main
git push -u origin main
```

## Krok 4: Nastavení GitHub Secrets (pro npm publikaci)

1. Jděte do Settings → Secrets and variables → Actions
2. Klikněte "New repository secret"
3. Přidejte:
   - **Name**: `NPM_TOKEN`
   - **Value**: Váš npm automation token (z https://www.npmjs.com/settings/lintercom/tokens)

## Krok 5: Ověření

1. Zkontrolujte, že všechny soubory jsou na GitHubu
2. Zkontrolujte, že GitHub Actions workflow je aktivní
3. Vytvořte test release pro ověření publikace

## Krok 6: Použití v jiných projektech

### Po publikaci na npm:

```bash
pnpm add @ai-toolkit/core @ai-toolkit/tools @ai-toolkit/openai-runtime
```

### Přímo z GitHubu (před publikací):

V `package.json` vašeho projektu:

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/ai-toolkit-openai-platform#main:packages/toolkit-core",
    "@ai-toolkit/tools": "github:lintercom/ai-toolkit-openai-platform#main:packages/toolkit-tools",
    "@ai-toolkit/openai-runtime": "github:lintercom/ai-toolkit-openai-platform#main:packages/openai-runtime"
  }
}
```

Nebo pomocí pnpm workspace:

```json
{
  "pnpm": {
    "overrides": {
      "@ai-toolkit/core": "github:lintercom/ai-toolkit-openai-platform#main:packages/toolkit-core"
    }
  }
}
```

## Další kroky

- Přečtěte si [DEPLOYMENT.md](DEPLOYMENT.md) pro publikaci na npm
- Přečtěte si [CONTRIBUTING.md](CONTRIBUTING.md) pro přispívání
