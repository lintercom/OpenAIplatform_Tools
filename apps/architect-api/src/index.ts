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

// POST /sessions
fastify.post('/sessions', async (request, reply) => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session: ArchitectSession = {
    id: sessionId,
    brief: {},
    artifacts: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  sessions.set(sessionId, session);

  return { sessionId };
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

    // TODO: Zpracovat message pomocí LLM a questionnaire engine
    // Pro teď: jednoduchá logika
    const nextQuestion = questionnaire.getNextQuestion(session.brief);

    if (nextQuestion) {
      // Uložit odpověď do briefu (zjednodušené)
      // V produkci by se použil LLM pro parsing
      return {
        response: nextQuestion.text,
        question: nextQuestion,
        artifacts: null,
      };
    }

    // Brief je kompletní - generovat plán
    const brief = ProjectBriefSchema.parse(session.brief);

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
    const markdown = this.exportToMarkdown(session.artifacts);
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
