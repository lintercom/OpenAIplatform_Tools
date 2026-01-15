import { z } from 'zod';
import { UIDirective } from '@ai-toolkit/openai-runtime';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema<UIDirective>;
  systemPrompt: string;
  requiredTools?: string[];
}

export interface WorkflowInput {
  sessionId?: string;
  leadId?: string;
  userMessage: string;
  metadata?: Record<string, any>;
}
