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

export interface ToolDefinition<TInput = any, TOutput = any> {
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
  metadata?: Record<string, any>;
}

export interface ToolCallResult<TOutput = any> {
  success: boolean;
  output?: TOutput;
  error?: string;
  auditId?: string;
}

export interface ToolMetadata {
  id: string;
  category: string;
  description: string;
  inputSchema: any; // JSON Schema
  outputSchema: any; // JSON Schema
  policy?: ToolPolicy;
}

export interface AuditLogEntry {
  id: string;
  toolId: string;
  sessionId?: string;
  leadId?: string;
  input: any;
  output?: any;
  status: 'success' | 'error' | 'blocked';
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
