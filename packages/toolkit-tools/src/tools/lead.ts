import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const getOrCreateLeadSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateLeadSchema = z.object({
  leadId: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  data: z.record(z.any()).optional(),
});

const setStageSchema = z.object({
  leadId: z.string(),
  stage: z.string(),
});

const addTagsSchema = z.object({
  leadId: z.string(),
  tags: z.array(z.string()),
});

const scoreLeadSchema = z.object({
  leadId: z.string(),
  score: z.number().int(),
});

export function createLeadTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'lead.get_or_create',
      category: 'lead',
      description: 'Získá nebo vytvoří lead podle emailu nebo telefonu',
      inputSchema: getOrCreateLeadSchema,
      outputSchema: z.object({
        leadId: z.string(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        name: z.string().nullable(),
        stage: z.string(),
        score: z.number(),
        tags: z.array(z.string()),
      }),
      policy: {
        piiRules: {
          redactInAudit: true,
          fields: ['email', 'phone', 'name'],
        },
      },
      handler: async (ctx, input) => {
        let lead = null;

        if (input.email) {
          lead = await prisma.lead.findUnique({
            where: { email: input.email },
          });
        } else if (input.phone) {
          lead = await prisma.lead.findFirst({
            where: { phone: input.phone },
          });
        }

        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              email: input.email,
              phone: input.phone,
              name: input.name,
              data: input.metadata as any,
            },
          });
        }

        return {
          leadId: lead.id,
          email: lead.email,
          phone: lead.phone,
          name: lead.name,
          stage: lead.stage,
          score: lead.score,
          tags: lead.tags,
        };
      },
    },
    {
      id: 'lead.update',
      category: 'lead',
      description: 'Aktualizuje lead data',
      inputSchema: updateLeadSchema,
      outputSchema: z.object({
        leadId: z.string(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        name: z.string().nullable(),
        stage: z.string(),
        score: z.number(),
      }),
      policy: {
        piiRules: {
          redactInAudit: true,
          fields: ['email', 'phone', 'name'],
        },
      },
      handler: async (ctx, input) => {
        const lead = await prisma.lead.update({
          where: { id: input.leadId },
          data: {
            ...(input.email && { email: input.email }),
            ...(input.phone && { phone: input.phone }),
            ...(input.name && { name: input.name }),
            ...(input.data && { data: { ...input.data } as any }),
          },
        });
        return {
          leadId: lead.id,
          email: lead.email,
          phone: lead.phone,
          name: lead.name,
          stage: lead.stage,
          score: lead.score,
        };
      },
    },
    {
      id: 'lead.set_stage',
      category: 'lead',
      description: 'Nastaví stage leadu',
      inputSchema: setStageSchema,
      outputSchema: z.object({
        leadId: z.string(),
        stage: z.string(),
      }),
      handler: async (ctx, input) => {
        const lead = await prisma.lead.update({
          where: { id: input.leadId },
          data: { stage: input.stage },
        });
        return {
          leadId: lead.id,
          stage: lead.stage,
        };
      },
    },
    {
      id: 'lead.add_tags',
      category: 'lead',
      description: 'Přidá tagy k leadu',
      inputSchema: addTagsSchema,
      outputSchema: z.object({
        leadId: z.string(),
        tags: z.array(z.string()),
      }),
      handler: async (ctx, input) => {
        const lead = await prisma.lead.findUnique({
          where: { id: input.leadId },
        });
        if (!lead) {
          throw new Error(`Lead ${input.leadId} not found`);
        }

        const updatedTags = Array.from(new Set([...lead.tags, ...input.tags]));
        const updated = await prisma.lead.update({
          where: { id: input.leadId },
          data: { tags: updatedTags },
        });

        return {
          leadId: updated.id,
          tags: updated.tags,
        };
      },
    },
    {
      id: 'lead.score',
      category: 'lead',
      description: 'Nastaví score leadu',
      inputSchema: scoreLeadSchema,
      outputSchema: z.object({
        leadId: z.string(),
        score: z.number(),
      }),
      handler: async (ctx, input) => {
        const lead = await prisma.lead.update({
          where: { id: input.leadId },
          data: { score: input.score },
        });
        return {
          leadId: lead.id,
          score: lead.score,
        };
      },
    },
  ];
}
