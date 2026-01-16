/**
 * Project Brief Schema
 * 
 * Shromažďuje všechny informace z questionnaire
 */

import { z } from 'zod';

export const ProjectBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  
  // Goals & Objectives
  goals: z.array(z.string()),
  successCriteria: z.array(z.string()),
  
  // Constraints
  constraints: z.object({
    budget: z.object({
      maxCostPerMonth: z.number().optional(),
      maxCostPerRequest: z.number().optional(),
    }).optional(),
    timeline: z.object({
      mvpDeadline: z.string().optional(),
      fullDeadline: z.string().optional(),
    }).optional(),
    technical: z.array(z.string()).optional(), // e.g., "must use PostgreSQL", "must support 10k users"
    compliance: z.array(z.string()).optional(), // e.g., "GDPR", "HIPAA"
  }).optional(),
  
  // Integrations
  integrations: z.array(z.object({
    name: z.string(),
    type: z.enum(['erp', 'crm', 'payment', 'shipping', 'email', 'other']),
    description: z.string(),
    required: z.boolean().default(true),
  })).optional(),
  
  // Security
  security: z.object({
    authentication: z.enum(['none', 'api-key', 'oauth', 'sso']).optional(),
    authorization: z.enum(['none', 'rbac', 'abac']).optional(),
    piiHandling: z.enum(['none', 'redact', 'encrypt', 'isolate']).optional(),
    tenantIsolation: z.boolean().default(false),
  }).optional(),
  
  // Realtime requirements
  realtime: z.object({
    required: z.boolean().default(false),
    useCases: z.array(z.string()).optional(),
  }).optional(),
  
  // Domain context
  domain: z.string().optional(),
  industry: z.string().optional(),
  useCase: z.string().optional(),
  
  // User types
  userTypes: z.array(z.object({
    role: z.string(),
    description: z.string(),
    permissions: z.array(z.string()).optional(),
  })).optional(),
  
  // Data quality
  dataQuality: z.object({
    completeness: z.enum(['low', 'medium', 'high']).optional(),
    accuracy: z.enum(['low', 'medium', 'high']).optional(),
    frequency: z.enum(['batch', 'near-realtime', 'realtime']).optional(),
  }).optional(),
  
  // UX needs
  uxNeeds: z.object({
    personalization: z.boolean().default(false),
    recommendations: z.boolean().default(false),
    naturalLanguage: z.boolean().default(false),
  }).optional(),
  
  // Metadata
  metadata: z.record(z.any()).optional(),
});

export type ProjectBrief = z.infer<typeof ProjectBriefSchema>;
