import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const createCartSchema = z.object({
  sessionId: z.string().optional(),
  leadId: z.string().optional(),
  tenantId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const getCartSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
});

const addItemSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  productId: z.string(),
  quantity: z.number().int().min(1).default(1),
  metadata: z.record(z.any()).optional(),
});

const removeItemSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  productId: z.string(),
});

const updateItemSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  productId: z.string(),
  quantity: z.number().int().min(1),
});

const clearCartSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
});

const validateCartSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
});

export function createCartTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'cart.create',
      category: 'commerce',
      description: 'Vytvoří nový košík',
      inputSchema: createCartSchema,
      outputSchema: z.object({
        cartId: z.string(),
        sessionId: z.string().nullable(),
        leadId: z.string().nullable(),
      }),
      handler: async (ctx, input) => {
        const cart = await prisma.cart.create({
          data: {
            sessionId: input.sessionId || ctx.sessionId || null,
            leadId: input.leadId || ctx.leadId || null,
            tenantId: input.tenantId || ctx.tenantId || null,
            metadata: input.metadata as any,
          },
        });
        return {
          cartId: cart.id,
          sessionId: cart.sessionId,
          leadId: cart.leadId,
        };
      },
    },
    {
      id: 'cart.get',
      category: 'commerce',
      description: 'Získá košík podle ID nebo sessionId',
      inputSchema: getCartSchema,
      outputSchema: z.object({
        cartId: z.string(),
        sessionId: z.string().nullable(),
        leadId: z.string().nullable(),
        items: z.array(
          z.object({
            id: z.string(),
            productId: z.string(),
            productName: z.string(),
            quantity: z.number(),
            price: z.number(),
            subtotal: z.number(),
          })
        ),
        total: z.number(),
        itemCount: z.number(),
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

        const items = cart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        }));

        const total = items.reduce((sum, item) => sum + item.subtotal, 0);

        return {
          cartId: cart.id,
          sessionId: cart.sessionId,
          leadId: cart.leadId,
          items,
          total,
          itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        };
      },
    },
    {
      id: 'cart.add_item',
      category: 'commerce',
      description: 'Přidá produkt do košíku',
      inputSchema: addItemSchema,
      outputSchema: z.object({
        cartId: z.string(),
        itemId: z.string(),
        productId: z.string(),
        quantity: z.number(),
        price: z.number(),
      }),
      handler: async (ctx, input) => {
        // Najít nebo vytvořit košík
        let cart = await prisma.cart.findFirst({
          where: {
            OR: [
              input.cartId ? { id: input.cartId } : {},
              input.sessionId || ctx.sessionId
                ? { sessionId: input.sessionId || ctx.sessionId || undefined }
                : {},
            ],
          },
        });

        if (!cart) {
          cart = await prisma.cart.create({
            data: {
              sessionId: input.sessionId || ctx.sessionId || null,
              leadId: ctx.leadId || null,
              tenantId: ctx.tenantId || null,
            },
          });
        }

        // Získat produkt
        const product = await prisma.product.findUnique({
          where: { id: input.productId },
        });

        if (!product) {
          throw new Error(`Product ${input.productId} not found`);
        }

        if (product.stock < input.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${product.stock}, requested: ${input.quantity}`
          );
        }

        // Přidat nebo aktualizovat položku
        const existingItem = await prisma.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: input.productId,
            },
          },
        });

        let cartItem;
        if (existingItem) {
          cartItem = await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + input.quantity,
              price: product.price, // Aktualizovat cenu
              metadata: input.metadata as any,
            },
          });
        } else {
          cartItem = await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: input.productId,
              quantity: input.quantity,
              price: product.price,
              metadata: input.metadata as any,
            },
          });
        }

        return {
          cartId: cart.id,
          itemId: cartItem.id,
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          price: cartItem.price,
        };
      },
    },
    {
      id: 'cart.remove_item',
      category: 'commerce',
      description: 'Odebere produkt z košíku',
      inputSchema: removeItemSchema,
      outputSchema: z.object({
        cartId: z.string(),
        removed: z.boolean(),
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
        });

        if (!cart) {
          throw new Error('Cart not found');
        }

        await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            productId: input.productId,
          },
        });

        return {
          cartId: cart.id,
          removed: true,
        };
      },
    },
    {
      id: 'cart.update_item',
      category: 'commerce',
      description: 'Aktualizuje množství produktu v košíku',
      inputSchema: updateItemSchema,
      outputSchema: z.object({
        cartId: z.string(),
        itemId: z.string(),
        quantity: z.number(),
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
        });

        if (!cart) {
          throw new Error('Cart not found');
        }

        const cartItem = await prisma.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: input.productId,
            },
          },
          include: {
            product: true,
          },
        });

        if (!cartItem) {
          throw new Error('Cart item not found');
        }

        if (cartItem.product.stock < input.quantity) {
          throw new Error(
            `Insufficient stock. Available: ${cartItem.product.stock}, requested: ${input.quantity}`
          );
        }

        const updated = await prisma.cartItem.update({
          where: { id: cartItem.id },
          data: {
            quantity: input.quantity,
          },
        });

        return {
          cartId: cart.id,
          itemId: updated.id,
          quantity: updated.quantity,
        };
      },
    },
    {
      id: 'cart.clear',
      category: 'commerce',
      description: 'Vyprázdní košík',
      inputSchema: clearCartSchema,
      outputSchema: z.object({
        cartId: z.string(),
        cleared: z.boolean(),
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
        });

        if (!cart) {
          throw new Error('Cart not found');
        }

        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return {
          cartId: cart.id,
          cleared: true,
        };
      },
    },
    {
      id: 'cart.validate',
      category: 'commerce',
      description: 'Validuje košík (dostupnost, kombinace)',
      inputSchema: validateCartSchema,
      outputSchema: z.object({
        cartId: z.string(),
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

        for (const item of cart.items) {
          // Kontrola dostupnosti
          if (item.product.stock < item.quantity) {
            errors.push(
              `Product ${item.product.name} (${item.product.sku}): insufficient stock. Available: ${item.product.stock}, requested: ${item.quantity}`
            );
          }

          // Kontrola změny ceny
          if (item.price !== item.product.price) {
            warnings.push(
              `Product ${item.product.name} (${item.product.sku}): price changed from ${item.price} to ${item.product.price}`
            );
          }

          // Kontrola nízkého skladu
          if (item.product.stock > 0 && item.product.stock < 5) {
            warnings.push(
              `Product ${item.product.name} (${item.product.sku}): low stock (${item.product.stock} remaining)`
            );
          }
        }

        return {
          cartId: cart.id,
          valid: errors.length === 0,
          errors,
          warnings,
        };
      },
    },
  ];
}
