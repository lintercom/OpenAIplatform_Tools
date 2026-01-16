import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const createServiceTicketSchema = z.object({
  leadId: z.string().optional(),
  sessionId: z.string().optional(),
  description: z.string(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  metadata: z.record(z.any()).optional(),
});

const detectRequiredPartsSchema = z.object({
  ticketId: z.string(),
  description: z.string().optional(),
});

const estimateUrgencySchema = z.object({
  ticketId: z.string(),
  description: z.string().optional(),
});

const getServiceTicketSchema = z.object({
  ticketId: z.string(),
});

const updateServiceTicketSchema = z.object({
  ticketId: z.string(),
  status: z.enum(['open', 'in_progress', 'waiting_parts', 'resolved', 'closed']).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export function createServiceTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'service.create_ticket',
      category: 'commerce',
      description: 'Vytvoří servisní ticket',
      inputSchema: createServiceTicketSchema,
      outputSchema: z.object({
        ticketId: z.string(),
        status: z.string(),
        urgency: z.string(),
        createdAt: z.string(),
      }),
      handler: async (ctx, input) => {
        const ticket = await prisma.serviceTicket.create({
          data: {
            leadId: input.leadId || ctx.leadId || null,
            sessionId: input.sessionId || ctx.sessionId || null,
            description: input.description,
            status: 'open',
            urgency: input.urgency || 'normal',
            metadata: input.metadata as any,
          },
        });

        return {
          ticketId: ticket.id,
          status: ticket.status,
          urgency: ticket.urgency,
          createdAt: ticket.createdAt.toISOString(),
        };
      },
    },
    {
      id: 'service.detect_required_parts',
      category: 'commerce',
      description: 'Detekuje potřebné díly pro opravu (AI)',
      inputSchema: detectRequiredPartsSchema,
      outputSchema: z.object({
        ticketId: z.string(),
        requiredParts: z.array(
          z.object({
            productId: z.string().optional(),
            sku: z.string().optional(),
            name: z.string(),
            quantity: z.number(),
            reason: z.string(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const ticket = await prisma.serviceTicket.findUnique({
          where: { id: input.ticketId },
        });

        if (!ticket) {
          throw new Error('Service ticket not found');
        }

        const description = input.description || ticket.description;

        // Zjednodušená detekce dílů (v produkci by se použil AI)
        // Hledání produktů podle klíčových slov v popisu
        const keywords = description.toLowerCase().split(/\s+/);
        const products = await prisma.product.findMany({
          where: {
            OR: keywords.map((kw) => ({
              name: { contains: kw, mode: 'insensitive' },
            })),
          },
          take: 10,
        });

        const requiredParts = products.slice(0, 5).map((p) => ({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          quantity: 1,
          reason: `Mentioned in service description`,
        }));

        await prisma.serviceTicket.update({
          where: { id: input.ticketId },
          data: {
            requiredParts: requiredParts as any,
          },
        });

        return {
          ticketId: ticket.id,
          requiredParts,
        };
      },
    },
    {
      id: 'service.estimate_urgency',
      category: 'commerce',
      description: 'Odhadne prioritu zásahu',
      inputSchema: estimateUrgencySchema,
      outputSchema: z.object({
        ticketId: z.string(),
        urgency: z.enum(['low', 'normal', 'high', 'critical']),
        reasoning: z.string(),
      }),
      handler: async (ctx, input) => {
        const ticket = await prisma.serviceTicket.findUnique({
          where: { id: input.ticketId },
        });

        if (!ticket) {
          throw new Error('Service ticket not found');
        }

        const description = (input.description || ticket.description).toLowerCase();

        // Klíčová slova pro urgency
        const criticalKeywords = ['akutní', 'kritické', 'havárie', 'nefunguje', 'stojí'];
        const highKeywords = ['důležité', 'rychle', 'potřebuji'];
        const lowKeywords = ['později', 'není spěch'];

        let urgency: 'low' | 'normal' | 'high' | 'critical' = ticket.urgency as any;
        let reasoning = '';

        const criticalScore = criticalKeywords.filter((kw) => description.includes(kw)).length;
        const highScore = highKeywords.filter((kw) => description.includes(kw)).length;
        const lowScore = lowKeywords.filter((kw) => description.includes(kw)).length;

        if (criticalScore > 0) {
          urgency = 'critical';
          reasoning = `Critical keywords detected: ${criticalScore}`;
        } else if (highScore > 0) {
          urgency = 'high';
          reasoning = `High priority keywords detected: ${highScore}`;
        } else if (lowScore > 0) {
          urgency = 'low';
          reasoning = `Low priority keywords detected: ${lowScore}`;
        } else {
          reasoning = 'No urgency indicators, keeping current level';
        }

        await prisma.serviceTicket.update({
          where: { id: input.ticketId },
          data: {
            urgency,
          },
        });

        return {
          ticketId: ticket.id,
          urgency,
          reasoning,
        };
      },
    },
    {
      id: 'service.get_ticket',
      category: 'commerce',
      description: 'Získá servisní ticket',
      inputSchema: getServiceTicketSchema,
      outputSchema: z.object({
        ticketId: z.string(),
        status: z.string(),
        urgency: z.string(),
        description: z.string(),
        requiredParts: z.array(z.any()).nullable(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
      handler: async (ctx, input) => {
        const ticket = await prisma.serviceTicket.findUnique({
          where: { id: input.ticketId },
        });

        if (!ticket) {
          throw new Error('Service ticket not found');
        }

        return {
          ticketId: ticket.id,
          status: ticket.status,
          urgency: ticket.urgency,
          description: ticket.description,
          requiredParts: (ticket.requiredParts as any) || null,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        };
      },
    },
    {
      id: 'service.update_ticket',
      category: 'commerce',
      description: 'Aktualizuje servisní ticket',
      inputSchema: updateServiceTicketSchema,
      outputSchema: z.object({
        ticketId: z.string(),
        status: z.string(),
        urgency: z.string(),
        updated: z.boolean(),
      }),
      handler: async (ctx, input) => {
        const ticket = await prisma.serviceTicket.findUnique({
          where: { id: input.ticketId },
        });

        if (!ticket) {
          throw new Error('Service ticket not found');
        }

        const updateData: any = {};
        if (input.status) updateData.status = input.status;
        if (input.urgency) updateData.urgency = input.urgency;
        if (input.description) updateData.description = input.description;
        if (input.metadata) updateData.metadata = input.metadata as any;

        const updated = await prisma.serviceTicket.update({
          where: { id: input.ticketId },
          data: updateData,
        });

        return {
          ticketId: updated.id,
          status: updated.status,
          urgency: updated.urgency,
          updated: true,
        };
      },
    },
  ];
}
