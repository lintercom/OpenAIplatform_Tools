import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const renderTemplateSchema = z.object({
  templateName: z.string(),
  variables: z.record(z.any()),
});

export function createTemplateTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'template.render',
      category: 'template',
      description: 'Renderuje template s proměnnými',
      inputSchema: renderTemplateSchema,
      outputSchema: z.object({
        content: z.string(),
      }),
      handler: async (ctx, input) => {
        const template = await prisma.template.findFirst({
          where: { name: input.templateName },
        });
        if (!template) {
          throw new Error(`Template "${input.templateName}" not found`);
        }

        // Jednoduchá template substituce
        let content = template.content;
        for (const [key, value] of Object.entries(input.variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          content = content.replace(regex, String(value));
        }

        return { content };
      },
    },
  ];
}
