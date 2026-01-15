import { z } from 'zod';
import { WorkflowTemplate } from '../types';

export const routerWorkflow: WorkflowTemplate = {
  id: 'router',
  name: 'Router Workflow',
  description: 'Routing workflow pro rozhodování o dalším kroku konverzace',
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
  systemPrompt: `Jsi AI asistent pro routing konverzací. Tvá role je analyzovat vstup uživatele a rozhodnout, jaký workflow by měl být spuštěn.

Dostupné workflows:
- "qualification": Kvalifikace leadu - shromažďování informací
- "booking": Rezervace služby
- "support": Podpora zákazníka
- "followup": Follow-up konverzace
- "content": Správa obsahu (admin)

Analyzuj zprávu uživatele a rozhodni:
1. Jaký je záměr uživatele?
2. Jaký workflow by měl být spuštěn?
3. Jaké UI bloky zobrazit?

Odpověz POUZE ve formátu JSON:
{
  "assistant_message": "Zpráva pro uživatele",
  "ui_directives": {
    "show_blocks": ["block1", "block2"],
    "hide_blocks": [],
    "cta": { "label": "Pokračovat", "action": "qualification" }
  },
  "next_action": "qualification"
}`,
  requiredTools: ['session.get', 'lead.get_or_create', 'event.track'],
};
