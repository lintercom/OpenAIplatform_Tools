import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const createQuoteRequestSchema = z.object({
  leadId: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional(),
});

const attachFilesSchema = z.object({
  quoteRequestId: z.string(),
  attachments: z.array(
    z.object({
      url: z.string(),
      type: z.string(),
      name: z.string(),
    })
  ),
});

const normalizeQuoteDataSchema = z.object({
  quoteRequestId: z.string(),
});

const generateQuoteDraftSchema = z.object({
  quoteRequestId: z.string(),
  template: z.string().optional(),
});

const sendQuoteToCustomerSchema = z.object({
  quoteId: z.string(),
  method: z.enum(['email', 'message', 'link']).optional(),
});

const acceptQuoteSchema = z.object({
  quoteId: z.string(),
});

const getQuoteStatusSchema = z.object({
  quoteRequestId: z.string().optional(),
  quoteId: z.string().optional(),
});

export function createQuoteTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'quote.create_request',
      category: 'commerce',
      description: 'Vytvoří strukturovanou poptávku',
      inputSchema: createQuoteRequestSchema,
      outputSchema: z.object({
        quoteRequestId: z.string(),
        status: z.string(),
        createdAt: z.string(),
      }),
      handler: async (ctx, input) => {
        const quoteRequest = await prisma.quoteRequest.create({
          data: {
            leadId: input.leadId || ctx.leadId || null,
            sessionId: input.sessionId || ctx.sessionId || null,
            status: 'draft',
            data: input.data as any,
            metadata: input.metadata as any,
          },
        });

        return {
          quoteRequestId: quoteRequest.id,
          status: quoteRequest.status,
          createdAt: quoteRequest.createdAt.toISOString(),
        };
      },
    },
    {
      id: 'quote.attach_files',
      category: 'commerce',
      description: 'Připojí fotky/dokumenty k poptávce',
      inputSchema: attachFilesSchema,
      outputSchema: z.object({
        quoteRequestId: z.string(),
        attachments: z.array(
          z.object({
            url: z.string(),
            type: z.string(),
            name: z.string(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const quoteRequest = await prisma.quoteRequest.findUnique({
          where: { id: input.quoteRequestId },
        });

        if (!quoteRequest) {
          throw new Error('Quote request not found');
        }

        const existingAttachments = ((quoteRequest.attachments as any) || []) as any[];
        const updatedAttachments = [...existingAttachments, ...input.attachments];

        await prisma.quoteRequest.update({
          where: { id: input.quoteRequestId },
          data: {
            attachments: updatedAttachments as any,
          },
        });

        return {
          quoteRequestId: quoteRequest.id,
          attachments: updatedAttachments,
        };
      },
    },
    {
      id: 'quote.normalize_data',
      category: 'commerce',
      description: 'Sjednotí data poptávky pro obchodníky',
      inputSchema: normalizeQuoteDataSchema,
      outputSchema: z.object({
        quoteRequestId: z.string(),
        normalized: z.record(z.any()),
      }),
      handler: async (ctx, input) => {
        const quoteRequest = await prisma.quoteRequest.findUnique({
          where: { id: input.quoteRequestId },
        });

        if (!quoteRequest) {
          throw new Error('Quote request not found');
        }

        const data = quoteRequest.data as any;

        // Normalizace dat (zjednodušená verze)
        const normalized: any = {
          items: Array.isArray(data.items) ? data.items : [],
          requirements: data.requirements || data.notes || '',
          deliveryDate: data.deliveryDate || data.delivery || null,
          budget: data.budget || data.price || null,
          contact: {
            name: data.name || data.contactName || '',
            email: data.email || data.contactEmail || '',
            phone: data.phone || data.contactPhone || '',
          },
        };

        await prisma.quoteRequest.update({
          where: { id: input.quoteRequestId },
          data: {
            data: normalized as any,
            status: 'submitted',
          },
        });

        return {
          quoteRequestId: quoteRequest.id,
          normalized,
        };
      },
    },
    {
      id: 'quote.generate_draft',
      category: 'commerce',
      description: 'Generuje návrh nabídky (AI)',
      inputSchema: generateQuoteDraftSchema,
      outputSchema: z.object({
        quoteId: z.string(),
        status: z.string(),
        totalAmount: z.number().nullable(),
        items: z.array(z.any()),
      }),
      handler: async (ctx, input) => {
        const quoteRequest = await prisma.quoteRequest.findUnique({
          where: { id: input.quoteRequestId },
        });

        if (!quoteRequest) {
          throw new Error('Quote request not found');
        }

        if (quoteRequest.status !== 'submitted') {
          throw new Error('Quote request must be submitted before generating draft');
        }

        const data = quoteRequest.data as any;
        const normalized = data.normalized || data;

        // Generování nabídky (zjednodušená verze - v produkci by se použil AI)
        const items = (normalized.items || []).map((item: any) => ({
          name: item.name || item.description || 'Product',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.price || 0,
          total: (item.quantity || 1) * (item.unitPrice || item.price || 0),
        }));

        const totalAmount = items.reduce((sum: number, item: any) => sum + item.total, 0);

        const quote = await prisma.quote.create({
          data: {
            quoteRequestId: quoteRequest.id,
            leadId: quoteRequest.leadId,
            status: 'draft',
            totalAmount,
            items: items as any,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dní
          },
        });

        await prisma.quoteRequest.update({
          where: { id: input.quoteRequestId },
          data: {
            status: 'quoted',
          },
        });

        return {
          quoteId: quote.id,
          status: quote.status,
          totalAmount: quote.totalAmount,
          items,
        };
      },
    },
    {
      id: 'quote.send_to_customer',
      category: 'commerce',
      description: 'Odešle nabídku zákazníkovi',
      inputSchema: sendQuoteToCustomerSchema,
      outputSchema: z.object({
        quoteId: z.string(),
        status: z.string(),
        sent: z.boolean(),
        method: z.string(),
      }),
      handler: async (ctx, input) => {
        const quote = await prisma.quote.findUnique({
          where: { id: input.quoteId },
        });

        if (!quote) {
          throw new Error('Quote not found');
        }

        if (quote.status !== 'draft') {
          throw new Error(`Quote is ${quote.status}, cannot send`);
        }

        const method = input.method || 'email';

        // Zde by se odeslala zpráva (email/message/link)
        // Pro teď jen aktualizujeme status

        await prisma.quote.update({
          where: { id: input.quoteId },
          data: {
            status: 'sent',
          },
        });

        return {
          quoteId: quote.id,
          status: 'sent',
          sent: true,
          method,
        };
      },
    },
    {
      id: 'quote.accept',
      category: 'commerce',
      description: 'Přijme nabídku zákazníkem',
      inputSchema: acceptQuoteSchema,
      outputSchema: z.object({
        quoteId: z.string(),
        status: z.string(),
        accepted: z.boolean(),
      }),
      handler: async (ctx, input) => {
        const quote = await prisma.quote.findUnique({
          where: { id: input.quoteId },
        });

        if (!quote) {
          throw new Error('Quote not found');
        }

        if (quote.status !== 'sent') {
          throw new Error(`Quote is ${quote.status}, cannot accept`);
        }

        if (quote.validUntil && new Date(quote.validUntil) < new Date()) {
          throw new Error('Quote has expired');
        }

        await prisma.quote.update({
          where: { id: input.quoteId },
          data: {
            status: 'accepted',
          },
        });

        await prisma.quoteRequest.update({
          where: { id: quote.quoteRequestId },
          data: {
            status: 'accepted',
          },
        });

        return {
          quoteId: quote.id,
          status: 'accepted',
          accepted: true,
        };
      },
    },
    {
      id: 'quote.get_status',
      category: 'commerce',
      description: 'Získá status poptávky/nabídky',
      inputSchema: getQuoteStatusSchema,
      outputSchema: z.object({
        quoteRequestId: z.string().nullable(),
        quoteId: z.string().nullable(),
        status: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
      handler: async (ctx, input) => {
        if (input.quoteId) {
          const quote = await prisma.quote.findUnique({
            where: { id: input.quoteId },
          });

          if (!quote) {
            throw new Error('Quote not found');
          }

          return {
            quoteRequestId: quote.quoteRequestId,
            quoteId: quote.id,
            status: quote.status,
            createdAt: quote.createdAt.toISOString(),
            updatedAt: quote.updatedAt.toISOString(),
          };
        } else if (input.quoteRequestId) {
          const quoteRequest = await prisma.quoteRequest.findUnique({
            where: { id: input.quoteRequestId },
          });

          if (!quoteRequest) {
            throw new Error('Quote request not found');
          }

          const quote = await prisma.quote.findUnique({
            where: { quoteRequestId: quoteRequest.id },
          });

          return {
            quoteRequestId: quoteRequest.id,
            quoteId: quote?.id || null,
            status: quoteRequest.status,
            createdAt: quoteRequest.createdAt.toISOString(),
            updatedAt: quoteRequest.updatedAt.toISOString(),
          };
        } else {
          throw new Error('Either quoteId or quoteRequestId is required');
        }
      },
    },
  ];
}
