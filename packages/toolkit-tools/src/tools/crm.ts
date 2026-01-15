import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';
import { CRMAdapter } from '@ai-toolkit/adapters';

const upsertLeadSchema = z.object({
  leadId: z.string(),
  crmData: z.record(z.any()).optional(),
});

const createTaskSchema = z.object({
  leadId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export function createCRMTools(prisma: PrismaClient, crmAdapter: CRMAdapter): ToolDefinition[] {
  return [
    {
      id: 'crm.upsert_lead',
      category: 'crm',
      description: 'Synchronizuje lead do externího CRM systému',
      inputSchema: upsertLeadSchema,
      outputSchema: z.object({
        crmLeadId: z.string(),
        synced: z.boolean(),
      }),
      handler: async (ctx, input) => {
        const lead = await prisma.lead.findUnique({
          where: { id: input.leadId },
        });
        if (!lead) {
          throw new Error(`Lead ${input.leadId} not found`);
        }

        const crmLead = await crmAdapter.upsertLead({
          id: lead.id,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          name: lead.name || undefined,
          stage: lead.stage,
          score: lead.score,
          tags: lead.tags,
          data: { ...(lead.data as any), ...input.crmData },
        });

        return {
          crmLeadId: crmLead.id,
          synced: true,
        };
      },
    },
    {
      id: 'crm.create_task',
      category: 'crm',
      description: 'Vytvoří task v CRM systému',
      inputSchema: createTaskSchema,
      outputSchema: z.object({
        taskId: z.string(),
        created: z.boolean(),
      }),
      handler: async (ctx, input) => {
        const task = await crmAdapter.createTask(input.leadId, {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        });

        return {
          taskId: task.id,
          created: true,
        };
      },
    },
  ];
}
