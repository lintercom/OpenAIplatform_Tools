import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { ToolRegistry, ToolContext, OpenAIClientFactory, APIKeyManager } from '@ai-toolkit/core';
import {
  LLMRoleRouter,
  TokenBudgetPolicy,
  ContextCache,
  FallbackResponseTool,
  CostMonitoring,
  LLMRole,
  type TokenBudgetPolicyConfig,
  type ContextCacheConfig,
  type FallbackResponseConfig,
} from '@ai-toolkit/cost-control';
import { WorkflowContext, WorkflowResult, UIDirective, UIDirectiveSchema } from './types';

export interface WorkflowRunnerConfig {
  // Legacy: pro backward compatibility
  openaiApiKey?: string;
  // Nové: per-tenant API key management
  apiKeyManager?: APIKeyManager;
  openaiClientFactory?: OpenAIClientFactory;
  // Tenant context
  defaultTenantId?: string;
  model?: string;
  temperature?: number;
  // Cost Control
  tokenBudgetConfig?: TokenBudgetPolicyConfig;
  contextCacheConfig?: ContextCacheConfig;
  fallbackConfig?: FallbackResponseConfig;
  enableCostControl?: boolean; // Default: true
}

export class WorkflowRunner {
  private openaiClientFactory: OpenAIClientFactory | null = null;
  private fallbackOpenai: OpenAI | null = null;
  private llmRoleRouter: LLMRoleRouter | null = null;
  private costMonitoring: CostMonitoring | null = null;

  constructor(
    private config: WorkflowRunnerConfig,
    private registry: ToolRegistry,
    private prisma: PrismaClient
  ) {
    // Pokud je poskytnut apiKeyManager, použij factory
    if (config.apiKeyManager) {
      this.openaiClientFactory = new OpenAIClientFactory(config.apiKeyManager);
    } else if (config.openaiClientFactory) {
      this.openaiClientFactory = config.openaiClientFactory;
    }

    // Fallback: pokud je poskytnut openaiApiKey, vytvoř klienta synchronně
    if (config.openaiApiKey) {
      this.fallbackOpenai = new OpenAI({ apiKey: config.openaiApiKey });
    }

    // Cost Control setup (pokud je povoleno)
    if (config.enableCostControl !== false) {
      this.setupCostControl();
    }

    // Cost Monitoring (vždy aktivní pro tracking)
    this.costMonitoring = new CostMonitoring(prisma);
  }

  /**
   * Nastaví Cost Control vrstvu
   */
  private setupCostControl(): void {
    // Token Budget Policy
    const tokenBudgetPolicy = new TokenBudgetPolicy(this.prisma, {
      defaultSessionBudget: 10000,
      defaultWorkflowBudget: 5000,
      defaultToolBudget: 2000,
      defaultDailyBudget: 100000,
      enforceBudget: true,
      onBudgetExceeded: 'downgrade',
      ...this.config.tokenBudgetConfig,
    });

    // Context Cache
    const contextCache = new ContextCache(this.prisma, {
      defaultTTL: 24 * 60 * 60, // 24 hodin
      maxCacheSize: 10000,
      ...this.config.contextCacheConfig,
    });

    // Fallback Response Tool
    const fallbackResponseTool = new FallbackResponseTool({
      enableRuleBased: true,
      ...this.config.fallbackConfig,
    });

    // LLM Role Router (bude inicializován při prvním použití)
    // Potřebujeme OpenAI klienta, který získáme asynchronně
    this.llmRoleRouter = null; // Bude nastaven v getLLMRoleRouter()
  }

  /**
   * Získá nebo vytvoří LLM Role Router
   */
  private async getLLMRoleRouter(context: WorkflowContext): Promise<LLMRoleRouter> {
    if (this.llmRoleRouter) {
      return this.llmRoleRouter;
    }

    // Získat OpenAI klienta
    const openai = await this.getOpenAIClient(context);

    // Token Budget Policy
    const tokenBudgetPolicy = new TokenBudgetPolicy(this.prisma, {
      defaultSessionBudget: 10000,
      defaultWorkflowBudget: 5000,
      defaultToolBudget: 2000,
      defaultDailyBudget: 100000,
      enforceBudget: true,
      onBudgetExceeded: 'downgrade',
      ...this.config.tokenBudgetConfig,
    });

    // Context Cache
    const contextCache = new ContextCache(this.prisma, {
      defaultTTL: 24 * 60 * 60,
      maxCacheSize: 10000,
      ...this.config.contextCacheConfig,
    });

    // Fallback Response Tool
    const fallbackResponseTool = new FallbackResponseTool({
      enableRuleBased: true,
      ...this.config.fallbackConfig,
    });

    // Vytvořit router
    this.llmRoleRouter = new LLMRoleRouter({
      openaiClient: openai,
      tokenBudgetPolicy,
      contextCache,
      fallbackResponseTool,
    });

    return this.llmRoleRouter;
  }

  /**
   * Získá OpenAI klienta pro daný context
   */
  private async getOpenAIClient(context: WorkflowContext): Promise<OpenAI> {
    // Pokud máme factory, použij per-tenant API key
    if (this.openaiClientFactory) {
      const tenantId = context.tenantId || this.config.defaultTenantId;
      return await this.openaiClientFactory.createClient({
        tenantId,
        fallbackApiKey: this.config.openaiApiKey,
        model: this.config.model,
      });
    }

    // Fallback na synchronní klienta
    if (this.fallbackOpenai) {
      return this.fallbackOpenai;
    }

    throw new Error(
      'OpenAI client not configured. Provide either apiKeyManager, openaiClientFactory, or openaiApiKey.'
    );
  }

  /**
   * Spustí workflow pomocí OpenAI Responses API s tool calling
   */
  async runWorkflow(
    workflowId: string,
    context: WorkflowContext,
    userMessage: string,
    systemPrompt?: string
  ): Promise<WorkflowResult> {
    const startedAt = new Date();
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Vytvoření workflow run záznamu
      const workflowRun = await this.prisma.workflowRun.create({
        data: {
          id: runId,
          workflowId,
          sessionId: context.sessionId,
          leadId: context.leadId,
          status: 'running',
          input: context as any,
        },
      });

      // Příprava tools pro OpenAI
      const tools = this.registry.getOpenAITools();

      // System prompt
      const systemContent = systemPrompt || this.getDefaultSystemPrompt(workflowId);

      // Určit LLM roli podle workflow
      const role: LLMRole = this.getRoleForWorkflow(workflowId);

      // Použít Cost Control vrstvu (pokud je povolena)
      if (this.config.enableCostControl !== false && this.llmRoleRouter) {
        const router = await this.getLLMRoleRouter(context);
        
        const llmResponse = await router.callLLM({
          role,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userMessage },
          ],
          options: {
            temperature: this.config.temperature || 0.7,
            tools: tools.length > 0 ? tools : undefined,
            toolChoice: tools.length > 0 ? 'auto' : undefined,
          },
          context: {
            sessionId: context.sessionId,
            workflowId,
            tenantId: context.tenantId,
            role,
            period: 'workflow',
          },
        });

        // Zaznamenat cost
        if (this.costMonitoring && !llmResponse.cached) {
          await this.costMonitoring.recordCost({
            sessionId: context.sessionId,
            workflowId,
            tenantId: context.tenantId,
            role,
            model: llmResponse.model,
            usage: llmResponse.usage,
            costUSD: llmResponse.costUSD,
            cached: llmResponse.cached,
            fallback: llmResponse.fallback,
            metadata: llmResponse.metadata,
          });
        }

        // Pokud je fallback, použít fallback content
        if (llmResponse.fallback) {
          finalOutput = this.parseFallbackResponse(llmResponse.content);
        } else {
          // Parsovat normální response
          try {
            const parsed = JSON.parse(llmResponse.content);
            finalOutput = UIDirectiveSchema.parse(parsed);
          } catch (e) {
            finalOutput = {
              assistant_message: llmResponse.content,
              ui_directives: { show_blocks: [], hide_blocks: [] },
            };
          }
        }

        // Tool calls - pokud byly v response (pro teď přeskočíme, v produkci by se zpracovaly)
        // V produkci by se tool calls zpracovaly z metadata nebo z OpenAI response
      } else {
        // Legacy: přímé volání OpenAI (bez Cost Control)
        const openai = await this.getOpenAIClient(context);

        const response = await openai.chat.completions.create({
          model: this.config.model || 'gpt-4-turbo-preview',
          temperature: this.config.temperature || 0.7,
          messages: [
            { role: 'system', content: systemContent },
            { role: 'user', content: userMessage },
          ],
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
          response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(content);
            finalOutput = UIDirectiveSchema.parse(parsed);
          } catch (e) {
            finalOutput = {
              assistant_message: content,
              ui_directives: { show_blocks: [], hide_blocks: [] },
            };
          }
        }
      }

      // Zpracování tool calls (pokud byly v legacy response)
      // V Cost Control verzi se tool calls zpracují jinak (TODO)

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      // Aktualizace workflow run
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'completed',
          output: finalOutput as any,
          timings: {
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            duration,
          } as any,
        },
      });

      return {
        workflowId,
        runId,
        status: 'completed',
        output: finalOutput,
        traceRef: (finalOutput as any)?.metadata?.responseId || runId,
        timings: {
          startedAt,
          completedAt,
          duration,
        },
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: 'failed',
          error: errorMessage,
          timings: {
            startedAt: startedAt.toISOString(),
            completedAt: completedAt.toISOString(),
            duration: completedAt.getTime() - startedAt.getTime(),
          } as any,
        },
      });

      return {
        workflowId,
        runId,
        status: 'failed',
        error: errorMessage,
        timings: {
          startedAt,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
        },
      };
    }
  }

  /**
   * Spustí workflow se streamingem (server-sent events)
   */
  async *runWorkflowStream(
    workflowId: string,
    context: WorkflowContext,
    userMessage: string,
    systemPrompt?: string
  ): AsyncGenerator<string, void, unknown> {
    const tools = this.registry.getOpenAITools();
    const systemContent = systemPrompt || this.getDefaultSystemPrompt(workflowId);

    // Získání OpenAI klienta pro tento tenant
    const openai = await this.getOpenAIClient(context);

    const stream = await openai.chat.completions.create({
      model: this.config.model || 'gpt-4-turbo-preview',
      temperature: this.config.temperature || 0.7,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userMessage },
      ],
      tools: tools.length > 0 ? tools : undefined,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * Získá LLM roli pro workflow
   */
  private getRoleForWorkflow(workflowId: string): LLMRole {
    const roleMap: Record<string, LLMRole> = {
      router: 'routing',
      qualification: 'intent_detection',
      booking: 'general',
    };
    return roleMap[workflowId] || 'general';
  }

  /**
   * Parsuje fallback response
   */
  private parseFallbackResponse(content: string): UIDirective {
    try {
      const parsed = JSON.parse(content);
      return UIDirectiveSchema.parse(parsed);
    } catch (e) {
      return {
        assistant_message: content,
        ui_directives: {
          show_blocks: [],
          hide_blocks: [],
        },
      };
    }
  }

  /**
   * Výchozí system prompt podle workflow ID
   */
  private getDefaultSystemPrompt(workflowId: string): string {
    const prompts: Record<string, string> = {
      router: `Jsi AI asistent pro routing konverzací. Tvá role je analyzovat vstup uživatele a rozhodnout, jaký workflow by měl být spuštěn.
      Odpověz ve formátu JSON s UI directives:
      {
        "assistant_message": "Zpráva pro uživatele",
        "ui_directives": {
          "show_blocks": ["block1", "block2"],
          "hide_blocks": [],
          "cta": { "label": "Akce", "action": "next_workflow" }
        },
        "next_action": "qualification"
      }`,
      qualification: `Jsi AI asistent pro kvalifikaci leadů. Ptej se na relevantní otázky a shromažďuj informace.
      Odpověz ve formátu JSON s UI directives a lead_patch pro aktualizaci lead dat.`,
      booking: `Jsi AI asistent pro rezervace. Pomáhej uživatelům najít vhodný čas a službu.
      Odpověz ve formátu JSON s UI directives.`,
    };

    return prompts[workflowId] || `Jsi AI asistent. Odpověz ve formátu JSON s UI directives.`;
  }
}
