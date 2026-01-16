import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from '@ai-toolkit/core';
import {
  MockCRMAdapter,
  MockEmailAdapter,
  MockStorageAdapter,
} from '@ai-toolkit/adapters';
import { createSessionTools } from './tools/session';
import { createLeadTools } from './tools/lead';
import { createEventTools } from './tools/event';
import { createCatalogTools } from './tools/catalog';
import { createTemplateTools } from './tools/template';
import { createMessageTools } from './tools/message';
import { createCRMTools } from './tools/crm';
import { createPricingTools } from './tools/pricing';
import { createVerifyTools } from './tools/verify';
import { createCartTools } from './tools/cart';
import { createOrderTools } from './tools/order';
import { createProductTools } from './tools/product';
import { createCheckoutTools } from './tools/checkout';
import { createIntentTools } from './tools/intent';
import { createQuoteTools } from './tools/quote';
import { createServiceTools } from './tools/service';

/**
 * Registruje všechny built-in tools do registry
 */
export function registerAllTools(registry: ToolRegistry, prisma: PrismaClient): void {
  // Adapters
  const crmAdapter = new MockCRMAdapter();
  const emailAdapter = new MockEmailAdapter();
  const storageAdapter = new MockStorageAdapter();

  // Registrace tools
  createSessionTools(prisma).forEach((tool) => registry.register(tool));
  createLeadTools(prisma).forEach((tool) => registry.register(tool));
  createEventTools(prisma).forEach((tool) => registry.register(tool));
  createCatalogTools(prisma).forEach((tool) => registry.register(tool));
  createTemplateTools(prisma).forEach((tool) => registry.register(tool));
  createMessageTools(prisma, emailAdapter).forEach((tool) => registry.register(tool));
  createCRMTools(prisma, crmAdapter).forEach((tool) => registry.register(tool));
  createPricingTools().forEach((tool) => registry.register(tool));
  createVerifyTools(storageAdapter).forEach((tool) => registry.register(tool));
  
  // E-commerce tools
  createCartTools(prisma).forEach((tool) => registry.register(tool));
  createOrderTools(prisma).forEach((tool) => registry.register(tool));
  createProductTools(prisma).forEach((tool) => registry.register(tool));
  createCheckoutTools(prisma).forEach((tool) => registry.register(tool));
  createIntentTools(prisma).forEach((tool) => registry.register(tool));
  createQuoteTools(prisma).forEach((tool) => registry.register(tool));
  createServiceTools(prisma).forEach((tool) => registry.register(tool));
}

export * from './tools/session';
export * from './tools/lead';
export * from './tools/event';
export * from './tools/catalog';
export * from './tools/template';
export * from './tools/message';
export * from './tools/crm';
export * from './tools/pricing';
export * from './tools/verify';
export * from './tools/cart';
export * from './tools/order';
export * from './tools/product';
export * from './tools/checkout';
export * from './tools/intent';
export * from './tools/quote';
export * from './tools/service';
