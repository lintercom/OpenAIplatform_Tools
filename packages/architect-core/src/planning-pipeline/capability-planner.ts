/**
 * Capability Planner
 * 
 * Fáze 1: Načte Tool Registry a vybere existující tooly
 */

import { RegistryClient } from '../registry-client';
import { ToolContract } from '@ai-toolkit/tool-contract';
import { ProjectBrief } from '../schemas/project-brief';
import { Blueprint } from '../schemas/blueprint';

export interface NewToolSpec {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredCapabilities: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface CapabilityPlan {
  existingTools: ToolContract[];
  newToolSpecs: NewToolSpec[];
  missingCapabilities: string[];
}

/**
 * Capability Planner
 * 
 * Plánuje, které tools jsou potřeba
 */
export class CapabilityPlanner {
  constructor(private registryClient: RegistryClient) {}

  /**
   * Vytvoří capability plan z briefu
   */
  plan(brief: ProjectBrief): CapabilityPlan {
    const allTools = this.registryClient.listTools();
    const existingTools: ToolContract[] = [];
    const newToolSpecs: NewToolSpec[] = [];
    const missingCapabilities: string[] = [];

    // Analýza briefu a výběr relevantních tools
    const requiredCapabilities = this.extractCapabilities(brief);

    for (const capability of requiredCapabilities) {
      const matchingTools = this.findToolsForCapability(capability, allTools);

      if (matchingTools.length > 0) {
        existingTools.push(...matchingTools);
      } else {
        // Potřebujeme nový tool
        newToolSpecs.push({
          id: `tool.${capability.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${capability} Tool`,
          description: `Tool for ${capability} capability`,
          category: this.inferCategory(capability),
          requiredCapabilities: [capability],
          estimatedComplexity: this.estimateComplexity(capability),
        });
        missingCapabilities.push(capability);
      }
    }

    return {
      existingTools: [...new Set(existingTools)], // Remove duplicates
      newToolSpecs,
      missingCapabilities,
    };
  }

  private extractCapabilities(brief: ProjectBrief): string[] {
    const capabilities: string[] = [];

    // Z goals
    for (const goal of brief.goals) {
      if (goal.toLowerCase().includes('lead')) capabilities.push('lead-management');
      if (goal.toLowerCase().includes('order')) capabilities.push('order-management');
      if (goal.toLowerCase().includes('product')) capabilities.push('product-catalog');
      if (goal.toLowerCase().includes('cart')) capabilities.push('cart-management');
      if (goal.toLowerCase().includes('quote')) capabilities.push('quote-generation');
      if (goal.toLowerCase().includes('service')) capabilities.push('service-tickets');
    }

    // Z integrations
    if (brief.integrations) {
      for (const integration of brief.integrations) {
        if (integration.type === 'erp') capabilities.push('erp-integration');
        if (integration.type === 'crm') capabilities.push('crm-integration');
        if (integration.type === 'payment') capabilities.push('payment-processing');
      }
    }

    // Z UX needs
    if (brief.uxNeeds?.naturalLanguage) capabilities.push('intent-detection');
    if (brief.uxNeeds?.recommendations) capabilities.push('recommendations');
    if (brief.uxNeeds?.personalization) capabilities.push('personalization');

    return [...new Set(capabilities)];
  }

  private findToolsForCapability(
    capability: string,
    tools: ToolContract[]
  ): ToolContract[] {
    const keywords = capability.toLowerCase().split('-');
    return tools.filter((tool) => {
      const toolText = `${tool.name} ${tool.description} ${tool.category}`.toLowerCase();
      return keywords.some((keyword) => toolText.includes(keyword));
    });
  }

  private inferCategory(capability: string): string {
    if (capability.includes('lead')) return 'crm';
    if (capability.includes('order') || capability.includes('cart')) return 'ecommerce';
    if (capability.includes('product')) return 'catalog';
    if (capability.includes('quote')) return 'sales';
    if (capability.includes('service')) return 'support';
    return 'general';
  }

  private estimateComplexity(capability: string): 'low' | 'medium' | 'high' {
    const highComplexity = ['recommendations', 'personalization', 'intent-detection'];
    const mediumComplexity = ['erp-integration', 'crm-integration'];

    if (highComplexity.some((c) => capability.includes(c))) return 'high';
    if (mediumComplexity.some((c) => capability.includes(c))) return 'medium';
    return 'low';
  }
}
