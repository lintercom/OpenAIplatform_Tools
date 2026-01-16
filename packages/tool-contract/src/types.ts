import { z } from 'zod';

/**
 * Enterprise Tool Contract - Standardizované rozhraní pro všechny AI tools
 * 
 * Tento kontrakt definuje všechny metadata potřebná pro:
 * - Automatickou validaci
 * - Risk assessment
 * - Cost tracking
 * - Policy enforcement
 * - Dokumentaci
 * - Discovery
 */

/**
 * Risk level toolu pro policy enforcement
 */
export enum ToolRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * PII (Personally Identifiable Information) klasifikace
 */
export enum PIILevel {
  NONE = 'none',
  LOW = 'low', // Např. anonymizovaná data
  MEDIUM = 'medium', // Např. email bez dalších dat
  HIGH = 'high', // Např. email + telefon + jméno
  CRITICAL = 'critical', // Např. platební údaje, SSN
}

/**
 * Idempotency level toolu
 */
export enum IdempotencyLevel {
  NONE = 'none', // Tool není idempotentní
  WEAK = 'weak', // Idempotentní s určitými podmínkami
  STRONG = 'strong', // Plně idempotentní (může být volán opakovaně bez side effects)
}

/**
 * Cost profile pro tracking nákladů
 */
export interface CostProfile {
  /**
   * Odhadovaná cena za volání (v USD nebo credits)
   */
  estimatedCostPerCall?: number;
  
  /**
   * Maximální cena za volání (hard limit)
   */
  maxCostPerCall?: number;
  
  /**
   * Zda tool volá externí API (OpenAI, atd.)
   */
  callsExternalAPI?: boolean;
  
  /**
   * Zda tool je nákladný (např. LLM calls)
   */
  isExpensive?: boolean;
}

/**
 * Error model podle RFC 7807 Problem Details
 */
export interface ProblemDetails {
  type: string; // URI reference k dokumentaci error typu
  title: string; // Krátký human-readable popis
  status: number; // HTTP status code
  detail?: string; // Detailní popis
  instance?: string; // URI instance, kde došlo k chybě
  errors?: Record<string, string[]>; // Field-specific errors
}

/**
 * Standardizovaný error pro tool
 */
export class ToolError extends Error {
  constructor(
    public readonly problem: ProblemDetails,
    public readonly toolId: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(problem.title);
    this.name = 'ToolError';
  }

  /**
   * Vytvoří ToolError z běžné chyby
   */
  static fromError(error: unknown, toolId: string, status = 500): ToolError {
    if (error instanceof ToolError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new ToolError(
      {
        type: 'https://api.aitoolkit.dev/errors/tool-execution-failed',
        title: 'Tool execution failed',
        status,
        detail: message,
      },
      toolId
    );
  }

  /**
   * Vytvoří validation error
   */
  static validationError(
    toolId: string,
    field: string,
    message: string
  ): ToolError {
    return new ToolError(
      {
        type: 'https://api.aitoolkit.dev/errors/validation-failed',
        title: 'Validation failed',
        status: 400,
        detail: `Validation failed for field "${field}"`,
        errors: { [field]: [message] },
      },
      toolId
    );
  }
}

/**
 * Tool Contract - Kompletní metadata pro enterprise tool
 */
export interface ToolContract<TInput = unknown, TOutput = unknown> {
  // Identifikace
  id: string;
  name: string;
  version: string;
  description: string;
  
  // Kategorizace
  category: string;
  tags: string[];
  
  // Risk & Security
  riskLevel: ToolRiskLevel;
  piiLevel: PIILevel;
  idempotency: IdempotencyLevel;
  
  // Access Control
  requiredRoles?: string[];
  requiredPermissions?: string[];
  
  // Schemas
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  
  // Policy
  rateLimits?: {
    maxCalls: number;
    windowMs: number;
    scope?: 'global' | 'session' | 'user' | 'tenant';
  };
  
  // Cost tracking
  costProfile?: CostProfile;
  
  // Examples pro dokumentaci a testing
  examples?: Array<{
    name: string;
    description?: string;
    input: TInput;
    expectedOutput?: TOutput;
  }>;
  
  // Error model
  errorModel?: {
    possibleErrors: Array<{
      type: string;
      status: number;
      title: string;
      description: string;
    }>;
  };
  
  // Metadata
  author?: string;
  maintainer?: string;
  documentationUrl?: string;
  sourceCodeUrl?: string;
  
  // Deprecation
  deprecated?: boolean;
  deprecationMessage?: string;
  replacementToolId?: string;
  
  // Handler
  handler: (ctx: ToolExecutionContext, input: TInput) => Promise<TOutput>;
}

/**
 * Tool Execution Context - Rozšířený context s observability
 */
export interface ToolExecutionContext {
  // Identifikace
  requestId: string;
  correlationId: string;
  traceId?: string;
  
  // Actor
  userId?: string;
  sessionId?: string;
  leadId?: string;
  tenantId?: string;
  
  // Authorization
  role?: string;
  permissions?: string[];
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timing
  startedAt: Date;
}

/**
 * Tool Execution Result - Standardizovaný výsledek
 */
export interface ToolExecutionResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: ProblemDetails;
  auditId: string;
  requestId: string;
  correlationId: string;
  traceId?: string;
  latency: number;
  cost?: number;
  policyDecision?: {
    allowed: boolean;
    reason?: string;
    reviewedBy?: string;
  };
}

/**
 * Tool Metadata - Pro discovery a dokumentaci
 */
export interface ToolMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  riskLevel: ToolRiskLevel;
  piiLevel: PIILevel;
  idempotency: IdempotencyLevel;
  requiredRoles?: string[];
  rateLimits?: ToolContract['rateLimits'];
  costProfile?: CostProfile;
  deprecated?: boolean;
  inputSchema: unknown; // JSON Schema
  outputSchema: unknown; // JSON Schema
  examples?: ToolContract['examples'];
  errorModel?: ToolContract['errorModel'];
  documentationUrl?: string;
}
