import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { ToolRegistry, APIKeyManager, OpenAIClientFactory } from '@ai-toolkit/core';
import { registerAllTools } from '@ai-toolkit/tools';
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';
import { getWorkflow } from '@ai-toolkit/workflow-kit';

const prisma = new PrismaClient();
const registry = new ToolRegistry(prisma);

// Registrace všech tools
registerAllTools(registry, prisma);

// Inicializace API Key Manageru (pokud je encryption key nastaven)
let apiKeyManager: APIKeyManager | undefined;
let openaiClientFactory: OpenAIClientFactory | undefined;

try {
  if (process.env.API_KEY_ENCRYPTION_KEY) {
    apiKeyManager = new APIKeyManager(prisma);
    openaiClientFactory = new OpenAIClientFactory(apiKeyManager);
    console.log('✅ API Key Manager initialized (per-tenant API keys enabled)');
  } else {
    console.warn('⚠️  API_KEY_ENCRYPTION_KEY not set - using global OPENAI_API_KEY');
  }
} catch (error) {
  console.warn('⚠️  Failed to initialize API Key Manager:', error);
}

// Inicializace workflow runneru
const workflowRunner = new WorkflowRunner(
  {
    // Per-tenant API key management (pokud je dostupný)
    apiKeyManager,
    openaiClientFactory,
    // Fallback na globální API key (pro backward compatibility)
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  },
  registry,
  prisma
);

const fastify = Fastify({
  logger: true,
});

// CORS
await fastify.register(cors, {
  origin: true,
});

// Helper pro autentizaci (basic API key)
async function authenticate(request: any, reply: any) {
  const apiKey = request.headers['x-api-key'];
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return; // Pokud není nastaven admin key, přeskočíme autentizaci
  }

  if (apiKey !== adminKey) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

// Endpoints

// POST /session/start
fastify.post('/session/start', async (request, reply) => {
  const body = request.body as { leadId?: string; metadata?: Record<string, any> };
  const result = await registry.invokeTool('session.start', {}, body);
  
  if (!result.success) {
    reply.code(400).send({ error: result.error });
    return;
  }

  return result.output;
});

// POST /event/track
fastify.post('/event/track', async (request, reply) => {
  const body = request.body as {
    sessionId?: string;
    leadId?: string;
    type: string;
    payload?: Record<string, any>;
  };
  
  const result = await registry.invokeTool('event.track', {
    sessionId: body.sessionId,
    leadId: body.leadId,
  }, body);

  if (!result.success) {
    reply.code(400).send({ error: result.error });
    return;
  }

  return result.output;
});

// GET /tools
fastify.get('/tools', async () => {
  return {
    tools: registry.listTools(),
  };
});

// POST /tool/invoke (admin only)
fastify.post('/tool/invoke', { preHandler: authenticate }, async (request, reply) => {
  const body = request.body as {
    toolId: string;
    context?: {
      sessionId?: string;
      leadId?: string;
      userId?: string;
      role?: string;
    };
    input: any;
  };

  const result = await registry.invokeTool(
    body.toolId,
    body.context || {},
    body.input
  );

  if (!result.success) {
    reply.code(400).send({ error: result.error });
    return;
  }

  return result.output;
});

// Helper pro získání tenantId z requestu
function getTenantId(request: any): string | undefined {
  // 1. Z headers
  const headerTenantId = request.headers['x-tenant-id'];
  if (headerTenantId) {
    return typeof headerTenantId === 'string' ? headerTenantId : headerTenantId[0];
  }

  // 2. Z subdomain (např. acme-corp.example.com)
  const hostname = request.hostname;
  if (hostname) {
    const parts = hostname.split('.');
    if (parts.length > 2) {
      // Předpokládáme formát: tenant-slug.domain.com
      return parts[0];
    }
  }

  // 3. Z metadata v body
  return request.body?.metadata?.tenantId;
}

// POST /agent/next (Router workflow)
fastify.post('/agent/next', async (request, reply) => {
  const body = request.body as {
    sessionId?: string;
    leadId?: string;
    userMessage: string;
    metadata?: Record<string, unknown>;
    tenantId?: string;
  };

  const workflow = getWorkflow('router');
  if (!workflow) {
    reply.code(500).send({ error: 'Router workflow not found' });
    return;
  }

  // Získej tenantId z requestu
  const tenantId = body.tenantId || getTenantId(request);

  const result = await workflowRunner.runWorkflow(
    'router',
    {
      sessionId: body.sessionId,
      leadId: body.leadId,
      tenantId, // Předá tenantId pro per-tenant API key
      metadata: body.metadata,
    },
    body.userMessage,
    workflow.systemPrompt
  );

  if (result.status === 'failed') {
    reply.code(500).send({ error: result.error });
    return;
  }

  return result.output;
});

// POST /agent/workflow/:id
fastify.post<{ Params: { id: string } }>('/agent/workflow/:id', async (request, reply) => {
  const workflowId = request.params.id;
  const body = request.body as {
    sessionId?: string;
    leadId?: string;
    userMessage: string;
    metadata?: Record<string, unknown>;
    tenantId?: string;
  };

  const workflow = getWorkflow(workflowId);
  if (!workflow) {
    reply.code(404).send({ error: `Workflow "${workflowId}" not found` });
    return;
  }

  // Získej tenantId z requestu
  const tenantId = body.tenantId || getTenantId(request);

  const result = await workflowRunner.runWorkflow(
    workflowId,
    {
      sessionId: body.sessionId,
      leadId: body.leadId,
      tenantId, // Předá tenantId pro per-tenant API key
      metadata: body.metadata,
    },
    body.userMessage,
    workflow.systemPrompt
  );

  if (result.status === 'failed') {
    reply.code(500).send({ error: result.error });
    return;
  }

  return result.output;
});

// GET /admin/audit/tool-calls (admin only)
fastify.get('/admin/audit/tool-calls', { preHandler: authenticate }, async (request) => {
  const query = request.query as {
    toolId?: string;
    sessionId?: string;
    leadId?: string;
    status?: string;
    limit?: string;
    offset?: string;
  };

  const logs = await registry.auditLogger.getLogs({
    toolId: query.toolId,
    sessionId: query.sessionId,
    leadId: query.leadId,
    status: query.status,
    limit: query.limit ? parseInt(query.limit) : undefined,
    offset: query.offset ? parseInt(query.offset) : undefined,
  });

  return { logs };
});

// Admin endpoints pro správu tenant API keys
if (apiKeyManager) {
  // POST /admin/tenant/:tenantId/api-keys
  fastify.post<{ Params: { tenantId: string } }>(
    '/admin/tenant/:tenantId/api-keys',
    { preHandler: authenticate },
    async (request, reply) => {
      const { tenantId } = request.params;
      const body = request.body as {
        provider?: string;
        keyName?: string;
        apiKey: string;
        metadata?: Record<string, unknown>;
      };

      try {
        const keyId = await apiKeyManager.storeAPIKey({
          tenantId,
          provider: body.provider || 'openai',
          keyName: body.keyName || 'default',
          apiKey: body.apiKey,
          metadata: body.metadata,
        });

        return { keyId, message: 'API key stored successfully' };
      } catch (error) {
        reply.code(400).send({
          error: error instanceof Error ? error.message : 'Failed to store API key',
        });
      }
    }
  );

  // GET /admin/tenant/:tenantId/api-keys
  fastify.get<{ Params: { tenantId: string } }>(
    '/admin/tenant/:tenantId/api-keys',
    { preHandler: authenticate },
    async (request) => {
      const { tenantId } = request.params;
      const keys = await apiKeyManager.listAPIKeys(tenantId);
      return { keys };
    }
  );

  // DELETE /admin/tenant/:tenantId/api-keys/:keyId
  fastify.delete<{ Params: { tenantId: string; keyId: string } }>(
    '/admin/tenant/:tenantId/api-keys/:keyId',
    { preHandler: authenticate },
    async (request) => {
      const { keyId } = request.params;
      await apiKeyManager.deactivateAPIKey(keyId);
      return { message: 'API key deactivated' };
    }
  );
}

// GET /admin/workflow-runs (admin only)
fastify.get('/admin/workflow-runs', { preHandler: authenticate }, async (request) => {
  const query = request.query as {
    workflowId?: string;
    sessionId?: string;
    status?: string;
    limit?: string;
    offset?: string;
  };

  const runs = await prisma.workflowRun.findMany({
    where: {
      ...(query.workflowId && { workflowId: query.workflowId }),
      ...(query.sessionId && { sessionId: query.sessionId }),
      ...(query.status && { status: query.status }),
    },
    orderBy: { createdAt: 'desc' },
    take: query.limit ? parseInt(query.limit) : 50,
    skip: query.offset ? parseInt(query.offset) : 0,
  });

  return { runs };
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
