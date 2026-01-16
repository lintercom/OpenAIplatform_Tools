/**
 * Workflow Catalog Schema
 * 
 * Definuje workflows (DAG/state machine) s tool calls
 */

import { z } from 'zod';

export const WorkflowTriggerSchema = z.object({
  type: z.enum(['ui', 'event', 'cron', 'api', 'webhook']),
  source: z.string(), // UI action, event name, cron expression, etc.
  condition: z.string().optional(), // When to trigger
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  toolId: z.string(),
  input: z.record(z.any()), // Tool input (can be dynamic)
  condition: z.string().optional(), // When to execute this step
  retry: z.object({
    maxAttempts: z.number(),
    backoffMs: z.number(),
  }).optional(),
  errorHandling: z.object({
    strategy: z.enum(['fail', 'skip', 'retry', 'fallback']),
    fallbackToolId: z.string().optional(),
    fallbackInput: z.record(z.any()).optional(),
  }).optional(),
  dependsOn: z.array(z.string()).optional(), // Step IDs that must complete first
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['dag', 'state-machine', 'sequential']),
  triggers: z.array(WorkflowTriggerSchema),
  steps: z.array(WorkflowStepSchema),
  failureHandling: z.object({
    strategy: z.enum(['fail-fast', 'continue', 'rollback']),
    rollbackSteps: z.array(z.string()).optional(),
  }).optional(),
  fallback: z.object({
    toolId: z.string(),
    description: z.string(),
  }).optional(),
  observability: z.object({
    traceLevel: z.enum(['minimal', 'standard', 'full']),
    metrics: z.array(z.string()).optional(),
  }).optional(),
});

export const WorkflowCatalogSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  workflows: z.array(WorkflowDefinitionSchema),
  metadata: z.record(z.any()).optional(),
});

export type WorkflowTrigger = z.infer<typeof WorkflowTriggerSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowCatalog = z.infer<typeof WorkflowCatalogSchema>;
