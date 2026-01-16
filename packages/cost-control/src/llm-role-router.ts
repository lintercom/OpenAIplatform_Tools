/**
 * LLM Role Router
 * 
 * Role-based model routing pro optimalizaci nákladů
 */

import OpenAI from 'openai';
import {
  LLMRole,
  ModelConfig,
  RoleModelMapping,
  LLMRequest,
  LLMResponse,
  DEFAULT_ROLE_MODEL_MAPPING,
  MODEL_PRICING,
  TokenUsage,
} from './types';
import { TokenBudgetPolicy } from './token-budget-policy';
import { ContextCache } from './context-cache';
import { FallbackResponseTool } from './fallback-response-tool';

export interface LLMRoleRouterConfig {
  roleModelMapping?: RoleModelMapping;
  openaiClient: OpenAI;
  tokenBudgetPolicy: TokenBudgetPolicy;
  contextCache?: ContextCache;
  fallbackResponseTool: FallbackResponseTool;
}

/**
 * LLM Role Router
 * 
 * Směruje různé typy úloh na různé modely podle role
 */
export class LLMRoleRouter {
  private roleModelMapping: RoleModelMapping;

  constructor(private config: LLMRoleRouterConfig) {
    this.roleModelMapping =
      config.roleModelMapping || DEFAULT_ROLE_MODEL_MAPPING;
  }

  /**
   * Získá model konfiguraci pro roli
   */
  getModelConfig(role: LLMRole): ModelConfig {
    return (
      this.roleModelMapping[role] ||
      this.roleModelMapping.general || {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
      }
    );
  }

  /**
   * Volá LLM s role-based routing
   */
  async callLLM(request: LLMRequest): Promise<LLMResponse> {
    const { role, messages, options, context } = request;

    // 1. Získat model konfiguraci
    let modelConfig = this.getModelConfig(role);

    // 2. Zkontrolovat cache
    if (this.config.contextCache) {
      const cacheKey = this.generateCacheKey(role, messages);
      const cached = await this.config.contextCache.get(cacheKey);

      if (cached) {
        return {
          ...cached.response,
          cached: true,
        };
      }
    }

    // 3. Odhadnout tokeny
    const tokenEstimate = this.config.tokenBudgetPolicy.estimateTokens(
      messages,
      modelConfig.model
    );

    // 4. Zkontrolovat budget
    const budgetDecision = await this.config.tokenBudgetPolicy.checkBudget(
      context || {},
      tokenEstimate.totalTokens,
      modelConfig
    );

    if (!budgetDecision.allowed) {
      // Budget překročen - použít fallback
      const fallback = await this.config.fallbackResponseTool.getFallback(
        'budget_exceeded',
        {
          scenario: 'budget_exceeded',
          originalRequest: request,
          budgetContext: context,
        }
      );

      return {
        content: fallback.content,
        model: 'fallback',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        costUSD: 0,
        fallback: true,
        metadata: {
          reason: budgetDecision.reason,
          scenario: 'budget_exceeded',
        },
      };
    }

    // 5. Upravit model pokud bylo rozhodnuto o downgrade
    if (budgetDecision.action === 'downgrade_model' && budgetDecision.suggestedModel) {
      modelConfig = {
        ...modelConfig,
        model: budgetDecision.suggestedModel,
      };
    }

    // 6. Zkrátit kontext pokud bylo rozhodnuto
    let finalMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = messages as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    if (budgetDecision.action === 'truncate_context' && budgetDecision.maxTokens) {
      finalMessages = this.truncateMessages(messages, budgetDecision.maxTokens) as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    }

    // 7. Volat LLM
    try {
      const response = await this.config.openaiClient.chat.completions.create({
        model: modelConfig.model,
        temperature: options?.temperature || modelConfig.temperature || 0.7,
        max_tokens: options?.maxTokens || modelConfig.maxTokens,
        messages: finalMessages as any,
        tools: options?.tools as any,
        tool_choice: options?.toolChoice as any,
      });

      const usage = response.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const tokenUsage: TokenUsage = {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      };

      // 8. Zaznamenat použití
      if (context) {
        await this.config.tokenBudgetPolicy.recordUsage(context, tokenUsage);
      }

      // 9. Vypočítat cost
      const pricing = MODEL_PRICING[modelConfig.model] || MODEL_PRICING['gpt-4-turbo-preview'];
      const costUSD =
        (tokenUsage.inputTokens / 1000) * pricing.input +
        (tokenUsage.outputTokens / 1000) * pricing.output;

      const llmResponse: LLMResponse = {
        content: response.choices[0]?.message?.content || '',
        model: modelConfig.model,
        usage: tokenUsage,
        costUSD,
        metadata: {
          responseId: response.id,
          model: modelConfig.model,
          budgetDecision: budgetDecision.action,
        },
      };

      // 10. Uložit do cache
      if (this.config.contextCache) {
        const cacheKey = this.generateCacheKey(role, messages);
        await this.config.contextCache.set(cacheKey, {
          response: llmResponse,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hodin
          hitCount: 0,
        });
      }

      return llmResponse;
    } catch (error) {
      // LLM selhal - použít fallback
      const fallback = await this.config.fallbackResponseTool.getFallback(
        this.getFallbackScenario(error),
        {
          scenario: this.getFallbackScenario(error),
          originalRequest: request,
          error: error instanceof Error ? error : new Error(String(error)),
          budgetContext: context,
        }
      );

      return {
        content: fallback.content,
        model: 'fallback',
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        costUSD: 0,
        fallback: true,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          scenario: this.getFallbackScenario(error),
        },
      };
    }
  }

  /**
   * Generuje cache key z role a messages
   */
  private generateCacheKey(
    role: LLMRole,
    messages: Array<{ role: string; content: string }>
  ): string {
    const content = JSON.stringify({ role, messages });
    // Jednoduchý hash (v produkci by se použil crypto.createHash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${role}_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Zkrátí messages aby se vešly do token limitu
   */
  private truncateMessages(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Array<{ role: string; content: string }> {
    // Zachovat system message, zkrátit user messages
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    let totalTokens = 0;
    const truncated: Array<{ role: string; content: string }> = [...systemMessages];

    // Odhadnout tokeny pro system messages
    const systemText = systemMessages.map((m) => m.content).join('\n');
    totalTokens += Math.ceil(systemText.length / 4);

    // Přidat ostatní messages dokud se vejdou
    for (const msg of otherMessages) {
      const msgTokens = Math.ceil(msg.content.length / 4);
      if (totalTokens + msgTokens > maxTokens) {
        // Zkrátit poslední message
        const remaining = maxTokens - totalTokens;
        const truncatedContent = msg.content.substring(0, remaining * 4);
        truncated.push({ ...msg, content: truncatedContent + '...' });
        break;
      }
      truncated.push(msg);
      totalTokens += msgTokens;
    }

    return truncated;
  }

  /**
   * Určí fallback scenario z erroru
   */
  private getFallbackScenario(error: unknown): 'model_error' | 'timeout' | 'rate_limit' | 'unknown_error' {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout')) return 'timeout';
      if (message.includes('rate limit')) return 'rate_limit';
      if (message.includes('model')) return 'model_error';
    }
    return 'unknown_error';
  }
}
