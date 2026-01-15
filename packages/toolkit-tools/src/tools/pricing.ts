import { z } from 'zod';
import { ToolDefinition } from '@ai-toolkit/core';

const getRulesSchema = z.object({
  serviceId: z.string().optional(),
  leadId: z.string().optional(),
});

const getAllowedOfferSchema = z.object({
  serviceId: z.string(),
  leadId: z.string(),
});

export function createPricingTools(): ToolDefinition[] {
  // Mock pricing rules storage
  const pricingRules: Record<string, any> = {
    default: {
      discount: 0,
      minPrice: 0,
    },
  };

  return [
    {
      id: 'pricing.get_rules',
      category: 'pricing',
      description: 'Získá pricing rules pro službu nebo lead',
      inputSchema: getRulesSchema,
      outputSchema: z.object({
        rules: z.object({
          discount: z.number(),
          minPrice: z.number(),
          maxPrice: z.number().nullable(),
        }),
      }),
      handler: async (ctx, input) => {
        // Mock: v produkci by se načítaly z DB nebo externího systému
        const key = input.serviceId || input.leadId || 'default';
        const rules = pricingRules[key] || pricingRules.default;

        return {
          rules: {
            discount: rules.discount || 0,
            minPrice: rules.minPrice || 0,
            maxPrice: rules.maxPrice || null,
          },
        };
      },
    },
    {
      id: 'pricing.get_allowed_offer',
      category: 'pricing',
      description: 'Získá povolenou nabídku pro lead a službu',
      inputSchema: getAllowedOfferSchema,
      outputSchema: z.object({
        offer: z.object({
          serviceId: z.string(),
          price: z.number(),
          discount: z.number(),
          finalPrice: z.number(),
        }),
      }),
      handler: async (ctx, input) => {
        // Mock: v produkci by se načítaly skutečné ceny a slevy
        const basePrice = 1000; // Mock base price
        const discount = 0.1; // 10% discount
        const finalPrice = basePrice * (1 - discount);

        return {
          offer: {
            serviceId: input.serviceId,
            price: basePrice,
            discount: discount,
            finalPrice: finalPrice,
          },
        };
      },
    },
  ];
}
