import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from '@ai-toolkit/core';
import { createLeadTools } from './lead';

describe('Lead Tools', () => {
  let registry: ToolRegistry;
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    registry = new ToolRegistry(prisma);
    createLeadTools(prisma).forEach((tool) => registry.register(tool));
  });

  it('should create lead', async () => {
    const result = await registry.invokeTool('lead.get_or_create', {}, {
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(result.success).toBe(true);
    expect((result.output as any).email).toBe('test@example.com');
    expect((result.output as any).leadId).toBeDefined();
  });

  it('should update lead', async () => {
    const createResult = await registry.invokeTool('lead.get_or_create', {}, {
      email: 'update@example.com',
    });
    const leadId = (createResult.output as any).leadId;

    const updateResult = await registry.invokeTool('lead.update', {}, {
      leadId,
      name: 'Updated Name',
    });
    expect(updateResult.success).toBe(true);
    expect((updateResult.output as any).name).toBe('Updated Name');
  });

  it('should add tags', async () => {
    const createResult = await registry.invokeTool('lead.get_or_create', {}, {
      email: 'tags@example.com',
    });
    const leadId = (createResult.output as any).leadId;

    const result = await registry.invokeTool('lead.add_tags', {}, {
      leadId,
      tags: ['interested', 'qualified'],
    });
    expect(result.success).toBe(true);
    expect((result.output as any).tags).toContain('interested');
    expect((result.output as any).tags).toContain('qualified');
  });
});
