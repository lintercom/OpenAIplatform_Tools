import { z } from 'zod';
import { ToolDefinition } from '@ai-toolkit/core';
import { StorageAdapter } from '@ai-toolkit/adapters';

const searchSchema = z.object({
  domain: z.string(),
  query: z.string(),
});

const fetchSchema = z.object({
  domain: z.string(),
  path: z.string(),
});

const extractSchema = z.object({
  domain: z.string(),
  url: z.string(),
  selector: z.string().optional(),
});

const compareSchema = z.object({
  domain: z.string(),
  url1: z.string(),
  url2: z.string(),
  field: z.string().optional(),
});

export function createVerifyTools(storageAdapter: StorageAdapter): ToolDefinition[] {
  return [
    {
      id: 'verify.search',
      category: 'verify',
      description: 'Vyhledá informace na whitelisted doméně',
      inputSchema: searchSchema,
      outputSchema: z.object({
        results: z.array(z.string()),
        cached: z.boolean(),
      }),
      policy: {
        domainWhitelist: ['example.com', 'trusted-domain.com'], // V produkci z konfigurace
        rateLimit: {
          maxCalls: 10,
          windowMs: 60000, // 1 minuta
          scope: 'session',
        },
      },
      handler: async (ctx, input) => {
        // Kontrola whitelist je v policy engine
        const cacheKey = `verify:search:${input.domain}:${input.query}`;
        const cached = await storageAdapter.get(cacheKey);
        if (cached) {
          return {
            results: cached.results,
            cached: true,
          };
        }

        // Mock: v produkci by se skutečně vyhledávalo
        const results = [`Result 1 for "${input.query}" on ${input.domain}`, `Result 2 for "${input.query}"`];
        await storageAdapter.set(cacheKey, { results }, 3600); // Cache 1 hodinu

        return {
          results,
          cached: false,
        };
      },
    },
    {
      id: 'verify.fetch',
      category: 'verify',
      description: 'Načte obsah z whitelisted domény',
      inputSchema: fetchSchema,
      outputSchema: z.object({
        content: z.string(),
        cached: z.boolean(),
      }),
      policy: {
        domainWhitelist: ['example.com', 'trusted-domain.com'],
        rateLimit: {
          maxCalls: 5,
          windowMs: 60000,
          scope: 'session',
        },
      },
      handler: async (ctx, input) => {
        const cacheKey = `verify:fetch:${input.domain}:${input.path}`;
        const cached = await storageAdapter.get(cacheKey);
        if (cached) {
          return {
            content: cached.content,
            cached: true,
          };
        }

        // Mock: v produkci by se skutečně načítalo
        const content = `Mock content from ${input.domain}${input.path}`;
        await storageAdapter.set(cacheKey, { content }, 1800); // Cache 30 min

        return {
          content,
          cached: false,
        };
      },
    },
    {
      id: 'verify.extract',
      category: 'verify',
      description: 'Extrahuje data z URL na whitelisted doméně',
      inputSchema: extractSchema,
      outputSchema: z.object({
        extracted: z.record(z.any()),
      }),
      policy: {
        domainWhitelist: ['example.com', 'trusted-domain.com'],
        rateLimit: {
          maxCalls: 5,
          windowMs: 60000,
          scope: 'session',
        },
      },
      handler: async (ctx, input) => {
        // Mock: v produkci by se skutečně extrahovalo
        const extracted = {
          title: `Extracted from ${input.url}`,
          content: 'Mock extracted content',
          timestamp: new Date().toISOString(),
        };

        return { extracted };
      },
    },
    {
      id: 'verify.compare',
      category: 'verify',
      description: 'Porovná data ze dvou URL na whitelisted doméně',
      inputSchema: compareSchema,
      outputSchema: z.object({
        match: z.boolean(),
        differences: z.array(z.string()),
      }),
      policy: {
        domainWhitelist: ['example.com', 'trusted-domain.com'],
        rateLimit: {
          maxCalls: 3,
          windowMs: 60000,
          scope: 'session',
        },
      },
      handler: async (ctx, input) => {
        // Mock: v produkci by se skutečně porovnávalo
        const match = Math.random() > 0.5; // Mock random
        const differences = match ? [] : ['Field 1 differs', 'Field 2 differs'];

        return {
          match,
          differences,
        };
      },
    },
  ];
}
