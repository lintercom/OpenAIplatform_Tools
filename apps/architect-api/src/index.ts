/**
 * Architect API
 * 
 * Backend API pro Architect - system architecture planning tool
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { ToolRegistryV2 } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';
import {
  QuestionnaireEngine,
  CapabilityPlanner,
  OrchestrationPlanner,
  DeliveryPlanner,
  PlanValidator,
  RegistryClient,
  ADRGenerator,
  ProjectBrief,
  ProjectBriefSchema,
} from '@ai-toolkit/architect-core';
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const registry = new ToolRegistryV2(prisma);
registerAllTools(registry, prisma);

const registryClient = new RegistryClient(registry);
const questionnaire = new QuestionnaireEngine();
const capabilityPlanner = new CapabilityPlanner(registryClient);
const orchestrationPlanner = new OrchestrationPlanner();
const deliveryPlanner = new DeliveryPlanner();
const validator = new PlanValidator(registryClient);
const adrGenerator = new ADRGenerator();

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: true,
});

// Session storage (v produkci by bylo v DB)
interface ArchitectSession {
  id: string;
  brief: Partial<ProjectBrief>;
  artifacts: {
    blueprint?: any;
    topology?: any;
    workflows?: any;
    plan?: any;
    adrs?: any[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const sessions = new Map<string, ArchitectSession>();

// OpenAI client storage (per session)
const openaiClients = new Map<string, OpenAI>();

// POST /sessions
fastify.post<{ Body?: { openaiApiKey?: string } }>('/sessions', async (request, reply) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: ArchitectSession = {
    id: sessionId,
    brief: {},
    artifacts: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  sessions.set(sessionId, session);

  // Pokud je poskytnut API key, uložit ho
  if (request.body?.openaiApiKey) {
    openaiClients.set(sessionId, new OpenAI({ apiKey: request.body.openaiApiKey }));
  } else if (process.env.OPENAI_API_KEY) {
    // Fallback na env variable
    openaiClients.set(sessionId, new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
  }

  return { sessionId, hasApiKey: openaiClients.has(sessionId) };
});

// POST /sessions/:id/api-key
fastify.post<{ Params: { id: string }; Body: { apiKey: string } }>(
  '/sessions/:id/api-key',
  async (request, reply) => {
    const { id } = request.params;
    const { apiKey } = request.body;

    const session = sessions.get(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    openaiClients.set(id, new OpenAI({ apiKey }));
    return { success: true, message: 'API key saved' };
  }
);

// GET /sessions/:id/api-key-status
fastify.get<{ Params: { id: string } }>('/sessions/:id/api-key-status', async (request, reply) => {
  const { id } = request.params;
  return { hasApiKey: openaiClients.has(id) };
});

// POST /sessions/:id/messages
fastify.post<{ Params: { id: string }; Body: { message: string } }>(
  '/sessions/:id/messages',
  async (request, reply) => {
    const { id } = request.params;
    const { message } = request.body;

    const session = sessions.get(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    // Získat OpenAI klienta pro tuto session
    const openai = openaiClients.get(id);
    if (!openai) {
      return reply.code(400).send({
        error: 'OpenAI API key not set',
        message: 'Please set OpenAI API key first using POST /sessions/:id/api-key',
      });
    }

    // Zpracovat message pomocí LLM a questionnaire engine
    const nextQuestion = questionnaire.getNextQuestion(session.brief);

    if (nextQuestion) {
      // Použít LLM pro parsing odpovědi a uložení do briefu
      try {
        const llmResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: `Jsi asistent, který parsuje odpovědi uživatele a ukládá je do strukturovaného formátu.
Otázka: ${nextQuestion.text}
Typ odpovědi: ${nextQuestion.type}
Field: ${nextQuestion.field}

Vrať JSON s hodnotou pro uložení do field. Pro boolean vrať true/false, pro number vrať číslo, pro multi-choice vrať pole.`,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          response_format: { type: 'json_object' },
        });

        const parsed = JSON.parse(llmResponse.choices[0]?.message?.content || '{}');
        const value = parsed.value || parsed;

        // Uložit do briefu
        if (nextQuestion.field) {
          const fieldParts = nextQuestion.field.split('.');
          let target: any = session.brief;
          for (let i = 0; i < fieldParts.length - 1; i++) {
            const part = fieldParts[i];
            if (!target[part]) {
              target[part] = {};
            }
            target = target[part];
          }
          const lastPart = fieldParts[fieldParts.length - 1];
          target[lastPart] = value;
        }
      } catch (error) {
        // Fallback: jednoduché parsing
        if (nextQuestion.field) {
          const fieldParts = nextQuestion.field.split('.');
          let target: any = session.brief;
          for (let i = 0; i < fieldParts.length - 1; i++) {
            const part = fieldParts[i];
            if (!target[part]) {
              target[part] = {};
            }
            target = target[part];
          }
          const lastPart = fieldParts[fieldParts.length - 1];
          if (nextQuestion.type === 'boolean') {
            target[lastPart] = message.toLowerCase().includes('ano') || message.toLowerCase().includes('yes');
          } else if (nextQuestion.type === 'number') {
            const num = parseFloat(message);
            if (!isNaN(num)) {
              target[lastPart] = num;
            }
          } else if (nextQuestion.type === 'multi-choice') {
            if (!Array.isArray(target[lastPart])) {
              target[lastPart] = [];
            }
            target[lastPart].push(message);
          } else {
            target[lastPart] = message;
          }
        }
      }

      return {
        response: nextQuestion.text,
        question: nextQuestion,
        artifacts: null,
      };
    }

    // Brief je kompletní - generovat plán pomocí LLM
    // Nejdřív použít LLM pro doplnění chybějících informací
    let enhancedBrief = { ...session.brief };

    try {
      const llmResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `Jsi asistent pro doplnění Project Brief. Uživatel poskytl následující informace.
Doplni chybějící povinná pole a vrať kompletní Project Brief jako JSON podle schema.`,
          },
          {
            role: 'user',
            content: `Aktuální brief: ${JSON.stringify(session.brief, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(llmResponse.choices[0]?.message?.content || '{}');
      enhancedBrief = { ...enhancedBrief, ...parsed };
    } catch (error) {
      console.error('LLM enhancement failed:', error);
      // Pokračovat s původním briefem
    }

    const brief = ProjectBriefSchema.parse(enhancedBrief);

    // Planning pipeline
    const capabilityPlan = capabilityPlanner.plan(brief);
    const topology = orchestrationPlanner.createToolTopology(capabilityPlan.existingTools, brief);
    const workflows = orchestrationPlanner.createWorkflowCatalog(capabilityPlan, brief);
    const plan = deliveryPlanner.createImplementationPlan(brief, capabilityPlan, topology, workflows);

    // Generate ADRs
    const features = capabilityPlan.existingTools.map((tool) => ({
      feature: tool.name,
      useCase: tool.description,
      constraints: {
        dataQuality: brief.dataQuality?.completeness || 'medium',
        frequency: brief.realtime?.required ? 'realtime' : 'batch',
        uxNeeds: brief.uxNeeds || {
          personalization: false,
          recommendations: false,
          naturalLanguage: false,
        },
        risk: 'medium',
      },
    }));

    const adrs = adrGenerator.generateADRs(features, brief);

    // Validate
    const validation = validator.validateImplementationPlan(plan);

    // Uložit artifacts
    session.artifacts = {
      blueprint: null, // TODO: Generate blueprint
      topology,
      workflows,
      plan,
      adrs,
    };
    session.updatedAt = new Date();

    return {
      response: 'Plán byl úspěšně vygenerován!',
      question: null,
      artifacts: session.artifacts,
      validation,
    };
  }
);

// GET /sessions/:id/artifacts
fastify.get<{ Params: { id: string } }>('/sessions/:id/artifacts', async (request, reply) => {
  const { id } = request.params;
  const session = sessions.get(id);

  if (!session) {
    return reply.code(404).send({ error: 'Session not found' });
  }

  return session.artifacts;
});

// POST /sessions/:id/export
fastify.post<{ Params: { id: string }; Body: { format: 'json' | 'markdown' } }>(
  '/sessions/:id/export',
  async (request, reply) => {
    const { id } = request.params;
    const { format } = request.body;

    const session = sessions.get(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    if (format === 'json') {
      return session.artifacts;
    }

    // Markdown export (zjednodušené)
    const markdown = exportToMarkdown(session.artifacts);
    return { markdown };
  }
);

function exportToMarkdown(artifacts: any): string {
  let md = '# Implementation Plan\n\n';

  if (artifacts.plan) {
    md += `## ${artifacts.plan.name}\n\n`;
    md += `${artifacts.plan.description}\n\n`;

    for (const epic of artifacts.plan.epics || []) {
      md += `### ${epic.name}\n\n`;
      md += `${epic.description}\n\n`;

      for (const story of epic.stories || []) {
        md += `#### ${story.name}\n\n`;
        md += `${story.description}\n\n`;
        md += `**Priority:** ${story.priority}\n\n`;
        md += `**Tasks:**\n\n`;
        for (const task of story.tasks || []) {
          md += `- ${task.name}\n`;
        }
        md += '\n';
      }
    }
  }

  return md;
}

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '0.0.0.0';

try {
  await fastify.listen({ port, host });
  console.log(`✅ Architect API listening on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
