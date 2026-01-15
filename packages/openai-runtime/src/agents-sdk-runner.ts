/**
 * Integrace s OpenAI Agents SDK
 * 
 * Tento soubor poskytuje wrapper pro použití OpenAI Agents SDK
 * s naším Tool Registry systémem.
 * 
 * Viz: https://openai.github.io/openai-agents-js/
 */

import { Agent, run, tool as agentsTool } from '@openai/agents';
import { z } from 'zod';
import { ToolRegistry, ToolContext } from '@ai-toolkit/core';
import { WorkflowContext, WorkflowResult, UIDirective, UIDirectiveSchema } from './types';

export interface AgentsSDKRunnerConfig {
  openaiApiKey: string;
  model?: string;
  temperature?: number;
}

/**
 * Wrapper pro použití OpenAI Agents SDK s Tool Registry
 */
export class AgentsSDKRunner {
  constructor(
    private config: AgentsSDKRunnerConfig,
    private registry: ToolRegistry
  ) {}

  /**
   * Vytvoří Agent z workflow konfigurace s tools z registry
   */
  async runWorkflowWithAgentsSDK(
    workflowId: string,
    context: WorkflowContext,
    userMessage: string,
    systemPrompt?: string
  ): Promise<WorkflowResult> {
    const startedAt = new Date();

    try {
      // Získání všech tools z registry a převod na Agents SDK formát
      const tools = this.registry.getOpenAITools().map((openAITool) => {
        const toolDef = this.registry.getTool(openAITool.function.name);
        if (!toolDef) {
          throw new Error(`Tool ${openAITool.function.name} not found`);
        }

        return agentsTool({
          name: openAITool.function.name,
          description: openAITool.function.description,
          parameters: toolDef.inputSchema as z.ZodObject<any>,
          execute: async (args: any) => {
            const toolContext: ToolContext = {
              sessionId: context.sessionId,
              leadId: context.leadId,
              userId: context.userId,
              metadata: context.metadata,
            };

            const result = await this.registry.invokeTool(
              openAITool.function.name,
              toolContext,
              args
            );

            if (!result.success) {
              throw new Error(result.error || 'Tool execution failed');
            }

            return result.output;
          },
        });
      });

      // Vytvoření agenta
      const agent = new Agent({
        name: workflowId,
        instructions: systemPrompt || `You are a helpful assistant for ${workflowId} workflow.`,
        tools: tools,
      });

      // Spuštění agenta
      const result = await run(agent, userMessage);

      // Parsování výstupu do UI Directive formátu
      let output: UIDirective;
      try {
        const parsed = JSON.parse(result.finalOutput || '{}');
        output = UIDirectiveSchema.parse(parsed);
      } catch (e) {
        // Pokud není JSON, použijeme jako plain text
        output = {
          assistant_message: result.finalOutput || '',
          ui_directives: {
            show_blocks: [],
            hide_blocks: [],
          },
        };
      }

      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      return {
        workflowId,
        runId: (result as any).runId || `run_${Date.now()}`,
        status: 'completed',
        output,
        traceRef: (result as any).traceId,
        timings: {
          startedAt,
          completedAt,
          duration,
        },
      };
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        workflowId,
        runId: `run_${Date.now()}`,
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
}
