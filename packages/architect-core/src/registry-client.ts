/**
 * Registry Client
 * 
 * Adapter pro čtení z Tool Registry (read-only)
 */

import { ToolRegistryV2, ToolContract } from '@ai-toolkit/core';

/**
 * Registry Client - read-only přístup k Tool Registry
 */
export class RegistryClient {
  constructor(private registry: ToolRegistryV2) {}

  /**
   * Získá všechny dostupné tools
   */
  listTools(): ToolContract[] {
    // Použít listTools pokud existuje, jinak getOpenAITools
    if ('listTools' in this.registry && typeof this.registry.listTools === 'function') {
      const metadata = this.registry.listTools();
      const tools: ToolContract[] = [];
      for (const meta of metadata) {
        const tool = this.registry.getTool(meta.id);
        if (tool) {
          tools.push(tool);
        }
      }
      return tools;
    }

    // Fallback: použít getOpenAITools
    const openAITools = this.registry.getOpenAITools();
    const tools: ToolContract[] = [];

    for (const openAITool of openAITools) {
      const toolId = this.registry.openAINameToToolId(openAITool.function.name);
      const tool = this.registry.getTool(toolId);
      if (tool) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Získá tool podle ID
   */
  getTool(toolId: string): ToolContract | null {
    return this.registry.getTool(toolId);
  }

  /**
   * Získá tools podle kategorie
   */
  getToolsByCategory(category: string): ToolContract[] {
    return this.listTools().filter((tool) => tool.category === category);
  }

  /**
   * Získá tools podle tagů
   */
  getToolsByTags(tags: string[]): ToolContract[] {
    return this.listTools().filter((tool) =>
      tags.some((tag) => tool.tags?.includes(tag))
    );
  }

  /**
   * Získá metadata toolu
   */
  getToolMetadata(toolId: string): {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    riskLevel: string;
    piiLevel: string;
    idempotency: string;
    inputs: unknown;
    outputs: unknown;
  } | null {
    const tool = this.getTool(toolId);
    if (!tool) {
      return null;
    }

    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category || 'unknown',
      tags: tool.tags || [],
      riskLevel: tool.riskLevel,
      piiLevel: tool.piiLevel,
      idempotency: tool.idempotency,
      inputs: tool.inputSchema,
      outputs: tool.outputSchema,
    };
  }
}
