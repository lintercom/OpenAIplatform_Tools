#!/usr/bin/env node

/**
 * Tool Registry CLI
 * 
 * Příkazy:
 * - pnpm tools:list - Seznam všech tools
 * - pnpm tools:validate - Validace všech tools
 * - pnpm tools:docs - Generování dokumentace
 */

import { PrismaClient } from '@prisma/client';
import { ToolRegistryV2 } from '../packages/toolkit-core/src/registry-v2';
import { registerAllTools } from '../packages/toolkit-tools/src/index';

const command = process.argv[2];

async function main() {
  const prisma = new PrismaClient();
  const registry = new ToolRegistryV2(prisma);

  // Registrace všech tools (zatím placeholder - bude potřeba upravit registerAllTools)
  try {
    // Pro teď použijeme starý registry pro načtení tools
    // V produkci by se tools načítaly automaticky
    console.log('📦 Loading tools...');
  } catch (error) {
    console.error('Failed to load tools:', error);
    process.exit(1);
  }

  if (command === 'list') {
    const tools = registry.listTools();
    console.log(`\n📋 Found ${tools.length} tools:\n`);
    tools.forEach((tool) => {
      console.log(`  ${tool.id} (v${tool.version})`);
      console.log(`    Category: ${tool.category}`);
      console.log(`    Risk: ${tool.riskLevel} | PII: ${tool.piiLevel} | Idempotency: ${tool.idempotency}`);
      if (tool.tags.length > 0) {
        console.log(`    Tags: ${tool.tags.join(', ')}`);
      }
      if (tool.deprecated) {
        console.log(`    ⚠️  DEPRECATED: ${tool.deprecationMessage || 'No message'}`);
      }
      console.log('');
    });
  } else if (command === 'validate') {
    console.log('🔍 Validating all tools...\n');
    const validation = registry.validateAll();
    
    if (validation.valid) {
      console.log('✅ All tools are valid!\n');
      process.exit(0);
    } else {
      console.error('❌ Validation failed:\n');
      validation.errors.forEach(({ toolId, errors }) => {
        console.error(`  ${toolId}:`);
        errors.forEach((error) => {
          console.error(`    - ${error}`);
        });
        console.error('');
      });
      process.exit(1);
    }
  } else if (command === 'docs') {
    const tools = registry.listTools();
    const outputPath = process.argv[3] || './tools-docs.json';
    
    const docs = {
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      tools: tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        version: tool.version,
        description: tool.description,
        category: tool.category,
        tags: tool.tags,
        riskLevel: tool.riskLevel,
        piiLevel: tool.piiLevel,
        idempotency: tool.idempotency,
        requiredRoles: tool.requiredRoles,
        rateLimits: tool.rateLimits,
        costProfile: tool.costProfile,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        examples: tool.examples,
        errorModel: tool.errorModel,
        documentationUrl: tool.documentationUrl,
        deprecated: tool.deprecated,
      })),
    };

    require('fs').writeFileSync(outputPath, JSON.stringify(docs, null, 2));
    console.log(`✅ Documentation generated: ${outputPath}`);
    console.log(`   Total tools: ${tools.length}`);
  } else {
    console.log('Usage:');
    console.log('  pnpm tools:list       - List all registered tools');
    console.log('  pnpm tools:validate   - Validate all tool contracts');
    console.log('  pnpm tools:docs [path] - Generate tool documentation (default: ./tools-docs.json)');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
