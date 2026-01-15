import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { ToolRegistry, ToolContext } from '@ai-toolkit/core';
import { WorkflowContext, WorkflowResult, UIDirective, UIDirectiveSchema } from './types';

export interface WorkflowRunnerConfig {
  openaiApiKey: string;
  model?: string;
  temperature?: number;
}

export class WorkflowRunner {
  private openai: OpenAI;

  constructor(
    private config: WorkflowRunnerConfig,
    private registry: ToolRegistry,
    private prisma: PrismaClient
  ) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
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

      // Volání OpenAI Responses API
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        temperature: this.config.temperature || 0.7,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userMessage },
        ],
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        response_format: { type: 'json_object' }, // Pro structured output
      });

      // Zpracování tool calls
      let finalOutput: any = null;
      const toolCalls = response.choices[0]?.message?.tool_calls || [];

      for (const toolCall of toolCalls) {
        if (toolCall.type === 'function') {
          // Convert OpenAI function name back to tool ID (underscore -> dot)
          const toolId = this.registry.openAINameToToolId(toolCall.function.name);
          const args = JSON.parse(toolCall.function.arguments || '{}');

          const toolContext: ToolContext = {
            sessionId: context.sessionId,
            leadId: context.leadId,
            userId: context.userId,
            metadata: context.metadata,
          };

          const result = await this.registry.invokeTool(toolId, toolContext, args);
          // V produkci by se výsledky tool calls přidaly zpět do konverzace
          console.log(`[Workflow] Tool ${toolId} result:`, result.success ? 'success' : result.error);
        }
      }

      // Parsování final output (očekáváme JSON s UI directives)
      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          finalOutput = UIDirectiveSchema.parse(parsed);
        } catch (e) {
          // Pokud není JSON, použijeme jako plain text
          finalOutput = {
            assistant_message: content,
            ui_directives: {
              show_blocks: [],
              hide_blocks: [],
            },
          };
        }
      }

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
        traceRef: response.id,
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

    const stream = await this.openai.chat.completions.create({
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
