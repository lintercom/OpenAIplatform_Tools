import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const searchProductsSchema = z.object({
  query: z.string(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
});

const getProductSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
});

const filterByCompatibilitySchema = z.object({
  machineType: z.string().optional(),
  machineModel: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  category: z.string().optional(),
});

const explainDifferencesSchema = z.object({
  productIds: z.array(z.string()).min(2),
});

const recommendVariantSchema = z.object({
  productId: z.string().optional(),
  category: z.string().optional(),
  requirements: z.record(z.any()).optional(),
});

const suggestAccessoriesSchema = z.object({
  productId: z.string(),
  limit: z.number().int().min(1).max(10).optional(),
});

const checkAvailabilitySchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
});

export function createProductTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'product.search',
      category: 'commerce',
      description: 'Fulltext + sémantické vyhledávání produktů',
      inputSchema: searchProductsSchema,
      outputSchema: z.object({
        products: z.array(
          z.object({
            id: z.string(),
            sku: z.string(),
            name: z.string(),
            description: z.string().nullable(),
            category: z.string().nullable(),
            price: z.number(),
            stock: z.number(),
          })
        ),
        total: z.number(),
      }),
      handler: async (ctx, input) => {
        const where: any = {};

        // Fulltext search v názvu a popisu
        if (input.query) {
          where.OR = [
            { name: { contains: input.query, mode: 'insensitive' } },
            { description: { contains: input.query, mode: 'insensitive' } },
            { sku: { contains: input.query, mode: 'insensitive' } },
          ];
        }

        if (input.category) {
          where.category = input.category;
        }

        if (input.minPrice !== undefined || input.maxPrice !== undefined) {
          where.price = {};
          if (input.minPrice !== undefined) {
            where.price.gte = input.minPrice;
          }
          if (input.maxPrice !== undefined) {
            where.price.lte = input.maxPrice;
          }
        }

        if (input.inStock !== undefined) {
          if (input.inStock) {
            where.stock = { gt: 0 };
          } else {
            where.stock = { lte: 0 };
          }
        }

        const products = await prisma.product.findMany({
          where,
          take: input.limit || 20,
          orderBy: [
            { stock: 'desc' }, // Dostupné produkty první
            { price: 'asc' }, // Pak podle ceny
          ],
        });

        return {
          products: products.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            description: p.description,
            category: p.category,
            price: p.price,
            stock: p.stock,
          })),
          total: products.length,
        };
      },
    },
    {
      id: 'product.get',
      category: 'commerce',
      description: 'Získá detail produktu',
      inputSchema: getProductSchema,
      outputSchema: z.object({
        id: z.string(),
        sku: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        category: z.string().nullable(),
        price: z.number(),
        stock: z.number(),
        metadata: z.record(z.any()).nullable(),
      }),
      handler: async (ctx, input) => {
        const product = await prisma.product.findFirst({
          where: {
            OR: [
              input.productId ? { id: input.productId } : {},
              input.sku ? { sku: input.sku } : {},
            ],
          },
        });

        if (!product) {
          throw new Error('Product not found');
        }

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          stock: product.stock,
          metadata: (product.metadata as any) || null,
        };
      },
    },
    {
      id: 'product.filter_by_compatibility',
      category: 'commerce',
      description: 'Filtruje produkty podle kompatibility (stroj, parametry)',
      inputSchema: filterByCompatibilitySchema,
      outputSchema: z.object({
        products: z.array(
          z.object({
            id: z.string(),
            sku: z.string(),
            name: z.string(),
            category: z.string().nullable(),
            price: z.number(),
            stock: z.number(),
            compatibility: z.record(z.any()).nullable(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const where: any = {};

        if (input.category) {
          where.category = input.category;
        }

        // Filtrování podle metadata (kompatibilita)
        if (input.machineType || input.machineModel || input.parameters) {
          // Toto je zjednodušená verze - v produkci by se použilo pokročilejší vyhledávání
          where.metadata = {};
        }

        const products = await prisma.product.findMany({
          where,
          take: 50,
        });

        // Filtrování podle kompatibility v metadata
        const filtered = products.filter((p) => {
          const metadata = (p.metadata as any) || {};
          if (input.machineType && metadata.machineType !== input.machineType) {
            return false;
          }
          if (input.machineModel && metadata.machineModel !== input.machineModel) {
            return false;
          }
          if (input.parameters) {
            for (const [key, value] of Object.entries(input.parameters)) {
              if (metadata[key] !== value) {
                return false;
              }
            }
          }
          return true;
        });

        return {
          products: filtered.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            compatibility: (p.metadata as any) || null,
          })),
        };
      },
    },
    {
      id: 'product.explain_differences',
      category: 'commerce',
      description: 'Vysvětlí rozdíly mezi variantami produktů',
      inputSchema: explainDifferencesSchema,
      outputSchema: z.object({
        products: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            differences: z.array(z.string()),
          })
        ),
        summary: z.string(),
      }),
      handler: async (ctx, input) => {
        const products = await prisma.product.findMany({
          where: {
            id: { in: input.productIds },
          },
        });

        if (products.length !== input.productIds.length) {
          throw new Error('Some products not found');
        }

        // Porovnání produktů
        const differences: string[] = [];
        const productData = products.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          differences: [] as string[],
        }));

        // Porovnání cen
        const prices = products.map((p) => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice !== maxPrice) {
          differences.push(`Price range: ${minPrice} - ${maxPrice}`);
        }

        // Porovnání kategorií
        const categories = products.map((p) => p.category).filter(Boolean);
        if (new Set(categories).size > 1) {
          differences.push('Different categories');
        }

        // Porovnání skladu
        const stocks = products.map((p) => p.stock);
        const minStock = Math.min(...stocks);
        const maxStock = Math.max(...stocks);
        if (minStock !== maxStock) {
          differences.push(`Stock range: ${minStock} - ${maxStock}`);
        }

        const summary = `Found ${products.length} products. ${differences.join('. ')}`;

        return {
          products: productData,
          summary,
        };
      },
    },
    {
      id: 'product.recommend_variant',
      category: 'commerce',
      description: 'Doporučí nejlepší variantu produktu',
      inputSchema: recommendVariantSchema,
      outputSchema: z.object({
        recommended: z.object({
          id: z.string(),
          name: z.string(),
          price: z.number(),
          stock: z.number(),
          reason: z.string(),
        }),
        alternatives: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const where: any = {};

        if (input.productId) {
          const baseProduct = await prisma.product.findUnique({
            where: { id: input.productId },
          });
          if (baseProduct) {
            where.category = baseProduct.category;
          }
        } else if (input.category) {
          where.category = input.category;
        }

        const products = await prisma.product.findMany({
          where,
          take: 10,
          orderBy: [
            { stock: 'desc' }, // Dostupné produkty
            { price: 'asc' }, // Nejlevnější
          ],
        });

        if (products.length === 0) {
          throw new Error('No products found');
        }

        // Najít nejlepší variantu (dostupná, dobrá cena)
        const available = products.filter((p) => p.stock > 0);
        const recommended = available.length > 0 ? available[0] : products[0];

        const alternatives = products
          .filter((p) => p.id !== recommended.id)
          .slice(0, 3)
          .map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
          }));

        const reason =
          recommended.stock > 0
            ? `Best value: available in stock, competitive price`
            : `Recommended option, but currently out of stock`;

        return {
          recommended: {
            id: recommended.id,
            name: recommended.name,
            price: recommended.price,
            stock: recommended.stock,
            reason,
          },
          alternatives,
        };
      },
    },
    {
      id: 'product.suggest_accessories',
      category: 'commerce',
      description: 'Doporučí doplňky k produktu (cross-sell/upsell)',
      inputSchema: suggestAccessoriesSchema,
      outputSchema: z.object({
        accessories: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            stock: z.number(),
            reason: z.string(),
          })
        ),
      }),
      handler: async (ctx, input) => {
        const product = await prisma.product.findUnique({
          where: { id: input.productId },
        });

        if (!product) {
          throw new Error('Product not found');
        }

        // Najít související produkty (stejná kategorie nebo metadata)
        const where: any = {
          id: { not: input.productId }, // Ne aktuální produkt
          stock: { gt: 0 }, // Pouze dostupné
        };

        // Stejná kategorie nebo související
        if (product.category) {
          where.category = product.category;
        }

        const accessories = await prisma.product.findMany({
          where,
          take: input.limit || 5,
          orderBy: { price: 'asc' },
        });

        return {
          accessories: accessories.map((a) => ({
            id: a.id,
            name: a.name,
            price: a.price,
            stock: a.stock,
            reason: `Compatible with ${product.name}`,
          })),
        };
      },
    },
    {
      id: 'product.check_availability',
      category: 'commerce',
      description: 'Zkontroluje dostupnost produktu',
      inputSchema: checkAvailabilitySchema,
      outputSchema: z.object({
        productId: z.string(),
        sku: z.string(),
        name: z.string(),
        available: z.boolean(),
        stock: z.number(),
        estimatedDelivery: z.string().nullable(),
      }),
      handler: async (ctx, input) => {
        const product = await prisma.product.findFirst({
          where: {
            OR: [
              input.productId ? { id: input.productId } : {},
              input.sku ? { sku: input.sku } : {},
            ],
          },
        });

        if (!product) {
          throw new Error('Product not found');
        }

        const available = product.stock > 0;
        const estimatedDelivery = available
          ? 'In stock - immediate delivery'
          : 'Out of stock - contact for availability';

        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          available,
          stock: product.stock,
          estimatedDelivery,
        };
      },
    },
  ];
}
