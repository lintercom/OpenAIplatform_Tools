import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const createOrderSchema = z.object({
  cartId: z.string().optional(),
  sessionId: z.string().optional(),
  shippingMethod: z.string().optional(),
  shippingCost: z.number().optional(),
  paymentMethod: z.string().optional(),
  shippingAddress: z.record(z.any()).optional(),
  billingAddress: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const getOrderSchema = z.object({
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
});

const confirmOrderSchema = z.object({
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled']),
});

const getOrderStatusSchema = z.object({
  orderId: z.string().optional(),
  orderNumber: z.string().optional(),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export function createOrderTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'order.create',
      category: 'commerce',
      description: 'Vytvoří objednávku z košíku',
      inputSchema: createOrderSchema,
      outputSchema: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        status: z.string(),
        totalAmount: z.number(),
      }),
      handler: async (ctx, input) => {
        // Najít košík
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

        if (cart.items.length === 0) {
          throw new Error('Cart is empty');
        }

        // Validovat košík
        for (const item of cart.items) {
          if (item.product.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for product ${item.product.name} (${item.product.sku}). Available: ${item.product.stock}, requested: ${item.quantity}`
            );
          }
        }

        // Vypočítat celkovou částku
        const itemsTotal = cart.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const totalAmount = itemsTotal + (input.shippingCost || 0);

        // Vytvořit objednávku
        const order = await prisma.order.create({
          data: {
            orderNumber: generateOrderNumber(),
            leadId: cart.leadId || ctx.leadId || null,
            tenantId: cart.tenantId || ctx.tenantId || null,
            status: 'pending',
            totalAmount,
            shippingMethod: input.shippingMethod || null,
            shippingCost: input.shippingCost || 0,
            paymentMethod: input.paymentMethod || null,
            paymentStatus: 'pending',
            shippingAddress: input.shippingAddress as any,
            billingAddress: input.billingAddress as any,
            metadata: input.metadata as any,
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                metadata: item.metadata as any,
              })),
            },
          },
        });

        // Snížit sklad
        for (const item of cart.items) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Vyprázdnit košík (volitelné - může se nechat pro historické účely)
        // await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
        };
      },
    },
    {
      id: 'order.get',
      category: 'commerce',
      description: 'Získá objednávku podle ID nebo orderNumber',
      inputSchema: getOrderSchema,
      outputSchema: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        status: z.string(),
        totalAmount: z.number(),
        shippingMethod: z.string().nullable(),
        shippingCost: z.number(),
        paymentMethod: z.string().nullable(),
        paymentStatus: z.string(),
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
        createdAt: z.string(),
      }),
      handler: async (ctx, input) => {
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              input.orderId ? { id: input.orderId } : {},
              input.orderNumber ? { orderNumber: input.orderNumber } : {},
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

        if (!order) {
          throw new Error('Order not found');
        }

        const items = order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        }));

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          shippingMethod: order.shippingMethod,
          shippingCost: order.shippingCost,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          items,
          createdAt: order.createdAt.toISOString(),
        };
      },
    },
    {
      id: 'order.confirm',
      category: 'commerce',
      description: 'Potvrdí objednávku',
      inputSchema: confirmOrderSchema,
      outputSchema: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        status: z.string(),
        confirmed: z.boolean(),
      }),
      handler: async (ctx, input) => {
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              input.orderId ? { id: input.orderId } : {},
              input.orderNumber ? { orderNumber: input.orderNumber } : {},
            ],
          },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        if (order.status !== 'pending') {
          throw new Error(`Order is already ${order.status}, cannot confirm`);
        }

        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'confirmed',
          },
        });

        return {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          confirmed: true,
        };
      },
    },
    {
      id: 'order.update_status',
      category: 'commerce',
      description: 'Aktualizuje status objednávky',
      inputSchema: updateOrderStatusSchema,
      outputSchema: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        status: z.string(),
        updated: z.boolean(),
      }),
      handler: async (ctx, input) => {
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              input.orderId ? { id: input.orderId } : {},
              input.orderNumber ? { orderNumber: input.orderNumber } : {},
            ],
          },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: input.status,
            ...(input.status === 'paid' && { paymentStatus: 'paid' }),
          },
        });

        return {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          updated: true,
        };
      },
    },
    {
      id: 'order.get_status',
      category: 'commerce',
      description: 'Získá status objednávky',
      inputSchema: getOrderStatusSchema,
      outputSchema: z.object({
        orderId: z.string(),
        orderNumber: z.string(),
        status: z.string(),
        paymentStatus: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
      handler: async (ctx, input) => {
        const order = await prisma.order.findFirst({
          where: {
            OR: [
              input.orderId ? { id: input.orderId } : {},
              input.orderNumber ? { orderNumber: input.orderNumber } : {},
            ],
          },
        });

        if (!order) {
          throw new Error('Order not found');
        }

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        };
      },
    },
  ];
}
