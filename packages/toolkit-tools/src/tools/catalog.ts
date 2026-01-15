import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const getServicesSchema = z.object({
  category: z.string().optional(),
});

const getServiceSchema = z.object({
  serviceId: z.string(),
});

const getFAQSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export function createCatalogTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'catalog.get_services',
      category: 'catalog',
      description: 'Získá seznam služeb z katalogu',
      inputSchema: getServicesSchema,
      outputSchema: z.object({
        services: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            category: z.string().nullable(),
            price: z.number().nullable(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const services = await prisma.catalogService.findMany({
          where: input.category ? { category: input.category } : undefined,
        });
        return {
          services: services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            category: s.category,
            price: s.price,
          })),
        };
      },
    },
    {
      id: 'catalog.get_service',
      category: 'catalog',
      description: 'Získá detail služby',
      inputSchema: getServiceSchema,
      outputSchema: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        category: z.string().nullable(),
        price: z.number().nullable(),
        metadata: z.record(z.any()).nullable(),
      }),
      handler: async (ctx, input) => {
        const service = await prisma.catalogService.findUnique({
          where: { id: input.serviceId },
        });
        if (!service) {
          throw new Error(`Service ${input.serviceId} not found`);
        }
        return {
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          price: service.price,
          metadata: (service.metadata as any) || null,
        };
      },
    },
    {
      id: 'catalog.get_faq',
      category: 'catalog',
      description: 'Získá FAQ položky',
      inputSchema: getFAQSchema,
      outputSchema: z.object({
        faqs: z.array(
          z.object({
            id: z.string(),
            question: z.string(),
            answer: z.string(),
            category: z.string().nullable(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const faqs = await prisma.catalogFAQ.findMany({
          where: input.category ? { category: input.category } : undefined,
          take: input.limit || 20,
        });
        return {
          faqs: faqs.map((f) => ({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category,
          })),
        };
      },
    },
  ];
}
