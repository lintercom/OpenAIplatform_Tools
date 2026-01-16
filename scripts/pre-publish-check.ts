#!/usr/bin/env tsx

/**
 * Pre-publish check script
 * 
 * Kontroluje, zda je projekt připraven k publikování
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const errors: string[] = [];
const warnings: string[] = [];

console.log('🔍 Running pre-publish checks...\n');

// 1. Check build
console.log('1. Checking build...');
try {
  execSync('pnpm build', { stdio: 'pipe' });
  console.log('   ✅ Build successful\n');
} catch (error) {
  errors.push('Build failed');
  console.log('   ❌ Build failed\n');
}

// 2. Check tests
console.log('2. Checking tests...');
try {
  execSync('pnpm test', { stdio: 'pipe' });
  console.log('   ✅ Tests passed\n');
} catch (error) {
  warnings.push('Some tests failed');
  console.log('   ⚠️  Some tests failed\n');
}

// 3. Check typecheck
console.log('3. Checking TypeScript...');
try {
  execSync('pnpm typecheck', { stdio: 'pipe' });
  console.log('   ✅ TypeScript check passed\n');
} catch (error) {
  errors.push('TypeScript check failed');
  console.log('   ❌ TypeScript check failed\n');
}

// 4. Check lint
console.log('4. Checking lint...');
try {
  execSync('pnpm lint', { stdio: 'pipe' });
  console.log('   ✅ Lint passed\n');
} catch (error) {
  warnings.push('Lint warnings');
  console.log('   ⚠️  Lint warnings\n');
}

// 5. Check package.json files
console.log('5. Checking package.json files...');
const packages = [
  'toolkit-core',
  'toolkit-tools',
  'openai-runtime',
  'openai-doc-sync',
  'workflow-kit',
  'adapters',
  'tool-contract',
  'observability',
];

for (const pkg of packages) {
  const pkgPath = join(process.cwd(), 'packages', pkg, 'package.json');
  if (!existsSync(pkgPath)) {
    warnings.push(`Package ${pkg} not found`);
    continue;
  }

  const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  
  if (!pkgJson.publishConfig) {
    warnings.push(`Package ${pkg} missing publishConfig`);
  }
  
  if (!pkgJson.main || !pkgJson.types) {
    warnings.push(`Package ${pkg} missing main or types`);
  }
}

console.log('   ✅ Package.json files checked\n');

// 6. Check README files
console.log('6. Checking README files...');
for (const pkg of packages) {
  const readmePath = join(process.cwd(), 'packages', pkg, 'README.md');
  if (!existsSync(readmePath)) {
    warnings.push(`Package ${pkg} missing README.md`);
  }
}
console.log('   ✅ README files checked\n');

// Summary
console.log('\n📊 Summary:\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Project is ready to publish.\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach((err) => console.log(`   - ${err}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach((warn) => console.log(`   - ${warn}`));
    console.log('');
  }
  
  if (errors.length > 0) {
    console.log('❌ Please fix errors before publishing.\n');
    process.exit(1);
  } else {
    console.log('⚠️  Please review warnings before publishing.\n');
    process.exit(0);
  }
}
