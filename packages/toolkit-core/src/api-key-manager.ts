import { PrismaClient } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * API Key Manager - Bezpečné ukládání a načítání API klíčů per tenant
 * 
 * API klíče jsou šifrované pomocí AES-256-GCM a ukládány v databázi.
 * Encryption key by měl být uložen v environment variable.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;

export interface TenantAPIKeyConfig {
  tenantId: string;
  provider: 'openai' | 'anthropic' | string;
  keyName: string;
  apiKey: string;
  metadata?: {
    model?: string;
    temperature?: number;
    [key: string]: unknown;
  };
}

export interface DecryptedAPIKey {
  apiKey: string;
  metadata?: Record<string, unknown>;
}

/**
 * API Key Manager
 */
export class APIKeyManager {
  private encryptionKey: Buffer;

  constructor(
    private prisma: PrismaClient,
    encryptionKey?: string
  ) {
    // Encryption key z environment variable nebo použij default (pro development)
    const envKey = process.env.API_KEY_ENCRYPTION_KEY;
    if (!envKey && !encryptionKey) {
      throw new Error(
        'API_KEY_ENCRYPTION_KEY environment variable is required. ' +
        'Generate one with: openssl rand -base64 32'
      );
    }

    // Convert encryption key to buffer (must be 32 bytes for AES-256)
    const keyString = encryptionKey || envKey || '';
    this.encryptionKey = Buffer.from(
      createHash('sha256').update(keyString).digest()
    );
  }

  /**
   * Šifruje API klíč
   */
  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Format: iv:tag:encrypted
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  /**
   * Dešifruje API klíč
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Vytvoří hash z API klíče (pro rychlé vyhledávání)
   */
  private hashKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
  }

  /**
   * Uloží API klíč pro tenanta
   */
  async storeAPIKey(config: TenantAPIKeyConfig): Promise<string> {
    const encryptedKey = this.encrypt(config.apiKey);
    const keyHash = this.hashKey(config.apiKey);

    // Zkontroluj, zda tenant existuje
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: config.tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant with id "${config.tenantId}" not found`);
    }

    // Ulož nebo aktualizuj API klíč
    const apiKeyRecord = await this.prisma.tenantAPIKey.upsert({
      where: {
        tenantId_provider_keyName: {
          tenantId: config.tenantId,
          provider: config.provider,
          keyName: config.keyName,
        },
      },
      create: {
        tenantId: config.tenantId,
        provider: config.provider,
        keyName: config.keyName,
        encryptedKey,
        keyHash,
        active: true,
        metadata: config.metadata || {},
      },
      update: {
        encryptedKey,
        keyHash,
        metadata: config.metadata || {},
        updatedAt: new Date(),
      },
    });

    return apiKeyRecord.id;
  }

  /**
   * Načte a dešifruje API klíč pro tenanta
   */
  async getAPIKey(
    tenantId: string,
    provider: string = 'openai',
    keyName?: string
  ): Promise<DecryptedAPIKey | null> {
    const where: {
      tenantId: string;
      provider: string;
      active: boolean;
      keyName?: string;
    } = {
      tenantId,
      provider,
      active: true,
    };

    if (keyName) {
      where.keyName = keyName;
    }

    const apiKeyRecord = await this.prisma.tenantAPIKey.findFirst({
      where,
      orderBy: { lastUsedAt: 'desc' }, // Použij nejnověji používaný klíč
    });

    if (!apiKeyRecord) {
      return null;
    }

    // Aktualizuj lastUsedAt
    await this.prisma.tenantAPIKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Dešifruj klíč
    const decryptedKey = this.decrypt(apiKeyRecord.encryptedKey);

    return {
      apiKey: decryptedKey,
      metadata: apiKeyRecord.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Vrací všechny API klíče pro tenanta (bez dešifrování)
   */
  async listAPIKeys(tenantId: string): Promise<Array<{
    id: string;
    provider: string;
    keyName: string;
    active: boolean;
    lastUsedAt: Date | null;
    metadata: unknown;
  }>> {
    const keys = await this.prisma.tenantAPIKey.findMany({
      where: { tenantId, active: true },
      select: {
        id: true,
        provider: true,
        keyName: true,
        active: true,
        lastUsedAt: true,
        metadata: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return keys;
  }

  /**
   * Deaktivuje API klíč
   */
  async deactivateAPIKey(id: string): Promise<void> {
    await this.prisma.tenantAPIKey.update({
      where: { id },
      data: { active: false },
    });
  }

  /**
   * Vytvoří nebo aktualizuje tenanta
   */
  async upsertTenant(
    id: string,
    name: string,
    slug: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const tenant = await this.prisma.tenant.upsert({
      where: { id },
      create: {
        id,
        name,
        slug,
        active: true,
        metadata: metadata || {},
      },
      update: {
        name,
        slug,
        metadata: metadata || {},
        updatedAt: new Date(),
      },
    });

    return tenant.id;
  }

  /**
   * Vrací tenanta podle slug
   */
  async getTenantBySlug(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    active: boolean;
  } | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
      },
    });

    return tenant;
  }
}
