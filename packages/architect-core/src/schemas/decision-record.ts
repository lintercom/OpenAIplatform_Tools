/**
 * Architecture Decision Record (ADR) Schema
 * 
 * Dokumentuje rozhodnutí o použití AI vs Deterministic řešení
 */

import { z } from 'zod';

export const DecisionRecordSchema = z.object({
  id: z.string(),
  feature: z.string(),
  decision: z.enum(['AI_ASSISTED', 'DETERMINISTIC', 'HYBRID']),
  rationale: z.array(z.string()), // Criteria list
  riskLevel: z.enum(['low', 'medium', 'high']),
  costBudget: z.object({
    maxTokensPerSession: z.number().optional(),
    maxTokensPerWorkflow: z.number().optional(),
    maxCallsPerSession: z.number().optional(),
    estimatedCostPerMonth: z.number().optional(),
  }).optional(),
  fallbackStrategy: z.string(),
  observabilityMetrics: z.array(z.string()),
  securityNotes: z.object({
    piiHandling: z.enum(['none', 'redact', 'encrypt', 'isolate']),
    requiredRoles: z.array(z.string()).optional(),
    tenantIsolation: z.boolean().default(false),
  }).optional(),
  alternatives: z.array(z.object({
    option: z.string(),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    whyNot: z.string(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;
