/**
 * Deterministic Alternative Finder
 * 
 * Navrhuje deterministické alternativy k AI řešením
 */

import { FeatureContext } from './ai-usefulness-scorer';

export interface DeterministicAlternative {
  type: 'database' | 'filter' | 'rule-engine' | 'wizard-ui' | 'static-content';
  description: string;
  pros: string[];
  cons: string[];
  implementation: string;
}

/**
 * Deterministic Alternative Finder
 * 
 * Navrhuje deterministické alternativy
 */
export class DeterministicAlternativeFinder {
  /**
   * Najde deterministické alternativy pro feature
   */
  findAlternatives(feature: FeatureContext): DeterministicAlternative[] {
    const alternatives: DeterministicAlternative[] = [];

    // 1. Database search/filter
    if (this.isSearchable(feature)) {
      alternatives.push({
        type: 'database',
        description: 'Use database queries with filters and full-text search',
        pros: [
          'Fast and deterministic',
          'No LLM costs',
          'Predictable results',
          'Easy to cache',
        ],
        cons: [
          'Requires structured data',
          'Limited to predefined queries',
          'No natural language understanding',
        ],
        implementation: 'PostgreSQL full-text search or Elasticsearch',
      });
    }

    // 2. Rule engine
    if (this.isRuleBased(feature)) {
      alternatives.push({
        type: 'rule-engine',
        description: 'Use rule engine for conditional logic',
        pros: [
          'Deterministic and testable',
          'No LLM costs',
          'Fast execution',
          'Easy to maintain',
        ],
        cons: [
          'Requires predefined rules',
          'Not flexible for edge cases',
          'No learning capability',
        ],
        implementation: 'JSON-based rules or dedicated rule engine library',
      });
    }

    // 3. Wizard UI
    if (this.isComplexInput(feature)) {
      alternatives.push({
        type: 'wizard-ui',
        description: 'Use multi-step wizard UI to guide users',
        pros: [
          'Clear user guidance',
          'No LLM costs',
          'Structured data collection',
          'Better UX for complex forms',
        ],
        cons: [
          'Requires UI development',
          'Less conversational',
          'More clicks for users',
        ],
        implementation: 'Multi-step form with validation and progress tracking',
      });
    }

    // 4. Static content
    if (this.isStaticContent(feature)) {
      alternatives.push({
        type: 'static-content',
        description: 'Use pre-generated static content',
        pros: [
          'No LLM costs',
          'Instant response',
          'Consistent content',
          'Easy to cache',
        ],
        cons: [
          'No personalization',
          'Requires manual updates',
          'Not dynamic',
        ],
        implementation: 'Pre-generated FAQs, templates, or content library',
      });
    }

    return alternatives;
  }

  private isSearchable(feature: FeatureContext): boolean {
    return (
      feature.feature.toLowerCase().includes('search') ||
      feature.feature.toLowerCase().includes('filter') ||
      feature.feature.toLowerCase().includes('find')
    );
  }

  private isRuleBased(feature: FeatureContext): boolean {
    return (
      feature.feature.toLowerCase().includes('validation') ||
      feature.feature.toLowerCase().includes('rule') ||
      feature.feature.toLowerCase().includes('condition')
    );
  }

  private isComplexInput(feature: FeatureContext): boolean {
    return (
      feature.feature.toLowerCase().includes('form') ||
      feature.feature.toLowerCase().includes('input') ||
      feature.feature.toLowerCase().includes('wizard')
    );
  }

  private isStaticContent(feature: FeatureContext): boolean {
    return (
      feature.feature.toLowerCase().includes('faq') ||
      feature.feature.toLowerCase().includes('help') ||
      feature.feature.toLowerCase().includes('documentation')
    );
  }
}
