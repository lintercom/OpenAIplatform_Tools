import OpenAI from 'openai';
import { APIKeyManager, DecryptedAPIKey } from './api-key-manager';

/**
 * OpenAI Client Factory - Vytváří OpenAI klienty s API key z tenant konfigurace
 */

export interface OpenAIClientConfig {
  tenantId?: string;
  provider?: string;
  keyName?: string;
  // Fallback - pokud není tenantId, použije se tento klíč
  fallbackApiKey?: string;
  model?: string;
  temperature?: number;
}

/**
 * Factory pro vytváření OpenAI klientů s per-tenant API keys
 */
export class OpenAIClientFactory {
  constructor(private apiKeyManager: APIKeyManager) {}

  /**
   * Vytvoří OpenAI klienta s API key z tenant konfigurace
   */
  async createClient(config: OpenAIClientConfig): Promise<OpenAI> {
    let apiKey: string | undefined;

    // 1. Pokud je tenantId, načti API key z databáze
    if (config.tenantId) {
      const decryptedKey = await this.apiKeyManager.getAPIKey(
        config.tenantId,
        config.provider || 'openai',
        config.keyName
      );

      if (decryptedKey) {
        apiKey = decryptedKey.apiKey;
      } else {
        throw new Error(
          `No API key found for tenant "${config.tenantId}" and provider "${config.provider || 'openai'}"`
        );
      }
    }

    // 2. Fallback na environment variable nebo config
    if (!apiKey) {
      apiKey = config.fallbackApiKey || process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error(
        'OpenAI API key is required. Either provide tenantId with stored key, ' +
        'fallbackApiKey, or set OPENAI_API_KEY environment variable.'
      );
    }

    return new OpenAI({
      apiKey,
    });
  }

  /**
   * Vytvoří OpenAI klienta synchronně (pouze pokud je fallback key)
   * Pro async načítání použij createClient
   */
  createClientSync(config: { apiKey: string }): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey,
    });
  }
}
