import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const calculateShippingSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  shippingMethod: z.string().optional(),
  address: z.record(z.any()).optional(),
});

const selectPaymentMethodSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  tenantId: z.string().optional(),
});

const validateCheckoutSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  shippingAddress: z.record(z.any()).optional(),
  billingAddress: z.record(z.any()).optional(),
});

export function createCheckoutTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'checkout.calculate_shipping',
      category: 'commerce',
      description: 'Vypočítá cenu dopravy (balík/paleta/osobně)',
      inputSchema: calculateShippingSchema,
      outputSchema: z.object({
        shippingMethods: z.array(
          z.object({
            method: z.string(),
            name: z.string(),
            cost: z.number(),
            estimatedDays: z.number(),
            description: z.string(),
          })
        ),
        recommended: z.string(),
      }),
      handler: async (ctx, input) => {
        const cart = await prisma.cart.findFirst({
          where: {
            OR: [
              input.cartId ? { id: input.cartId } : {},
              input.sessionId || ctx.sessionId
                ? { sessionId: input.sessionId || ctx.sessionId || undefined }
                : {},
            ],
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!cart) {
          throw new Error('Cart not found');
        }

        // Vypočítat celkovou hmotnost a objem (zjednodušené)
        const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalWeight = totalItems * 1.5; // Zjednodušené: 1.5 kg na položku
        const totalValue = cart.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const shippingMethods = [
          {
            method: 'standard',
            name: 'Standardní balík',
            cost: totalWeight > 5 ? 150 : 99,
            estimatedDays: 3,
            description: 'Doprava standardním balíkem',
          },
          {
            method: 'express',
            name: 'Expresní doprava',
            cost: totalWeight > 5 ? 250 : 199,
            estimatedDays: 1,
            description: 'Expresní doprava do 24 hodin',
          },
          {
            method: 'pallet',
            name: 'Paletová doprava',
            cost: totalWeight > 100 ? 500 : 0, // Pouze pro těžké zásilky
            estimatedDays: 5,
            description: 'Paletová doprava pro velké objemy',
          },
          {
            method: 'pickup',
            name: 'Osobní odběr',
            cost: 0,
            estimatedDays: 0,
            description: 'Osobní odběr na prodejně',
          },
        ].filter((m) => {
          // Filtrovat podle relevance
          if (m.method === 'pallet' && totalWeight < 50) {
            return false;
          }
          return true;
        });

        // Doporučit metodu
        const recommended =
          totalWeight > 100
            ? 'pallet'
            : totalValue > 5000
            ? 'express'
            : 'standard';

        return {
          shippingMethods,
          recommended,
        };
      },
    },
    {
      id: 'checkout.select_payment_method',
      category: 'commerce',
      description: 'Získá dostupné platební metody',
      inputSchema: selectPaymentMethodSchema,
      outputSchema: z.object({
        paymentMethods: z.array(
          z.object({
            method: z.string(),
            name: z.string(),
            description: z.string(),
            available: z.boolean(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        // Získat tenant metadata pro platební metody
        let tenantMetadata: any = null;
        if (input.tenantId || ctx.tenantId) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: (input.tenantId || ctx.tenantId) as string },
          });
          tenantMetadata = tenant?.metadata as any;
        }

        // Výchozí platební metody
        const defaultMethods = [
          {
            method: 'card',
            name: 'Platební karta',
            description: 'Online platba platební kartou',
            available: true,
          },
          {
            method: 'bank_transfer',
            name: 'Bankovní převod',
            description: 'Převod na účet',
            available: true,
          },
          {
            method: 'cod',
            name: 'Dobírka',
            description: 'Platba při převzetí',
            available: true,
          },
          {
            method: 'invoice',
            name: 'Faktura',
            description: 'Faktura pro B2B zákazníky',
            available: false, // Pouze pro B2B
          },
        ];

        // Upravit podle tenant konfigurace
        const paymentMethods = defaultMethods.map((m) => {
          if (tenantMetadata?.paymentMethods) {
            const tenantMethod = (tenantMetadata.paymentMethods as any[]).find(
              (tm: any) => tm.method === m.method
            );
            if (tenantMethod) {
              return { ...m, ...tenantMethod };
            }
          }
          return m;
        });

        return {
          paymentMethods,
        };
      },
    },
    {
      id: 'checkout.validate',
      category: 'commerce',
      description: 'Validuje checkout před dokončením',
      inputSchema: validateCheckoutSchema,
      outputSchema: z.object({
        valid: z.boolean(),
        errors: z.array(z.string()),
        warnings: z.array(z.string()),
      }),
      handler: async (ctx, input) => {
        const cart = await prisma.cart.findFirst({
          where: {
            OR: [
              input.cartId ? { id: input.cartId } : {},
              input.sessionId || ctx.sessionId
                ? { sessionId: input.sessionId || ctx.sessionId || undefined }
                : {},
            ],
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!cart) {
          throw new Error('Cart not found');
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validace košíku
        if (cart.items.length === 0) {
          errors.push('Cart is empty');
        }

        // Validace dostupnosti
        for (const item of cart.items) {
          if (item.product.stock < item.quantity) {
            errors.push(
              `Product ${item.product.name} (${item.product.sku}): insufficient stock`
            );
          }
        }

        // Validace adres
        if (!input.shippingAddress) {
          errors.push('Shipping address is required');
        } else {
          const shipping = input.shippingAddress as any;
          if (!shipping.street || !shipping.city || !shipping.postalCode) {
            errors.push('Shipping address is incomplete');
          }
        }

        if (!input.billingAddress) {
          warnings.push('Billing address not provided, using shipping address');
        }

        return {
          valid: errors.length === 0,
          errors,
          warnings,
        };
      },
    },
  ];
}
