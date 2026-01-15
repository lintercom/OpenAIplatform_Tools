import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from './registry';
import { z } from 'zod';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    registry = new ToolRegistry(prisma);

    // Registrace testovacího toolu
    registry.register({
      id: 'test.add',
      category: 'test',
      description: 'Přidá dvě čísla',
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
      outputSchema: z.object({
        result: z.number(),
      }),
      handler: async (ctx, input) => {
        return { result: input.a + input.b };
      },
    });
  });

  it('should register and list tools', () => {
    const tools = registry.listTools();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.find((t) => t.id === 'test.add')).toBeDefined();
  });

  it('should invoke tool successfully', async () => {
    const result = await registry.invokeTool('test.add', {}, { a: 5, b: 3 });
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ result: 8 });
  });

  it('should validate input', async () => {
    const result = await registry.invokeTool('test.add', {}, { a: 'invalid', b: 3 });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid input');
  });

  it('should return OpenAI tools format', () => {
    const openAITools = registry.getOpenAITools();
    expect(openAITools.length).toBeGreaterThan(0);
    expect(openAITools[0]).toHaveProperty('type', 'function');
    expect(openAITools[0]).toHaveProperty('function');
  });
});
