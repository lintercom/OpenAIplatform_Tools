import { z } from 'zod';

export interface ToolPolicy {
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
    scope?: 'global' | 'session' | 'lead';
  };
  requiresHumanReview?: boolean;
  domainWhitelist?: string[];
  piiRules?: {
    redactInLogs?: boolean;
    redactInAudit?: boolean;
    fields?: string[];
  };
  rolesAllowed?: string[];
}

// JSON Schema type (simplified)
export type JSONSchema = Record<string, unknown>;

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  category: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  policy?: ToolPolicy;
  handler: (ctx: ToolContext, input: TInput) => Promise<TOutput>;
}

export interface ToolContext {
  sessionId?: string;
  leadId?: string;
  userId?: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCallResult<TOutput = unknown> {
  success: boolean;
  output?: TOutput;
  error?: string;
  auditId?: string;
}

export interface ToolMetadata {
  id: string;
  category: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  policy?: ToolPolicy;
}

export interface AuditLogEntry {
  id: string;
  toolId: string;
  sessionId?: string;
  leadId?: string;
  input: unknown;
  output?: unknown;
  status: 'success' | 'error' | 'blocked';
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
