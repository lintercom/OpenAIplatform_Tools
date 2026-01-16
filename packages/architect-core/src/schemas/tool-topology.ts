/**
 * Tool Topology Schema
 * 
 * Definuje jak jsou tools propojené a jak se používají
 */

import { z } from 'zod';

export const ToolNodeSchema = z.object({
  id: z.string(), // Tool ID z registry
  name: z.string(),
  description: z.string(),
  category: z.string(),
  metadata: z.object({
    riskLevel: z.enum(['low', 'medium', 'high']),
    piiLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']),
    idempotency: z.enum(['none', 'weak', 'strong']),
    retry: z.object({
      maxAttempts: z.number(),
      backoffMs: z.number(),
    }).optional(),
    compensation: z.object({
      toolId: z.string(),
      description: z.string(),
    }).optional(),
    policyTags: z.array(z.string()).optional(), // PII, roles, etc.
  }),
  inputs: z.record(z.any()), // JSON Schema
  outputs: z.record(z.any()), // JSON Schema
});

export const ToolDependencySchema = z.object({
  from: z.string(), // Tool ID
  to: z.string(), // Tool ID
  type: z.enum(['required', 'optional', 'conditional']),
  condition: z.string().optional(), // When is this dependency needed
});

export const ToolTopologySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tools: z.array(ToolNodeSchema),
  dependencies: z.array(ToolDependencySchema),
  metadata: z.record(z.any()).optional(),
});

export type ToolNode = z.infer<typeof ToolNodeSchema>;
export type ToolDependency = z.infer<typeof ToolDependencySchema>;
export type ToolTopology = z.infer<typeof ToolTopologySchema>;
