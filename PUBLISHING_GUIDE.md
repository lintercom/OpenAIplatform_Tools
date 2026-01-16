# Publishing Guide - GitHub & npm

## Přehled

Tento guide popisuje, jak publikovat AI Toolkit na GitHub a npm pro použití v jiných projektech.

## Před publikováním

### 1. Spusť pre-publish check

```bash
pnpm pre-publish
```

Tento script zkontroluje:
- ✅ Build projde
- ✅ Testy projdou
- ✅ TypeScript check projde
- ✅ Lint projde
- ✅ Package.json soubory jsou správně nakonfigurované
- ✅ README soubory existují

### 2. Aktualizuj verze

```bash
# V root package.json
{
  "version": "1.0.0"
}

# V každém package/package.json
{
  "version": "1.0.0"
}
```

### 3. Commit a push

```bash
git add .
git commit -m "chore: prepare for v1.0.0 release"
git push origin main
```

## Publikování na GitHub

### Krok 1: Vytvoř GitHub Repository

1. Jdi na https://github.com/new
2. Vytvoř nový repository: `OpenAIplatform_Tools`
3. Zkopíruj URL (např. `https://github.com/lintercom/OpenAIplatform_Tools.git`)

### Krok 2: Nastav Git Remote

```bash
# Zkontroluj aktuální remote
git remote -v

# Pokud není nastavený, přidej ho
git remote add origin https://github.com/lintercom/OpenAIplatform_Tools.git

# Nebo změň existující
git remote set-url origin https://github.com/lintercom/OpenAIplatform_Tools.git
```

### Krok 3: Push na GitHub

```bash
# Push main branch
git push -u origin main

# Push všechny branches
git push --all origin

# Push tags (pokud máš)
git push --tags origin
```

### Krok 4: Ověření

1. Otevři https://github.com/lintercom/OpenAIplatform_Tools
2. Zkontroluj, že všechny soubory jsou přítomné
3. Zkontroluj, že README.md se zobrazuje správně

## Použití jako závislost z GitHub

### V jiném projektu

```bash
# Instalace z GitHub
pnpm add @ai-toolkit/core@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/tools@github:lintercom/OpenAIplatform_Tools
pnpm add @ai-toolkit/openai-runtime@github:lintercom/OpenAIplatform_Tools
```

**Nebo v package.json:**

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/tools": "github:lintercom/OpenAIplatform_Tools",
    "@ai-toolkit/openai-runtime": "github:lintercom/OpenAIplatform_Tools"
  }
}
```

**Pro konkrétní branch/tag:**

```json
{
  "dependencies": {
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools#main",
    "@ai-toolkit/core": "github:lintercom/OpenAIplatform_Tools#v1.0.0"
  }
}
```

## Publikování na npm (volitelné)

### Krok 1: Vytvoř npm Account

1. Jdi na https://www.npmjs.com/signup
2. Vytvoř účet
3. Ověř email

### Krok 2: Login

```bash
npm login
```

### Krok 3: Nastav NPM_TOKEN v GitHub

1. Jdi na https://github.com/lintercom/OpenAIplatform_Tools/settings/secrets/actions
2. Přidej nový secret: `NPM_TOKEN`
3. Získej token z https://www.npmjs.com/settings/YOUR_USERNAME/tokens
4. Vlož token do GitHub secret

### Krok 4: Publikuj packages

**Manuálně:**

```bash
# Build
pnpm build

# Publish každý package
cd packages/toolkit-core && pnpm publish --access public
cd ../toolkit-tools && pnpm publish --access public
cd ../openai-runtime && pnpm publish --access public
# ... atd.
```

**Pomocí GitHub Actions:**

1. Vytvoř Release na GitHub
2. GitHub Actions automaticky publikuje packages na npm

### Krok 5: Ověření

```bash
# Zkontroluj, zda jsou packages publikované
npm view @ai-toolkit/core
npm view @ai-toolkit/tools
```

## Verzování

### Semantic Versioning

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): Nové features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Aktualizace verzí

```bash
# V root package.json
{
  "version": "1.1.0"
}

# V každém package/package.json
{
  "version": "1.1.0"
}
```

### Git Tags

```bash
# Vytvoř tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0
```

## CI/CD

GitHub Actions automaticky:
- ✅ Spouští testy při push
- ✅ Publikuje na npm při vytvoření Release
- ✅ Validuje build a typecheck

## Troubleshooting

### "Permission denied" při push na GitHub
- Zkontroluj, zda máš přístup k repozitáři
- Použij SSH místo HTTPS: `git remote set-url origin git@github.com:lintercom/OpenAIplatform_Tools.git`

### "Package not found" při instalaci z GitHub
- Zkontroluj, zda je repository public
- Zkontroluj správný název repository
- Zkontroluj, zda máš přístup k repozitáři

### "npm publish failed"
- Zkontroluj, zda jsi přihlášen: `npm whoami`
- Zkontroluj, zda máš správná oprávnění
- Zkontroluj, zda verze není již publikovaná

## Next Steps

Po publikování:

1. ✅ Aktualizuj dokumentaci s instrukcemi pro instalaci
2. ✅ Vytvoř Release notes
3. ✅ Sdílej repository s týmem
4. ✅ Monitoruj issues a pull requests
