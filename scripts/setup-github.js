#!/usr/bin/env node

/**
 * Script pro automatickou aktualizaci GitHub repository URLs
 * Použití: node scripts/setup-github.js YOUR_USERNAME
 */

const fs = require('fs');
const path = require('path');

const username = process.argv[2];

if (!username) {
  console.error('❌ Chybí GitHub username!');
  console.log('Použití: node scripts/setup-github.js YOUR_USERNAME');
  process.exit(1);
}

const repoName = 'ai-toolkit-openai-platform';
const repoUrl = `https://github.com/${username}/${repoName}.git`;

console.log(`🔄 Aktualizuji repository URLs na: ${repoUrl}\n`);

// Packages, které potřebují aktualizaci
const packages = [
  'toolkit-core',
  'toolkit-tools',
  'openai-runtime',
  'openai-doc-sync',
  'workflow-kit',
  'adapters',
];

// Root package.json
const rootPackagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(rootPackagePath)) {
  const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  rootPackage.repository = {
    type: 'git',
    url: repoUrl,
  };
  fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n');
  console.log('✓ Aktualizován root package.json');
}

// Packages package.json
packages.forEach((pkg) => {
  const packagePath = path.join(__dirname, '..', 'packages', pkg, 'package.json');
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.repository = {
      type: 'git',
      url: repoUrl,
      directory: `packages/${pkg}`,
    };
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✓ Aktualizován packages/${pkg}/package.json`);
  }
});

console.log('\n✅ Všechny repository URLs byly aktualizovány!');
console.log('\nDalší kroky:');
console.log('1. git init');
console.log('2. git add .');
console.log('3. git commit -m "Initial commit"');
console.log(`4. git remote add origin ${repoUrl}`);
console.log('5. git push -u origin main');
