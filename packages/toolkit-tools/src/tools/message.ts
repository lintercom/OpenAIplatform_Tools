import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';
import { EmailAdapter } from '@ai-toolkit/adapters';

const sendTemplateSchema = z.object({
  leadId: z.string(),
  templateName: z.string(),
  variables: z.record(z.any()).optional(),
  channel: z.enum(['email', 'sms', 'message']).default('email'),
});

const sendForReviewSchema = z.object({
  leadId: z.string(),
  message: z.string(),
  channel: z.enum(['email', 'sms', 'message']),
});

export function createMessageTools(
  prisma: PrismaClient,
  emailAdapter: EmailAdapter
): ToolDefinition[] {
  return [
    {
      id: 'message.send_template',
      category: 'message',
      description: 'Odešle zprávu pomocí template',
      inputSchema: sendTemplateSchema,
      outputSchema: z.object({
        messageId: z.string(),
        status: z.string(),
      }),
      policy: {
        requiresHumanReview: true,
      },
      handler: async (ctx, input) => {
        // 1. Načíst lead
        const lead = await prisma.lead.findUnique({
          where: { id: input.leadId },
        });
        if (!lead) {
          throw new Error(`Lead ${input.leadId} not found`);
        }

        // 2. Renderovat template
        const template = await prisma.template.findFirst({
          where: { name: input.templateName },
        });
        if (!template) {
          throw new Error(`Template "${input.templateName}" not found`);
        }

        let content = template.content;
        const variables = {
          ...input.variables,
          leadName: lead.name || 'Customer',
          leadEmail: lead.email || '',
        };
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          content = content.replace(regex, String(value));
        }

        // 3. Odeslat (mock)
        if (input.channel === 'email' && lead.email) {
          const result = await emailAdapter.sendEmail({
            to: lead.email,
            subject: `Message from ${template.name}`,
            body: content,
          });
          return {
            messageId: result.id,
            status: result.status,
          };
        }

        // Pro ostatní kanály jen logujeme
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`[Message] Sending ${input.channel} message ${messageId} to lead ${input.leadId}`);
        return {
          messageId,
          status: 'queued',
        };
      },
    },
    {
      id: 'message.send_for_review',
      category: 'message',
      description: 'Odešle zprávu do fronty pro human review',
      inputSchema: sendForReviewSchema,
      outputSchema: z.object({
        reviewId: z.string(),
        status: z.string(),
      }),
      policy: {
        requiresHumanReview: true,
      },
      handler: async (ctx, input) => {
        // V produkci by se zpráva přidala do fronty pro review
        const reviewId = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`[Message] Message ${reviewId} queued for review: ${input.message}`);
        return {
          reviewId,
          status: 'pending_review',
        };
      },
    },
  ];
}
