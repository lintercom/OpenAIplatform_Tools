import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PrismaClient } from '@prisma/client';
import {
  ToolDefinition,
  ToolContext,
  ToolCallResult,
  ToolMetadata,
  ToolPolicy,
} from './types';
import { PolicyEngine } from './policy-engine';
import { AuditLogger } from './audit-logger';

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private policyEngine: PolicyEngine;
  public readonly auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.policyEngine = new PolicyEngine(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Registruje nový tool
   */
  register<TInput = any, TOutput = any>(tool: ToolDefinition<TInput, TOutput>): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id "${tool.id}" is already registered`);
    }
    this.tools.set(tool.id, tool);
  }

  /**
   * Vrací metadata všech tools ve formátu pro OpenAI tool calling
   */
  listTools(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => ({
      id: tool.id,
      category: tool.category,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }),
      outputSchema: zodToJsonSchema(tool.outputSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }),
      policy: tool.policy,
    }));
  }

  /**
   * Vrací tools ve formátu OpenAI function calling
   */
  getOpenAITools(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.id,
        description: tool.description,
        parameters: zodToJsonSchema(tool.inputSchema, {
          target: 'openApi3',
          $refStrategy: 'none',
        }),
      },
    }));
  }

  /**
   * Invokuje tool s validací, policy enforcement a audit logging
   */
  async invokeTool<TInput = any, TOutput = any>(
    toolId: string,
    ctx: ToolContext,
    input: TInput
  ): Promise<ToolCallResult<TOutput>> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolId}" not found`,
      };
    }

    // 1. Validace vstupu
    let validatedInput: TInput;
    try {
      validatedInput = tool.inputSchema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Invalid input: ${error.errors.map((e) => e.message).join(', ')}`,
        };
      }
      return {
        success: false,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // 2. Policy check
    const policyResult = await this.policyEngine.checkPolicy(tool, ctx, validatedInput);
    if (!policyResult.allowed) {
      await this.auditLogger.log({
        toolId,
        sessionId: ctx.sessionId,
        leadId: ctx.leadId,
        input: this.redactInput(validatedInput, tool.policy),
        status: 'blocked',
        error: policyResult.reason,
        metadata: ctx.metadata,
      });

      return {
        success: false,
        error: policyResult.reason || 'Policy check failed',
      };
    }

    // 3. Spuštění handleru
    let output: TOutput;
    let error: string | undefined;
    try {
      output = await tool.handler(ctx, validatedInput);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      output = undefined as any;
    }

    // 4. Validace výstupu
    if (!error) {
      try {
        output = tool.outputSchema.parse(output);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          error = `Invalid output: ${validationError.errors.map((e) => e.message).join(', ')}`;
        } else {
          error = 'Output validation failed';
        }
      }
    }

    const status = error ? 'error' : 'success';

    // 5. Audit logging
    const auditId = await this.auditLogger.log({
      toolId,
      sessionId: ctx.sessionId,
      leadId: ctx.leadId,
      input: this.redactInput(validatedInput, tool.policy),
      output: error ? undefined : this.redactOutput(output, tool.policy),
      status,
      error,
      metadata: ctx.metadata,
    });

    return {
      success: !error,
      output: error ? undefined : output,
      error,
      auditId,
    };
  }

  /**
   * Vrací tool definici
   */
  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Redakce vstupu podle PII pravidel
   */
  private redactInput(input: any, policy?: ToolPolicy): any {
    if (!policy?.piiRules?.redactInAudit) {
      return input;
    }

    return this.redactFields(input, policy.piiRules.fields || []);
  }

  /**
   * Redakce výstupu podle PII pravidel
   */
  private redactOutput(output: any, policy?: ToolPolicy): any {
    if (!policy?.piiRules?.redactInAudit) {
      return output;
    }

    return this.redactFields(output, policy.piiRules.fields || []);
  }

  /**
   * Redakce konkrétních polí
   */
  private redactFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactFields(item, fields));
    }

    const redacted = { ...obj };
    for (const field of fields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }

    // Rekurzivní redakce vnořených objektů
    for (const key in redacted) {
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactFields(redacted[key], fields);
      }
    }

    return redacted;
  }
}
