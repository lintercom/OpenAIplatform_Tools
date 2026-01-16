#!/usr/bin/env node

/**
 * Tool Authoring Kit CLI
 * 
 * Vytvoří nový tool balíček se vším potřebným:
 * - Struktura složek
 * - Template soubory
 * - Testy
 * - Registrace v indexu
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const toolName = process.argv[2];
const toolCategory = process.argv[3] || 'custom';

if (!toolName) {
  console.error('Usage: pnpm create-tool <tool-name> [category]');
  console.error('Example: pnpm create-tool my-tool custom');
  process.exit(1);
}

// Validace názvu
if (!/^[a-z0-9-]+$/.test(toolName)) {
  console.error('Tool name must contain only lowercase letters, numbers, and hyphens');
  process.exit(1);
}

const toolId = `tool.${toolName}`;
const toolPath = join(process.cwd(), 'packages', 'toolkit-tools', 'src', 'tools', `${toolName}.ts`);
const testPath = join(process.cwd(), 'packages', 'toolkit-tools', 'src', 'tools', `${toolName}.test.ts`);

if (existsSync(toolPath)) {
  console.error(`Tool "${toolName}" already exists at ${toolPath}`);
  process.exit(1);
}

// Vytvoření tool souboru
const toolTemplate = `import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  ToolContract,
  ToolRiskLevel,
  PIILevel,
  IdempotencyLevel,
  ToolExecutionContext,
} from '@ai-toolkit/tool-contract';

const inputSchema = z.object({
  // TODO: Define input schema
  example: z.string().optional(),
});

const outputSchema = z.object({
  // TODO: Define output schema
  success: z.boolean(),
  result: z.unknown().optional(),
});

export function create${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, '')}Tools(
  prisma: PrismaClient
): ToolContract[] {
  return [
    {
      id: '${toolId}',
      name: '${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, ' ')}',
      version: '1.0.0',
      description: 'TODO: Add description',
      category: '${toolCategory}',
      tags: ['${toolCategory}', '${toolName}'],
      riskLevel: ToolRiskLevel.LOW,
      piiLevel: PIILevel.NONE,
      idempotency: IdempotencyLevel.NONE,
      inputSchema,
      outputSchema,
      handler: async (ctx: ToolExecutionContext, input: z.infer<typeof inputSchema>) => {
        // TODO: Implement handler logic
        return {
          success: true,
          result: input,
        };
      },
      examples: [
        {
          name: 'Basic example',
          description: 'Basic usage example',
          input: {
            example: 'value',
          },
          expectedOutput: {
            success: true,
            result: { example: 'value' },
          },
        },
      ],
    },
  ];
}
`;

writeFileSync(toolPath, toolTemplate);

// Vytvoření test souboru
const testTemplate = `import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { create${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, '')}Tools } from './${toolName}';

describe('${toolName} tools', () => {
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
  });

  it('should create tool contract', () => {
    const tools = create${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, '')}Tools(prisma);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0].id).toBe('${toolId}');
  });

  it('should have valid schema', () => {
    const tools = create${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, '')}Tools(prisma);
    const tool = tools[0];
    
    // Test input validation
    const validInput = { example: 'test' };
    const result = tool.inputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});
`;

writeFileSync(testPath, testTemplate);

// Aktualizace index.ts
const indexPath = join(process.cwd(), 'packages', 'toolkit-tools', 'src', 'index.ts');
const indexContent = existsSync(indexPath)
  ? require('fs').readFileSync(indexPath, 'utf-8')
  : '';

if (!indexContent.includes(`from './tools/${toolName}'`)) {
  const newImport = `import { create${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, '')}Tools } from './tools/${toolName}';\n`;
  const exportSection = indexContent.includes('export function registerAllTools')
    ? indexContent
    : `import { ToolRegistry } from '@ai-toolkit/core';\nimport { PrismaClient } from '@prisma/client';\n\n${newImport}\n\nexport function registerAllTools(registry: ToolRegistry, prisma: PrismaClient): void {\n  // Tools will be registered here\n}\n`;

  const updatedContent = exportSection.replace(
    /export function registerAllTools\([^)]+\): void \{/,
    (match) => {
      return `${match}\n  // Register ${toolName} tools\n  for (const tool of create${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, '')}Tools(prisma)) {\n    registry.register(tool);\n  }`
    }
  );

  if (!updatedContent.includes(newImport.trim())) {
    writeFileSync(indexPath, newImport + updatedContent);
  } else {
    writeFileSync(indexPath, updatedContent);
  }
}

console.log(`✅ Tool "${toolName}" created successfully!`);
console.log(`📁 Files created:`);
console.log(`   - ${toolPath}`);
console.log(`   - ${testPath}`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Edit ${toolPath} to implement your tool logic`);
console.log(`   2. Update input/output schemas`);
console.log(`   3. Add examples and documentation`);
console.log(`   4. Run tests: pnpm test ${toolName}`);
console.log(`   5. Validate: pnpm tools:validate`);
