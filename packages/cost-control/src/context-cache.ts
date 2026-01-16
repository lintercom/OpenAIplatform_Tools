/**
 * Context Cache
 * 
 * Cache layer pro opakované LLM dotazy
 */

import { PrismaClient } from '@prisma/client';
import { CachedResponse, LLMRole } from './types';

export interface ContextCacheConfig {
  defaultTTL?: number; // seconds, default 24 hours
  maxCacheSize?: number; // max entries, default 10000
}

/**
 * Context Cache
 * 
 * Ukládá a načítá cached LLM responses
 */
export class ContextCache {
  constructor(
    private prisma: PrismaClient,
    private config: ContextCacheConfig = {}
  ) {}

  /**
   * Získá cached response
   */
  async get(cacheKey: string): Promise<CachedResponse | null> {
    const cached = await this.prisma.contextCache.findUnique({
      where: { cacheKey },
    });

    if (!cached) {
      return null;
    }

    // Kontrola expirace
    if (new Date(cached.expiresAt) < new Date()) {
      // Expired - smazat
      await this.prisma.contextCache.delete({
        where: { cacheKey },
      });
      return null;
    }

    // Zvýšit hit count
    await this.prisma.contextCache.update({
      where: { cacheKey },
      data: {
        hitCount: { increment: 1 },
      },
    });

    return {
      response: cached.response as any,
      expiresAt: cached.expiresAt,
      hitCount: cached.hitCount,
    };
  }

  /**
   * Uloží response do cache
   */
  async set(
    cacheKey: string,
    cached: CachedResponse,
    ttl?: number
  ): Promise<void> {
    const expiresAt = ttl
      ? new Date(Date.now() + ttl * 1000)
      : cached.expiresAt;

    await this.prisma.contextCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        role: null, // Může být doplněno z kontextu
        model: cached.response.model,
        inputHash: cacheKey, // Zjednodušené
        response: cached.response as any,
        hitCount: 0,
        expiresAt,
      },
      update: {
        response: cached.response as any,
        expiresAt,
        updatedAt: new Date(),
      },
    });

    // Vyčistit expired entries (volitelné - může běžet jako cron job)
    await this.cleanupExpired();
  }

  /**
   * Invaliduje cache podle patternu
   */
  async invalidate(pattern: string): Promise<void> {
    // Zjednodušená verze - v produkci by se použil regex nebo glob
    await this.prisma.contextCache.deleteMany({
      where: {
        cacheKey: { contains: pattern },
      },
    });
  }

  /**
   * Invaliduje cache pro roli
   */
  async invalidateByRole(role: LLMRole): Promise<void> {
    await this.prisma.contextCache.deleteMany({
      where: { role },
    });
  }

  /**
   * Vyčistí expired entries
   */
  private async cleanupExpired(): Promise<void> {
    await this.prisma.contextCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * Získá cache statistiky
   */
  async getStats(): Promise<{
    totalEntries: number;
    hitRate: number;
    expiredEntries: number;
  }> {
    const total = await this.prisma.contextCache.count();
    const expired = await this.prisma.contextCache.count({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Hit rate by se počítal z hitCount / total requests
    // Pro teď vracíme 0 (bylo by potřeba trackovat requests)
    return {
      totalEntries: total,
      hitRate: 0,
      expiredEntries: expired,
    };
  }
}
