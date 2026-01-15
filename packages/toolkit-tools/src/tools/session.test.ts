import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from '@ai-toolkit/core';
import { createSessionTools } from './session';

describe('Session Tools', () => {
  let registry: ToolRegistry;
  let prisma: PrismaClient;

  beforeEach(async () => {
    prisma = new PrismaClient();
    registry = new ToolRegistry(prisma);
    createSessionTools(prisma).forEach((tool) => registry.register(tool));
  });

  it('should create session', async () => {
    const result = await registry.invokeTool('session.start', {}, {});
    expect(result.success).toBe(true);
    expect(result.output).toHaveProperty('sessionId');
  });

  it('should get session', async () => {
    const createResult = await registry.invokeTool('session.start', {}, {});
    expect(createResult.success).toBe(true);
    const sessionId = (createResult.output as any).sessionId;

    const getResult = await registry.invokeTool('session.get', {}, { sessionId });
    expect(getResult.success).toBe(true);
    expect((getResult.output as any).sessionId).toBe(sessionId);
  });

  it('should set consent', async () => {
    const createResult = await registry.invokeTool('session.start', {}, {});
    const sessionId = (createResult.output as any).sessionId;

    const result = await registry.invokeTool('session.set_consent', {}, {
      sessionId,
      consent: { marketing: true, analytics: false },
    });
    expect(result.success).toBe(true);
    expect((result.output as any).consent).toEqual({ marketing: true, analytics: false });
  });
});
