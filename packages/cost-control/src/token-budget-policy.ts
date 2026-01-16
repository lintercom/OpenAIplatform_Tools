/**
 * Token Budget Policy
 * 
 * Centrální kontrola token budgetu s pre-flight kontrolou a reakcemi při překročení
 */

import { PrismaClient } from '@prisma/client';
import {
  BudgetContext,
  BudgetDecision,
  TokenUsage,
  TokenEstimate,
  ModelConfig,
} from './types';

export interface TokenBudgetPolicyConfig {
  // Default budget limits
  defaultSessionBudget?: number; // tokens per session
  defaultWorkflowBudget?: number; // tokens per workflow
  defaultToolBudget?: number; // tokens per tool
  defaultDailyBudget?: number; // tokens per day per tenant

  // Budget enforcement
  enforceBudget: boolean;
  onBudgetExceeded: 'downgrade' | 'truncate' | 'fallback' | 'reject';
}

/**
 * Token Budget Policy
 * 
 * Kontroluje token budget před voláním LLM a reaguje na překročení
 */
export class TokenBudgetPolicy {
  constructor(
    private prisma: PrismaClient,
    private config: TokenBudgetPolicyConfig
  ) {}

  /**
   * Odhadne počet tokenů pro zprávy a model
   * 
   * Zjednodušený odhad: ~4 znaky = 1 token (pro angličtinu)
   * V produkci by se použila knihovna jako tiktoken
   */
  estimateTokens(
    messages: Array<{ role: string; content: string }>,
    model: string
  ): TokenEstimate {
    // Zjednodušený odhad: 4 znaky = 1 token
    const inputText = messages.map((m) => m.content).join('\n');
    const inputTokens = Math.ceil(inputText.length / 4);

    // Odhad output tokens (závisí na modelu a úloze)
    // Pro jednoduchost: 20% input tokens, min 100, max 2000
    const outputTokens = Math.max(
      100,
      Math.min(2000, Math.ceil(inputTokens * 0.2))
    );

    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      confidence: 'medium', // V produkci by se použil přesnější odhad
    };
  }

  /**
   * Zkontroluje budget a vrátí rozhodnutí
   */
  async checkBudget(
    context: BudgetContext,
    estimatedTokens: number,
    modelConfig: ModelConfig
  ): Promise<BudgetDecision> {
    if (!this.config.enforceBudget) {
      return { allowed: true };
    }

    // Získat nebo vytvořit budget záznam
    const budget = await this.getOrCreateBudget(context);

    // Kontrola budgetu
    const remaining = budget.budgetLimit - budget.tokensUsed;
    if (remaining >= estimatedTokens) {
      return { allowed: true };
    }

    // Budget překročen - rozhodnout o akci
    const action = this.config.onBudgetExceeded;

    if (action === 'reject') {
      return {
        allowed: false,
        reason: `Budget exceeded. Remaining: ${remaining}, required: ${estimatedTokens}`,
        action: 'reject',
      };
    }

    if (action === 'downgrade' && modelConfig.fallbackModel) {
      // Zkusit s levnějším modelem
      const downgradedEstimate = this.estimateTokens(
        context as any,
        modelConfig.fallbackModel
      );

      if (remaining >= downgradedEstimate.totalTokens) {
        return {
          allowed: true,
          reason: 'Downgrading to cheaper model due to budget',
          action: 'downgrade_model',
          suggestedModel: modelConfig.fallbackModel,
        };
      }
    }

    if (action === 'truncate') {
      // Zkrátit kontext
      const maxTokens = Math.floor(remaining * 0.8); // 80% zbytků pro input
      return {
        allowed: true,
        reason: 'Truncating context due to budget',
        action: 'truncate_context',
        maxTokens,
      };
    }

    // Fallback
    return {
      allowed: false,
      reason: 'Budget exceeded, using fallback response',
      action: 'fallback',
    };
  }

  /**
   * Zaznamená použití tokenů
   */
  async recordUsage(
    context: BudgetContext,
    usage: TokenUsage
  ): Promise<void> {
    const budget = await this.getOrCreateBudget(context);

    await this.prisma.tokenBudget.update({
      where: { id: budget.id },
      data: {
        tokensUsed: {
          increment: usage.totalTokens,
        },
      },
    });
  }

  /**
   * Získá nebo vytvoří budget záznam
   */
  private async getOrCreateBudget(context: BudgetContext) {
    const where: any = {};

    if (context.sessionId && context.period === 'session') {
      where.sessionId = context.sessionId;
      where.period = 'session';
    } else if (context.workflowId && context.period === 'workflow') {
      where.workflowId = context.workflowId;
      where.period = 'workflow';
    } else if (context.toolId && context.period === 'tool') {
      where.toolId = context.toolId;
      where.period = 'tool';
    } else if (context.tenantId && context.period === 'daily') {
      where.tenantId = context.tenantId;
      where.period = 'daily';
      // Reset daily budget - zkontrolovat, zda je dnes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.createdAt = { gte: today };
    }

    let budget = await this.prisma.tokenBudget.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (!budget) {
      // Vytvořit nový budget
      const budgetLimit =
        context.period === 'session'
          ? this.config.defaultSessionBudget || 10000
          : context.period === 'workflow'
          ? this.config.defaultWorkflowBudget || 5000
          : context.period === 'tool'
          ? this.config.defaultToolBudget || 2000
          : this.config.defaultDailyBudget || 100000;

      budget = await this.prisma.tokenBudget.create({
        data: {
          sessionId: context.sessionId || null,
          workflowId: context.workflowId || null,
          toolId: context.toolId || null,
          tenantId: context.tenantId || null,
          role: context.role || null,
          budgetLimit,
          tokensUsed: 0,
          period: context.period || 'session',
        },
      });
    }

    return budget;
  }

  /**
   * Získá aktuální stav budgetu
   */
  async getBudgetStatus(context: BudgetContext): Promise<{
    budgetLimit: number;
    tokensUsed: number;
    remaining: number;
    percentage: number;
  }> {
    const budget = await this.getOrCreateBudget(context);

    return {
      budgetLimit: budget.budgetLimit,
      tokensUsed: budget.tokensUsed,
      remaining: budget.budgetLimit - budget.tokensUsed,
      percentage: (budget.tokensUsed / budget.budgetLimit) * 100,
    };
  }
}
