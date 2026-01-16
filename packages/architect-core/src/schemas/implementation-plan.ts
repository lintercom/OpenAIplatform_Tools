/**
 * Implementation Plan Schema
 * 
 * Definuje epics, stories, tasks s acceptance criteria a dependencies
 */

import { z } from 'zod';

export const AcceptanceCriteriaSchema = z.object({
  id: z.string(),
  description: z.string(),
  testable: z.boolean().default(true),
});

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['development', 'testing', 'documentation', 'deployment', 'integration']),
  estimatedHours: z.number().optional(),
  dependsOn: z.array(z.string()).optional(), // Task IDs
  acceptanceCriteria: z.array(AcceptanceCriteriaSchema),
  tools: z.array(z.string()).optional(), // Tool IDs used in this task
});

export const StorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['feature', 'bugfix', 'improvement', 'technical-debt']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  estimatedStoryPoints: z.number().optional(),
  dependsOn: z.array(z.string()).optional(), // Story IDs
  tasks: z.array(TaskSchema),
  acceptanceCriteria: z.array(AcceptanceCriteriaSchema),
  definitionOfDone: z.array(z.string()), // Checklist
  risk: z.object({
    level: z.enum(['low', 'medium', 'high']),
    description: z.string(),
    mitigation: z.string().optional(),
  }).optional(),
});

export const EpicSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  goal: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  dependsOn: z.array(z.string()).optional(), // Epic IDs
  stories: z.array(StorySchema),
  iteration: z.enum(['mvp', 'v2', 'v3', 'future']).optional(),
});

export const RiskSchema = z.object({
  id: z.string(),
  description: z.string(),
  level: z.enum(['low', 'medium', 'high', 'critical']),
  impact: z.string(),
  probability: z.enum(['low', 'medium', 'high']),
  mitigation: z.string(),
  owner: z.string().optional(),
});

export const ImplementationPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  epics: z.array(EpicSchema),
  risks: z.array(RiskSchema),
  timeline: z.object({
    mvp: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      durationWeeks: z.number().optional(),
    }).optional(),
    v2: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      durationWeeks: z.number().optional(),
    }).optional(),
    v3: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      durationWeeks: z.number().optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

export type AcceptanceCriteria = z.infer<typeof AcceptanceCriteriaSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Epic = z.infer<typeof EpicSchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type ImplementationPlan = z.infer<typeof ImplementationPlanSchema>;
