import { randomUUID } from 'crypto';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PrismaClient } from '@prisma/client';
import {
  ToolContract,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolMetadata,
  ToolError,
  ToolContractValidator,
} from '@ai-toolkit/tool-contract';
import { tracer, logger, metrics } from '@ai-toolkit/observability';
import { PolicyEngine } from './policy-engine';
import { AuditLogger } from './audit-logger';

/**
 * Enterprise Tool Registry v2 - s podporou Tool Contract a observability
 */
export class ToolRegistryV2 {
  private tools = new Map<string, ToolContract>();
  private policyEngine: PolicyEngine;
  public readonly auditLogger: AuditLogger;

  constructor(private prisma: PrismaClient) {
    this.policyEngine = new PolicyEngine(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  /**
   * Registruje nový tool s validací kontraktu
   */
  register(contract: ToolContract): void {
    // Validace kontraktu
    const validation = ToolContractValidator.validate(contract);
    if (!validation.valid) {
      throw new Error(
        `Invalid tool contract for "${contract.id}": ${validation.errors.join(', ')}`
      );
    }

    if (this.tools.has(contract.id)) {
      throw new Error(`Tool with id "${contract.id}" is already registered`);
    }

    this.tools.set(contract.id, contract);
    logger.info(`Tool registered: ${contract.id}`, {
      toolId: contract.id,
      version: contract.version,
      riskLevel: contract.riskLevel,
    });
  }

  /**
   * Vrací metadata všech tools
   */
  listTools(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((contract) =>
      this.toMetadata(contract)
    );
  }

  /**
   * Vrací tools ve formátu OpenAI function calling
   */
  getOpenAITools(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: unknown;
    };
  }> {
    return Array.from(this.tools.values()).map((contract) => ({
      type: 'function' as const,
      function: {
        name: contract.id,
        description: contract.description,
        parameters: zodToJsonSchema(contract.inputSchema, {
          target: 'openApi3',
          $refStrategy: 'none',
        }),
      },
    }));
  }

  /**
   * Invokuje tool s plnou observability
   */
  async invokeTool<TInput = unknown, TOutput = unknown>(
    toolId: string,
    ctx: Partial<ToolExecutionContext>,
    input: TInput
  ): Promise<ToolExecutionResult<TOutput>> {
    const contract = this.tools.get(toolId);
    if (!contract) {
      const error = new ToolError(
        {
          type: 'https://api.aitoolkit.dev/errors/tool-not-found',
          title: 'Tool not found',
          status: 404,
          detail: `Tool "${toolId}" is not registered`,
        },
        toolId
      );

      return {
        success: false,
        error: error.problem,
        auditId: '',
        requestId: ctx.requestId || randomUUID(),
        correlationId: ctx.correlationId || randomUUID(),
        traceId: ctx.traceId,
        latency: 0,
      };
    }

    // Vytvoření execution context
    const executionContext: ToolExecutionContext = {
      requestId: ctx.requestId || randomUUID(),
      correlationId: ctx.correlationId || randomUUID(),
      traceId: ctx.traceId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      leadId: ctx.leadId,
      tenantId: ctx.tenantId,
      role: ctx.role,
      permissions: ctx.permissions,
      metadata: ctx.metadata,
      startedAt: new Date(),
    };

    // Start tracing
    const traceContext = tracer.startSpan(`tool.${toolId}`, ctx.traceId ? {
      traceId: ctx.traceId,
      spanId: ctx.traceId,
    } : undefined, {
      tool_id: toolId,
      tool_version: contract.version,
      request_id: executionContext.requestId,
    });

    executionContext.traceId = traceContext.traceId;

    const startTime = Date.now();

    try {
      // 1. Validace vstupu
      const inputValidation = ToolContractValidator.validateInput(contract, input);
      if (!inputValidation.valid) {
        tracer.setAttribute(traceContext.spanId, 'validation_error', true);
        tracer.endSpan(traceContext.spanId, 'error');

        const error = ToolError.validationError(toolId, 'input', inputValidation.error || 'Invalid input');
        const latency = Date.now() - startTime;

        const result: ToolExecutionResult<TOutput> = {
          success: false,
          error: error.problem,
          auditId: await this.auditLogger.log({
            toolId,
            sessionId: executionContext.sessionId,
            leadId: executionContext.leadId,
            input: this.redactInput(input, contract),
            status: 'error',
            error: error.problem.title,
            metadata: {
              requestId: executionContext.requestId,
              correlationId: executionContext.correlationId,
              traceId: executionContext.traceId,
            },
          }),
          requestId: executionContext.requestId,
          correlationId: executionContext.correlationId,
          traceId: executionContext.traceId,
          latency,
        };

        logger.logToolExecution(executionContext, result, toolId);
        metrics.recordToolExecution(toolId, result);

        return result;
      }

      // 2. Policy check
      const policyResult = await this.policyEngine.checkPolicy(
        this.toLegacyDefinition(contract),
        this.toLegacyContext(executionContext),
        inputValidation.data
      );

      if (!policyResult.allowed) {
        tracer.setAttribute(traceContext.spanId, 'policy_blocked', true);
        tracer.endSpan(traceContext.spanId, 'error');

        const error = new ToolError(
          {
            type: 'https://api.aitoolkit.dev/errors/policy-blocked',
            title: 'Policy check failed',
            status: 403,
            detail: policyResult.reason || 'Access denied',
          },
          toolId
        );

        const latency = Date.now() - startTime;

        const result: ToolExecutionResult<TOutput> = {
          success: false,
          error: error.problem,
          auditId: await this.auditLogger.log({
            toolId,
            sessionId: executionContext.sessionId,
            leadId: executionContext.leadId,
            input: this.redactInput(input, contract),
            status: 'blocked',
            error: policyResult.reason,
            metadata: {
              requestId: executionContext.requestId,
              correlationId: executionContext.correlationId,
              traceId: executionContext.traceId,
            },
          }),
          requestId: executionContext.requestId,
          correlationId: executionContext.correlationId,
          traceId: executionContext.traceId,
          latency,
          policyDecision: {
            allowed: false,
            reason: policyResult.reason,
          },
        };

        logger.logToolExecution(executionContext, result, toolId);
        metrics.recordToolExecution(toolId, result);

        return result;
      }

      // 3. Spuštění handleru
      let output: TOutput;
      let executionError: Error | undefined;

      try {
        output = await contract.handler(executionContext, inputValidation.data as TInput);
      } catch (err) {
        executionError = err instanceof Error ? err : new Error(String(err));
        throw executionError;
      }

      // 4. Validace výstupu
      const outputValidation = ToolContractValidator.validateOutput(contract, output);
      if (!outputValidation.valid) {
        throw new Error(outputValidation.error || 'Output validation failed');
      }

      // 5. Výpočet cost
      const cost = contract.costProfile?.estimatedCostPerCall;

      const latency = Date.now() - startTime;
      tracer.setAttribute(traceContext.spanId, 'latency_ms', latency);
      tracer.setAttribute(traceContext.spanId, 'success', true);
      if (cost !== undefined) {
        tracer.setAttribute(traceContext.spanId, 'cost', cost);
      }
      tracer.endSpan(traceContext.spanId, 'ok');

      const result: ToolExecutionResult<TOutput> = {
        success: true,
        output: outputValidation.data as TOutput,
        auditId: await this.auditLogger.log({
          toolId,
          sessionId: executionContext.sessionId,
          leadId: executionContext.leadId,
          input: this.redactInput(input, contract),
          output: this.redactOutput(outputValidation.data, contract),
          status: 'success',
          metadata: {
            requestId: executionContext.requestId,
            correlationId: executionContext.correlationId,
            traceId: executionContext.traceId,
            latency,
            cost,
          },
        }),
        requestId: executionContext.requestId,
        correlationId: executionContext.correlationId,
        traceId: executionContext.traceId,
        latency,
        cost,
        policyDecision: {
          allowed: true,
        },
      };

      logger.logToolExecution(executionContext, result, toolId);
      metrics.recordToolExecution(toolId, result);

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      tracer.setAttribute(traceContext.spanId, 'error', true);
      tracer.endSpan(traceContext.spanId, 'error', error instanceof Error ? error : undefined);

      const toolError = ToolError.fromError(error, toolId, 500);
      const result: ToolExecutionResult<TOutput> = {
        success: false,
        error: toolError.problem,
        auditId: await this.auditLogger.log({
          toolId,
          sessionId: executionContext.sessionId,
          leadId: executionContext.leadId,
          input: this.redactInput(input, contract),
          status: 'error',
          error: toolError.problem.title,
          metadata: {
            requestId: executionContext.requestId,
            correlationId: executionContext.correlationId,
            traceId: executionContext.traceId,
            error: toolError.problem,
          },
        }),
        requestId: executionContext.requestId,
        correlationId: executionContext.correlationId,
        traceId: executionContext.traceId,
        latency,
      };

      logger.logToolExecution(executionContext, result, toolId);
      metrics.recordToolExecution(toolId, result);

      return result;
    }
  }

  /**
   * Vrací tool contract
   */
  getTool(toolId: string): ToolContract | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Validuje všechny registrované tools
   */
  validateAll(): { valid: boolean; errors: Array<{ toolId: string; errors: string[] }> } {
    const errors: Array<{ toolId: string; errors: string[] }> = [];

    for (const contract of this.tools.values()) {
      const validation = ToolContractValidator.validate(contract);
      if (!validation.valid) {
        errors.push({
          toolId: contract.id,
          errors: validation.errors,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Konvertuje Tool Contract na ToolMetadata
   */
  private toMetadata(contract: ToolContract): ToolMetadata {
    return {
      id: contract.id,
      name: contract.name,
      version: contract.version,
      description: contract.description,
      category: contract.category,
      tags: contract.tags,
      riskLevel: contract.riskLevel,
      piiLevel: contract.piiLevel,
      idempotency: contract.idempotency,
      requiredRoles: contract.requiredRoles,
      rateLimits: contract.rateLimits,
      costProfile: contract.costProfile,
      deprecated: contract.deprecated,
      inputSchema: zodToJsonSchema(contract.inputSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }),
      outputSchema: zodToJsonSchema(contract.outputSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }),
      examples: contract.examples,
      errorModel: contract.errorModel,
      documentationUrl: contract.documentationUrl,
    };
  }

  /**
   * Konvertuje Tool Contract na legacy ToolDefinition (pro backward compatibility)
   */
  private toLegacyDefinition(contract: ToolContract): any {
    return {
      id: contract.id,
      category: contract.category,
      description: contract.description,
      inputSchema: contract.inputSchema,
      outputSchema: contract.outputSchema,
      policy: {
        rateLimit: contract.rateLimits,
        rolesAllowed: contract.requiredRoles,
      },
      handler: contract.handler,
    };
  }

  /**
   * Konvertuje ToolExecutionContext na legacy ToolContext
   */
  private toLegacyContext(ctx: ToolExecutionContext): any {
    return {
      sessionId: ctx.sessionId,
      leadId: ctx.leadId,
      userId: ctx.userId,
      role: ctx.role,
      metadata: ctx.metadata,
    };
  }

  /**
   * Redakce vstupu podle PII pravidel
   */
  private redactInput(input: unknown, contract: ToolContract): unknown {
    if (contract.piiLevel === 'none' || contract.piiLevel === 'low') {
      return input;
    }

    // Jednoduchá redakce - v produkci by byla sofistikovanější
    if (typeof input === 'object' && input !== null) {
      const redacted = { ...input as Record<string, unknown> };
      const sensitiveFields = ['email', 'phone', 'password', 'ssn', 'creditCard'];
      for (const field of sensitiveFields) {
        if (field in redacted) {
          redacted[field] = '[REDACTED]';
        }
      }
      return redacted;
    }

    return input;
  }

  /**
   * Redakce výstupu podle PII pravidel
   */
  private redactOutput(output: unknown, contract: ToolContract): unknown {
    return this.redactInput(output, contract);
  }
}
