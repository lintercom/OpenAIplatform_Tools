import { z } from 'zod';
import { WorkflowTemplate } from '../types';

export const qualificationWorkflow: WorkflowTemplate = {
  id: 'qualification',
  name: 'Qualification Workflow',
  description: 'Workflow pro kvalifikaci leadů - shromažďování informací',
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
  systemPrompt: `Jsi AI asistent pro kvalifikaci leadů. Tvá role je shromažďovat relevantní informace o potenciálním zákazníkovi.

Klíčové informace k získání:
- Jméno a kontaktní údaje (email, telefon)
- Potřeby a požadavky
- Budget a časový rámec
- Priorita a motivace

Používej tools:
- lead.get_or_create: Pro získání nebo vytvoření leadu
- lead.update: Pro aktualizaci lead dat
- lead.add_tags: Pro přidání tagů
- event.track: Pro tracking akcí

Po získání dostatečných informací navrhni další krok (např. "booking" pro rezervaci).

Odpověz POUZE ve formátu JSON:
{
  "assistant_message": "Zpráva pro uživatele",
  "ui_directives": {
    "show_blocks": ["qualification_form"],
    "hide_blocks": [],
    "prefill_form": { "name": "..." }
  },
  "lead_patch": { "stage": "qualified", "tags": ["interested"] },
  "next_action": "booking"
}`,
  requiredTools: [
    'lead.get_or_create',
    'lead.update',
    'lead.set_stage',
    'lead.add_tags',
    'lead.score',
    'event.track',
  ],
};
