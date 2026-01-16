import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const trackEventSchema = z.object({
  sessionId: z.string().optional(),
  leadId: z.string().optional(),
  type: z.string(),
  payload: z.record(z.any()).optional(),
});

const getTimelineSchema = z.object({
  sessionId: z.string().optional(),
  leadId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export function createEventTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'event.track',
      category: 'event',
      description: 'Trackuje event (akci) v systému',
      inputSchema: trackEventSchema,
      outputSchema: z.object({
        eventId: z.string(),
        type: z.string(),
        createdAt: z.string(),
      }),
      handler: async (ctx, input) => {
        const event = await prisma.event.create({
          data: {
            sessionId: input.sessionId || ctx.sessionId,
            leadId: input.leadId || ctx.leadId,
            type: input.type,
            payload: input.payload as any,
          },
        });
        return {
          eventId: event.id,
          type: event.type,
          createdAt: event.createdAt.toISOString(),
        };
      },
    },
    {
      id: 'event.timeline',
      category: 'event',
      description: 'Získá timeline eventů pro session nebo lead',
      inputSchema: getTimelineSchema,
      outputSchema: z.object({
        events: z.array(
          z.object({
            id: z.string(),
            type: z.string(),
            payload: z.record(z.any()).nullable(),
            createdAt: z.string(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const events = await prisma.event.findMany({
          where: {
            ...(input.sessionId && { sessionId: input.sessionId }),
            ...(input.leadId && { leadId: input.leadId }),
            ...(!input.sessionId && !input.leadId && {
              OR: [{ sessionId: ctx.sessionId }, { leadId: ctx.leadId }],
            }),
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit || 50,
        });

        return {
          events: events.map((e) => ({
            id: e.id,
            type: e.type,
            payload: (e.payload as any) || null,
            createdAt: e.createdAt.toISOString(),
          })),
        };
      },
    },
  ];
}
