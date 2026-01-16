/**
 * Blueprint Schema
 * 
 * Definuje strukturu systému: moduly, entity, eventy, integrace, experiences
 */

import { z } from 'zod';

export const ModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  boundedContext: z.string(), // DDD bounded context
  entities: z.array(z.string()), // Entity IDs
  events: z.array(z.string()), // Event IDs
  integrations: z.array(z.string()), // Integration IDs
});

export const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  moduleId: z.string(),
  attributes: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(true),
    description: z.string().optional(),
  })),
  relationships: z.array(z.object({
    targetEntityId: z.string(),
    type: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
    description: z.string().optional(),
  })).optional(),
});

export const EventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  moduleId: z.string(),
  payload: z.record(z.any()), // JSON Schema
  triggers: z.array(z.string()).optional(), // What triggers this event
  subscribers: z.array(z.string()).optional(), // What subscribes to this event
});

export const IntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['api', 'webhook', 'queue', 'database', 'file']),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']),
  moduleId: z.string(),
  endpoint: z.string().optional(),
  authType: z.enum(['none', 'api-key', 'oauth', 'basic']).optional(),
  schema: z.record(z.any()).optional(), // Request/response schema
});

export const ExperienceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['web', 'admin', 'agent', 'api', 'mobile']),
  description: z.string(),
  userRoles: z.array(z.string()),
  features: z.array(z.string()),
  uiComponents: z.array(z.object({
    type: z.string(),
    description: z.string(),
    requiredFields: z.array(z.string()).optional(),
  })).optional(),
});

export const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  modules: z.array(ModuleSchema),
  entities: z.array(EntitySchema),
  events: z.array(EventSchema),
  integrations: z.array(IntegrationSchema),
  experiences: z.array(ExperienceSchema),
  metadata: z.record(z.any()).optional(),
});

export type Module = z.infer<typeof ModuleSchema>;
export type Entity = z.infer<typeof EntitySchema>;
export type Event = z.infer<typeof EventSchema>;
export type Integration = z.infer<typeof IntegrationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
