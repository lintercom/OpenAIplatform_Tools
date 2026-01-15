import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition, ToolContext } from '@ai-toolkit/core';

const startSessionSchema = z.object({
  leadId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const getSessionSchema = z.object({
  sessionId: z.string(),
});

const setConsentSchema = z.object({
  sessionId: z.string(),
  consent: z.record(z.boolean()),
});

export function createSessionTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'session.start',
      category: 'session',
      description: 'Vytvoří novou session pro konverzaci',
      inputSchema: startSessionSchema,
      outputSchema: z.object({
        sessionId: z.string(),
        leadId: z.string().nullable(),
      }),
      handler: async (ctx, input) => {
        const session = await prisma.session.create({
          data: {
            leadId: input.leadId,
            metadata: input.metadata as any,
          },
        });
        return {
          sessionId: session.id,
          leadId: session.leadId,
        };
      },
    },
    {
      id: 'session.get',
      category: 'session',
      description: 'Získá informace o session',
      inputSchema: getSessionSchema,
      outputSchema: z.object({
        sessionId: z.string(),
        leadId: z.string().nullable(),
        consent: z.record(z.boolean()).nullable(),
        metadata: z.record(z.any()).nullable(),
      }),
      handler: async (ctx, input) => {
        const session = await prisma.session.findUnique({
          where: { id: input.sessionId },
        });
        if (!session) {
          throw new Error(`Session ${input.sessionId} not found`);
        }
        return {
          sessionId: session.id,
          leadId: session.leadId,
          consent: (session.consent as any) || null,
          metadata: (session.metadata as any) || null,
        };
      },
    },
    {
      id: 'session.set_consent',
      category: 'session',
      description: 'Nastaví consent flags pro session',
      inputSchema: setConsentSchema,
      outputSchema: z.object({
        sessionId: z.string(),
        consent: z.record(z.boolean()),
      }),
      handler: async (ctx, input) => {
        const session = await prisma.session.update({
          where: { id: input.sessionId },
          data: {
            consent: input.consent as any,
          },
        });
        return {
          sessionId: session.id,
          consent: input.consent,
        };
      },
    },
  ];
}
