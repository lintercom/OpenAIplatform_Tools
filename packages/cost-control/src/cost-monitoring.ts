/**
 * Cost Monitoring
 * 
 * Sledování a reporting nákladů na LLM
 */

import { PrismaClient } from '@prisma/client';
import {
  CostRecord,
  CostFilters,
  CostReport,
  DashboardData,
} from './types';

export interface CostMonitoringConfig {
  // Agregace period
  aggregationPeriods?: ('day' | 'week' | 'month')[];
}

/**
 * Cost Monitoring
 * 
 * Sleduje a reportuje náklady na LLM
 */
export class CostMonitoring {
  constructor(
    private prisma: PrismaClient,
    private config: CostMonitoringConfig = {}
  ) {}

  /**
   * Zaznamená cost záznam
   */
  async recordCost(cost: CostRecord): Promise<void> {
    await this.prisma.costRecord.create({
      data: {
        sessionId: cost.sessionId || null,
        workflowId: cost.workflowId || null,
        toolId: cost.toolId || null,
        role: cost.role || null,
        tenantId: cost.tenantId || null,
        model: cost.model,
        inputTokens: cost.usage.inputTokens,
        outputTokens: cost.usage.outputTokens,
        totalTokens: cost.usage.totalTokens,
        costUSD: cost.costUSD,
        metadata: cost.metadata as any,
      },
    });
  }

  /**
   * Získá cost report podle filtrů
   */
  async getCosts(filters: CostFilters): Promise<CostReport> {
    const where: any = {};

    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.workflowId) where.workflowId = filters.workflowId;
    if (filters.toolId) where.toolId = filters.toolId;
    if (filters.role) where.role = filters.role;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const records = await this.prisma.costRecord.findMany({
      where,
    });

    // Agregace
    const totalCost = records.reduce((sum: number, r: typeof records[0]) => sum + r.costUSD, 0);
    const totalTokens = records.reduce((sum: number, r: typeof records[0]) => sum + r.totalTokens, 0);
    const requestCount = records.length;

    // Cache hit rate (z metadata)
    const cachedCount = records.filter((r: typeof records[0]) => (r.metadata as Record<string, unknown>)?.cached).length;
    const cacheHitRate = requestCount > 0 ? cachedCount / requestCount : 0;

    // Fallback rate
    const fallbackCount = records.filter((r: typeof records[0]) => (r.metadata as Record<string, unknown>)?.fallback).length;
    const fallbackRate = requestCount > 0 ? fallbackCount / requestCount : 0;

    // Breakdown by role
    const byRole: Record<string, { cost: number; tokens: number; requests: number }> = {};
    for (const record of records) {
      const role = record.role || 'unknown';
      if (!byRole[role]) {
        byRole[role] = { cost: 0, tokens: 0, requests: 0 };
      }
      byRole[role].cost += record.costUSD;
      byRole[role].tokens += record.totalTokens;
      byRole[role].requests += 1;
    }

    // Breakdown by model
    const byModel: Record<string, { cost: number; tokens: number; requests: number }> = {};
    for (const record of records) {
      if (!byModel[record.model]) {
        byModel[record.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      byModel[record.model].cost += record.costUSD;
      byModel[record.model].tokens += record.totalTokens;
      byModel[record.model].requests += 1;
    }

    // Breakdown by tool
    const byTool: Record<string, { cost: number; tokens: number; requests: number }> = {};
    for (const record of records) {
      const tool = record.toolId || 'unknown';
      if (!byTool[tool]) {
        byTool[tool] = { cost: 0, tokens: 0, requests: 0 };
      }
      byTool[tool].cost += record.costUSD;
      byTool[tool].tokens += record.totalTokens;
      byTool[tool].requests += 1;
    }

    return {
      totalCost,
      totalTokens,
      requestCount,
      cacheHitRate,
      fallbackRate,
      breakdown: {
        byRole,
        byModel,
        byTool,
      },
      period: {
        start: filters.startDate || new Date(0),
        end: filters.endDate || new Date(),
      },
    };
  }

  /**
   * Získá dashboard data pro period
   */
  async getDashboard(period: 'day' | 'week' | 'month'): Promise<DashboardData> {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
    }

    const report = await this.getCosts({
      startDate: start,
      endDate: now,
    });

    // Trends (denní agregace)
    const trends: Array<{ date: string; cost: number; tokens: number; requests: number }> = [];
    const records = await this.prisma.costRecord.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: now,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Agregace po dnech
    const dailyMap = new Map<string, { cost: number; tokens: number; requests: number }>();
    for (const record of records) {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { cost: 0, tokens: 0, requests: 0 });
      }
      const day = dailyMap.get(date)!;
      day.cost += record.costUSD;
      day.tokens += record.totalTokens;
      day.requests += 1;
    }

    for (const [date, data] of dailyMap.entries()) {
      trends.push({
        date,
        ...data,
      });
    }

    // Top consumers
    const topConsumers: Array<{
      type: 'role' | 'tool' | 'workflow';
      name: string;
      cost: number;
      tokens: number;
      requests: number;
    }> = [];

    // Top roles
    for (const [role, data] of Object.entries(report.breakdown.byRole)) {
      topConsumers.push({
        type: 'role',
        name: role,
        ...data,
      });
    }

    // Top tools
    for (const [tool, data] of Object.entries(report.breakdown.byTool)) {
      topConsumers.push({
        type: 'tool',
        name: tool,
        ...data,
      });
    }

    // Seřadit podle cost
    topConsumers.sort((a, b) => b.cost - a.cost);

    return {
      summary: {
        totalCost: report.totalCost,
        totalTokens: report.totalTokens,
        averageCostPerRequest:
          report.requestCount > 0 ? report.totalCost / report.requestCount : 0,
        cacheHitRate: report.cacheHitRate,
        fallbackRate: report.fallbackRate,
      },
      trends,
      topConsumers: topConsumers.slice(0, 10),
    };
  }
}
