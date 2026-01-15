/**
 * Helper funkce pro práci s OpenAI API reference dokumentací
 * 
 * Tyto funkce pomáhají při vytváření tools a integrací s OpenAI API.
 */

import { PrismaClient } from '@prisma/client';

export class APIReferenceHelper {
  constructor(private prisma: PrismaClient) {}

  /**
   * Získá dokumentaci pro konkrétní OpenAI API endpoint
   */
  async getEndpointDocs(endpoint: string): Promise<Array<{
    url: string;
    title: string;
    content: string;
  }>> {
    // Normalizace endpoint názvu
    const normalized = endpoint.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const results = await this.prisma.openAIDoc.findMany({
      where: {
        OR: [
          { url: { contains: `/api-reference/${normalized}` } },
          { url: { contains: `/api-reference/${endpoint.toLowerCase()}` } },
          { title: { contains: endpoint, mode: 'insensitive' } },
        ],
      },
      orderBy: { fetchedAt: 'desc' },
      take: 10,
    });

    return results.map((doc) => ({
      url: doc.url,
      title: doc.title,
      content: doc.text,
    }));
  }

  /**
   * Získá příklady použití pro API endpoint
   */
  async getAPIExamples(endpoint: string): Promise<string> {
    const docs = await this.getEndpointDocs(endpoint);
    
    // Hledání code blocks v dokumentaci
    let examples = '';
    for (const doc of docs) {
      // Extrakce code blocks (jednoduchá regex, v produkci by bylo lepší parsovat HTML)
      const codeBlockRegex = /```[\s\S]*?```/g;
      const matches = doc.content.match(codeBlockRegex);
      if (matches) {
        examples += `\n## ${doc.title}\n\n${matches.join('\n\n')}\n`;
      }
    }

    return examples || 'No examples found';
  }

  /**
   * Generuje TypeScript interface pro API endpoint na základě dokumentace
   */
  async generateTypeScriptInterface(endpoint: string): Promise<string> {
    const docs = await this.getEndpointDocs(endpoint);
    
    // Jednoduchý parser pro generování TypeScript interface
    // V produkci by bylo lepší použít proper parser nebo LLM
    let interfaceCode = `// Generated interface for ${endpoint}\n`;
    interfaceCode += `// Based on OpenAI API documentation\n\n`;
    interfaceCode += `export interface ${this.toPascalCase(endpoint)}Request {\n`;
    interfaceCode += `  // TODO: Add fields based on API documentation\n`;
    interfaceCode += `}\n\n`;
    interfaceCode += `export interface ${this.toPascalCase(endpoint)}Response {\n`;
    interfaceCode += `  // TODO: Add fields based on API documentation\n`;
    interfaceCode += `}\n`;

    return interfaceCode;
  }

  /**
   * Získá všechny dostupné API endpoints z dokumentace
   */
  async listAvailableEndpoints(): Promise<string[]> {
    const results = await this.prisma.openAIDoc.findMany({
      where: {
        url: { contains: '/api-reference/' },
      },
      select: { url: true },
    });

    const endpoints = new Set<string>();
    for (const doc of results) {
      const match = doc.url.match(/\/api-reference\/([^\/]+)/);
      if (match && match[1] !== 'introduction' && match[1] !== 'authentication') {
        endpoints.add(match[1]);
      }
    }

    return Array.from(endpoints).sort();
  }

  /**
   * Vytvoří prompt pack pro vytváření toolu, který používá OpenAI API endpoint
   */
  async generateToolCreationPrompt(endpoint: string, toolPurpose: string): Promise<string> {
    const docs = await this.getEndpointDocs(endpoint);
    const examples = await this.getAPIExamples(endpoint);

    let prompt = `# Tool Creation Guide: ${endpoint}\n\n`;
    prompt += `## Purpose\n${toolPurpose}\n\n`;
    prompt += `## OpenAI API Endpoint\n${endpoint}\n\n`;
    prompt += `## Documentation\n\n`;
    
    for (const doc of docs.slice(0, 3)) {
      prompt += `### ${doc.title}\n${doc.content.substring(0, 500)}...\n\n`;
    }

    prompt += `## Code Examples\n${examples}\n\n`;
    prompt += `## Implementation Steps\n`;
    prompt += `1. Create tool definition with Zod schema\n`;
    prompt += `2. Implement handler that calls OpenAI API\n`;
    prompt += `3. Add error handling and validation\n`;
    prompt += `4. Register tool in Tool Registry\n`;
    prompt += `5. Add tests\n`;

    return prompt;
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
