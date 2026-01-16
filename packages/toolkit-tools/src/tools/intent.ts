import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ToolDefinition } from '@ai-toolkit/core';

const detectIntentSchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().optional(),
  context: z.record(z.any()).optional(),
});

const classifyUserTypeSchema = z.object({
  leadId: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.record(z.any()).optional(),
});

const detectUrgencySchema = z.object({
  sessionId: z.string().optional(),
  message: z.string().optional(),
  context: z.record(z.any()).optional(),
});

export function createIntentTools(prisma: PrismaClient): ToolDefinition[] {
  return [
    {
      id: 'intent.detect',
      category: 'intent',
      description: 'Detekuje záměr uživatele (nákup/poptávka/servis/bazar)',
      inputSchema: detectIntentSchema,
      outputSchema: z.object({
        intent: z.enum(['purchase', 'quote', 'service', 'bazaar', 'unknown']),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
      }),
      handler: async (ctx, input) => {
        // Získat kontext z session
        let sessionData: any = null;
        if (input.sessionId || ctx.sessionId) {
          const session = await prisma.session.findUnique({
            where: { id: (input.sessionId || ctx.sessionId) as string },
          });
          sessionData = session?.metadata as any;
        }

        // Získat eventy z session
        const events = await prisma.event.findMany({
          where: {
            sessionId: input.sessionId || ctx.sessionId || undefined,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });

        // Jednoduchá heuristika pro detekci intentu
        // V produkci by se použil OpenAI pro klasifikaci
        const message = (input.message || '').toLowerCase();
        const eventTypes = events.map((e) => e.type);

        let intent: 'purchase' | 'quote' | 'service' | 'bazaar' | 'unknown' = 'unknown';
        let confidence = 0.5;
        let reasoning = '';

        // Klíčová slova pro nákup
        const purchaseKeywords = ['koupit', 'koupit', 'nákup', 'objednat', 'košík', 'cena'];
        // Klíčová slova pro poptávku
        const quoteKeywords = ['poptávka', 'nabídka', 'cenová', 'dotaz', 'stroje'];
        // Klíčová slova pro servis
        const serviceKeywords = ['servis', 'oprava', 'porucha', 'problém', 'díly'];
        // Klíčová slova pro bazar
        const bazaarKeywords = ['bazar', 'použitý', 'zánovní', 'výprodej'];

        const purchaseScore = purchaseKeywords.filter((kw) => message.includes(kw)).length;
        const quoteScore = quoteKeywords.filter((kw) => message.includes(kw)).length;
        const serviceScore = serviceKeywords.filter((kw) => message.includes(kw)).length;
        const bazaarScore = bazaarKeywords.filter((kw) => message.includes(kw)).length;

        if (eventTypes.includes('cart.add_item') || eventTypes.includes('cart.create')) {
          intent = 'purchase';
          confidence = 0.9;
          reasoning = 'User has items in cart';
        } else if (serviceScore > 0) {
          intent = 'service';
          confidence = 0.7 + serviceScore * 0.1;
          reasoning = `Service keywords detected: ${serviceScore}`;
        } else if (quoteScore > 0) {
          intent = 'quote';
          confidence = 0.7 + quoteScore * 0.1;
          reasoning = `Quote keywords detected: ${quoteScore}`;
        } else if (bazaarScore > 0) {
          intent = 'bazaar';
          confidence = 0.7 + bazaarScore * 0.1;
          reasoning = `Bazaar keywords detected: ${bazaarScore}`;
        } else if (purchaseScore > 0) {
          intent = 'purchase';
          confidence = 0.6 + purchaseScore * 0.1;
          reasoning = `Purchase keywords detected: ${purchaseScore}`;
        } else {
          reasoning = 'No clear intent detected';
        }

        // Uložit do session metadata
        if (input.sessionId || ctx.sessionId) {
          await prisma.session.update({
            where: { id: (input.sessionId || ctx.sessionId) as string },
            data: {
              metadata: {
                ...(sessionData || {}),
                detectedIntent: intent,
                intentConfidence: confidence,
                intentDetectedAt: new Date().toISOString(),
              } as any,
            },
          });
        }

        return {
          intent,
          confidence: Math.min(confidence, 1),
          reasoning,
        };
      },
    },
    {
      id: 'intent.classify_user_type',
      category: 'intent',
      description: 'Klasifikuje typ uživatele (B2C/B2B/farmář/servisák)',
      inputSchema: classifyUserTypeSchema,
      outputSchema: z.object({
        userType: z.enum(['b2c', 'b2b', 'farmer', 'service_technician', 'unknown']),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
      }),
      handler: async (ctx, input) => {
        let leadData: any = null;
        if (input.leadId || ctx.leadId) {
          const lead = await prisma.lead.findUnique({
            where: { id: (input.leadId || ctx.leadId) as string },
          });
          leadData = lead?.data as any;
        }

        // Získat eventy
        const events = await prisma.event.findMany({
          where: {
            OR: [
              input.leadId || ctx.leadId
                ? { leadId: (input.leadId || ctx.leadId) as string }
                : {},
              input.sessionId || ctx.sessionId
                ? { sessionId: (input.sessionId || ctx.sessionId) as string }
                : {},
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        // Heuristika pro klasifikaci
        let userType: 'b2c' | 'b2b' | 'farmer' | 'service_technician' | 'unknown' = 'unknown';
        let confidence = 0.5;
        let reasoning = '';

        const data = input.data || leadData || {};

        // B2B indikátory
        if (data.companyName || data.ico || data.dic) {
          userType = 'b2b';
          confidence = 0.8;
          reasoning = 'Company information found';
        }
        // Farmář indikátory
        else if (data.farmType || events.some((e) => e.type.includes('farm'))) {
          userType = 'farmer';
          confidence = 0.7;
          reasoning = 'Farm-related data found';
        }
        // Servisák indikátory
        else if (events.some((e) => e.type.includes('service')) || data.serviceTechnician) {
          userType = 'service_technician';
          confidence = 0.7;
          reasoning = 'Service-related activity found';
        }
        // Výchozí B2C
        else {
          userType = 'b2c';
          confidence = 0.6;
          reasoning = 'Default consumer classification';
        }

        // Uložit do lead data
        if (input.leadId || ctx.leadId) {
          await prisma.lead.update({
            where: { id: (input.leadId || ctx.leadId) as string },
            data: {
              data: {
                ...(leadData || {}),
                userType,
                userTypeConfidence: confidence,
                userTypeClassifiedAt: new Date().toISOString(),
              } as any,
            },
          });
        }

        return {
          userType,
          confidence,
          reasoning,
        };
      },
    },
    {
      id: 'intent.detect_urgency',
      category: 'intent',
      description: 'Detekuje urgency problému (akutní/normální/nízká)',
      inputSchema: detectUrgencySchema,
      outputSchema: z.object({
        urgency: z.enum(['low', 'normal', 'high', 'critical']),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
      }),
      handler: async (ctx, input) => {
        const message = (input.message || '').toLowerCase();
        const context = input.context || {};

        // Klíčová slova pro urgency
        const criticalKeywords = [
          'akutní',
          'kritické',
          'okamžitě',
          'urgent',
          'havárie',
          'porucha',
          'nefunguje',
        ];
        const highKeywords = ['důležité', 'co nejdříve', 'rychle', 'potřebuji'];
        const lowKeywords = ['později', 'není spěch', 'kdykoliv', 'volně'];

        let urgency: 'low' | 'normal' | 'high' | 'critical' = 'normal';
        let confidence = 0.5;
        let reasoning = '';

        const criticalScore = criticalKeywords.filter((kw) => message.includes(kw)).length;
        const highScore = highKeywords.filter((kw) => message.includes(kw)).length;
        const lowScore = lowKeywords.filter((kw) => message.includes(kw)).length;

        if (criticalScore > 0) {
          urgency = 'critical';
          confidence = 0.9;
          reasoning = `Critical keywords detected: ${criticalScore}`;
        } else if (highScore > 0) {
          urgency = 'high';
          confidence = 0.7;
          reasoning = `High priority keywords detected: ${highScore}`;
        } else if (lowScore > 0) {
          urgency = 'low';
          confidence = 0.6;
          reasoning = `Low priority keywords detected: ${lowScore}`;
        } else {
          // Zkontrolovat kontext
          if (context.serviceTicket || context.serviceIssue) {
            urgency = 'normal';
            confidence = 0.5;
            reasoning = 'Service context detected, defaulting to normal';
          } else {
            reasoning = 'No urgency indicators found, defaulting to normal';
          }
        }

        return {
          urgency,
          confidence,
          reasoning,
        };
      },
    },
  ];
}
