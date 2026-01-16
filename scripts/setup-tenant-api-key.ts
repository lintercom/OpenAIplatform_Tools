#!/usr/bin/env tsx

/**
 * CLI script pro nastavení API klíče pro tenanta
 * 
 * Usage:
 *   pnpm setup-tenant-api-key <tenant-slug> <api-key> [key-name]
 * 
 * Example:
 *   pnpm setup-tenant-api-key acme-corp sk-... production
 */

import { PrismaClient } from '@prisma/client';
import { APIKeyManager } from '../packages/toolkit-core/src/api-key-manager';

const tenantSlug = process.argv[2];
const apiKey = process.argv[3];
const keyName = process.argv[4] || 'default';

if (!tenantSlug || !apiKey) {
  console.error('Usage: pnpm setup-tenant-api-key <tenant-slug> <api-key> [key-name]');
  console.error('Example: pnpm setup-tenant-api-key acme-corp sk-... production');
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const apiKeyManager = new APIKeyManager(prisma);

  try {
    // Získej nebo vytvoř tenanta
    let tenant = await apiKeyManager.getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      // Vytvoř nového tenanta
      const tenantId = `tenant-${Date.now()}`;
      await apiKeyManager.upsertTenant(
        tenantId,
        tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1),
        tenantSlug
      );
      tenant = await apiKeyManager.getTenantBySlug(tenantSlug);
      
      if (!tenant) {
        throw new Error('Failed to create tenant');
      }
    }

    // Ulož API klíč
    const keyId = await apiKeyManager.storeAPIKey({
      tenantId: tenant.id,
      provider: 'openai',
      keyName,
      apiKey,
      metadata: {
        model: 'gpt-4-turbo-preview',
      },
    });

    console.log('✅ API key stored successfully!');
    console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
    console.log(`   Key ID: ${keyId}`);
    console.log(`   Key Name: ${keyName}`);
    console.log(`   Provider: openai`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
