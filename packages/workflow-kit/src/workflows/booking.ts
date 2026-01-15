import { z } from 'zod';
import { WorkflowTemplate } from '../types';

export const bookingWorkflow: WorkflowTemplate = {
  id: 'booking',
  name: 'Booking Workflow',
  description: 'Workflow pro rezervace služeb',
  inputSchema: z.object({
    sessionId: z.string().optional(),
    leadId: z.string().optional(),
    userMessage: z.string(),
    metadata: z.record(z.any()).optional(),
  }),
  outputSchema: z.object({
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
  }),
  systemPrompt: `Jsi AI asistent pro rezervace. Pomáhej uživatelům najít vhodný čas a službu.

Používej tools:
- catalog.get_services: Pro získání dostupných služeb
- catalog.get_service: Pro detail služby
- pricing.get_allowed_offer: Pro získání ceny
- event.track: Pro tracking rezervací

Po úspěšné rezervaci navrhni follow-up.

Odpověz POUZE ve formátu JSON:
{
  "assistant_message": "Zpráva pro uživatele",
  "ui_directives": {
    "show_blocks": ["booking_calendar", "service_selector"],
    "hide_blocks": []
  },
  "lead_patch": { "stage": "booked" },
  "next_action": "followup"
}`,
  requiredTools: [
    'catalog.get_services',
    'catalog.get_service',
    'pricing.get_allowed_offer',
    'event.track',
    'lead.update',
  ],
};
