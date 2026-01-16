# API Key Management - Per-Tenant API Keys

## Přehled

Platforma podporuje per-tenant API keys pro OpenAI a další poskytovatele. Každý klient/tenant může mít svůj vlastní API klíč, který je bezpečně šifrovaný a uložený v databázi.

## Architektura

### Komponenty

1. **Tenant Model** - Reprezentuje klienta/tenanta
2. **TenantAPIKey Model** - Šifrované API klíče per tenant
3. **APIKeyManager** - Správa API klíčů (šifrování/dešifrování)
4. **OpenAIClientFactory** - Factory pro vytváření OpenAI klientů s per-tenant keys

### Bezpečnost

- API klíče jsou šifrované pomocí **AES-256-GCM**
- Encryption key je uložen v `API_KEY_ENCRYPTION_KEY` environment variable
- API klíče jsou hashované pro rychlé vyhledávání (bez dešifrování)

## Setup

### 1. Vygeneruj Encryption Key

```bash
# Vygeneruj 32-byte encryption key
openssl rand -base64 32
```

### 2. Nastav Environment Variable

```env
API_KEY_ENCRYPTION_KEY="your-generated-key-here"
```

### 3. Database Migration

```bash
pnpm prisma:migrate dev --name add_tenant_api_keys
```

## Použití

### 1. Vytvoření Tenanta

```typescript
import { APIKeyManager } from '@ai-toolkit/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apiKeyManager = new APIKeyManager(prisma);

// Vytvoř tenanta
await apiKeyManager.upsertTenant(
  'tenant-123',
  'Acme Corp',
  'acme-corp',
  { industry: 'retail' }
);
```

### 2. Uložení API Klíče

```typescript
// Ulož OpenAI API klíč pro tenanta
await apiKeyManager.storeAPIKey({
  tenantId: 'tenant-123',
  provider: 'openai',
  keyName: 'production',
  apiKey: 'sk-...',
  metadata: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
  },
});
```

### 3. Použití v WorkflowRunner

```typescript
import { WorkflowRunner } from '@ai-toolkit/openai-runtime';
import { APIKeyManager, OpenAIClientFactory } from '@ai-toolkit/core';

const apiKeyManager = new APIKeyManager(prisma);
const openaiClientFactory = new OpenAIClientFactory(apiKeyManager);

const workflowRunner = new WorkflowRunner(
  {
    apiKeyManager, // Nebo openaiClientFactory
    defaultTenantId: 'tenant-123', // Volitelné
    model: 'gpt-4-turbo-preview',
  },
  registry,
  prisma
);

// Workflow automaticky použije API key z tenantId v contextu
const result = await workflowRunner.runWorkflow(
  'router',
  {
    sessionId: 'session-123',
    tenantId: 'tenant-123', // API key se načte automaticky
  },
  'Hello'
);
```

### 4. Použití v API Gateway

```typescript
import { APIKeyManager } from '@ai-toolkit/core';

const apiKeyManager = new APIKeyManager(prisma);

// Middleware pro automatické načítání tenantId
fastify.addHook('onRequest', async (request, reply) => {
  // Získej tenantId z headers, subdomain, nebo JWT tokenu
  const tenantId = request.headers['x-tenant-id'] || 
                   getTenantFromSubdomain(request.hostname);
  
  if (tenantId) {
    request.tenantId = tenantId;
  }
});

// Endpoint pro uložení API klíče (admin only)
fastify.post('/admin/tenant/:tenantId/api-keys', { preHandler: authenticate }, async (request, reply) => {
  const { tenantId } = request.params;
  const { provider, keyName, apiKey, metadata } = request.body;

  const keyId = await apiKeyManager.storeAPIKey({
    tenantId,
    provider: provider || 'openai',
    keyName: keyName || 'default',
    apiKey,
    metadata,
  });

  return { keyId };
});
```

## API Endpoints

### POST /admin/tenant/:tenantId/api-keys
Uloží API klíč pro tenanta.

**Request:**
```json
{
  "provider": "openai",
  "keyName": "production",
  "apiKey": "sk-...",
  "metadata": {
    "model": "gpt-4-turbo-preview",
    "temperature": 0.7
  }
}
```

### GET /admin/tenant/:tenantId/api-keys
Vrací seznam API klíčů pro tenanta (bez dešifrování).

### DELETE /admin/tenant/:tenantId/api-keys/:keyId
Deaktivuje API klíč.

## Migration z globálního API klíče

### Před (starý způsob)
```typescript
const workflowRunner = new WorkflowRunner(
  {
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  registry,
  prisma
);
```

### Po (nový způsob)
```typescript
const apiKeyManager = new APIKeyManager(prisma);
const workflowRunner = new WorkflowRunner(
  {
    apiKeyManager,
    // Fallback pro backward compatibility
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  registry,
  prisma
);
```

## Best Practices

1. **Encryption Key Management**
   - Nikdy necommituj encryption key do Gitu
   - Použij secret management (AWS Secrets Manager, HashiCorp Vault, atd.)
   - Rotuj encryption key pravidelně

2. **API Key Rotation**
   - Pravidelně rotuj API klíče
   - Použij `keyName` pro různé prostředí (production, staging, development)
   - Deaktivuj staré klíče místo mazání

3. **Tenant Isolation**
   - Vždy ověřuj tenantId v middleware
   - Použij tenantId z JWT tokenu nebo subdomain
   - Nikdy neposílej tenantId z client-side

4. **Monitoring**
   - Sleduj `lastUsedAt` pro detekci neaktivních klíčů
   - Loguj všechny API key operace
   - Nastav alerts pro neobvyklé použití

## Troubleshooting

### "API_KEY_ENCRYPTION_KEY environment variable is required"
Nastav `API_KEY_ENCRYPTION_KEY` environment variable s 32-byte klíčem.

### "No API key found for tenant"
Zkontroluj, zda je API klíč uložen pro daného tenanta:
```typescript
const keys = await apiKeyManager.listAPIKeys('tenant-123');
console.log(keys);
```

### "Invalid encrypted data format"
Encryption key se změnil nebo data jsou poškozená. Musíš znovu uložit API klíče.

## Security Considerations

- ✅ API klíče jsou šifrované v databázi
- ✅ Encryption key je v environment variable
- ✅ API klíče jsou hashované pro rychlé vyhledávání
- ⚠️ Encryption key musí být bezpečně uložen
- ⚠️ Rotuj encryption key pravidelně
- ⚠️ Použij HTTPS pro všechny API komunikace
