import { z } from 'zod';

export interface WorkflowContext {
  sessionId?: string;
  leadId?: string;
  userId?: string;
  tenantId?: string; // Pro per-tenant API key management
  metadata?: Record<string, unknown>;
}

export interface WorkflowResult {
  workflowId: string;
  runId: string;
  status: 'completed' | 'failed';
  output?: any;
  error?: string;
  traceRef?: string;
  timings?: {
    startedAt: Date;
    completedAt: Date;
    duration: number;
  };
}

export interface UIDirective {
  assistant_message: string;
  ui_directives: {
    show_blocks: string[];
    hide_blocks: string[];
    cta?: {
      label: string;
      action: string;
      payload?: any;
    };
    prefill_form?: Record<string, any>;
  };
  lead_patch?: Record<string, any>;
  next_action?: string;
}

export const UIDirectiveSchema = z.object({
  assistant_message: z.string(),
  ui_directives: z.object({
    show_blocks: z.array(z.string()),
    hide_blocks: z.array(z.string()),
    cta: z
      .object({
        label: z.string(),
        action: z.string(),
        payload: z.record(z.any()).optional(),
      })
      .optional(),
    prefill_form: z.record(z.any()).optional(),
  }),
  lead_patch: z.record(z.any()).optional(),
  next_action: z.string().optional(),
});
