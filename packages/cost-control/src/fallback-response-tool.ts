/**
 * Fallback Response Tool
 * 
 * Garantuje odpověď i při selhání LLM
 */

import {
  FallbackScenario,
  FallbackContext,
  FallbackResponse,
  LLMRole,
} from './types';

export interface FallbackResponseConfig {
  // Statické odpovědi pro různé scénáře
  staticResponses?: Record<FallbackScenario, string>;
  // Rule-based logika pro generování fallback odpovědí
  enableRuleBased?: boolean;
}

/**
 * Fallback Response Tool
 * 
 * Poskytuje fallback odpovědi když LLM selže
 */
export class FallbackResponseTool {
  private staticResponses: Record<FallbackScenario, string>;

  constructor(private config: FallbackResponseConfig = {}) {
    this.staticResponses = {
      budget_exceeded:
        config.staticResponses?.budget_exceeded ||
        'Omlouvám se, momentálně nemohu zpracovat váš dotaz kvůli omezení nákladů. Prosím, zkuste to znovu později nebo kontaktujte naši podporu.',
      model_error:
        config.staticResponses?.model_error ||
        'Omlouvám se, došlo k technické chybě. Prosím, zkuste to znovu za chvíli.',
      timeout:
        config.staticResponses?.timeout ||
        'Omlouvám se, odpověď trvá déle než obvykle. Prosím, zkuste to znovu.',
      rate_limit:
        config.staticResponses?.rate_limit ||
        'Omlouvám se, momentálně je vysoká zátěž. Prosím, zkuste to znovu za chvíli.',
      unknown_error:
        config.staticResponses?.unknown_error ||
        'Omlouvám se, došlo k neočekávané chybě. Prosím, zkuste to znovu nebo kontaktujte podporu.',
    };
  }

  /**
   * Získá fallback odpověď pro scénář
   */
  async getFallback(
    scenario: FallbackScenario,
    context: FallbackContext
  ): Promise<FallbackResponse> {
    // 1. Zkusit rule-based fallback (pokud je povoleno)
    if (this.config.enableRuleBased) {
      const ruleBased = this.getRuleBasedFallback(scenario, context);
      if (ruleBased) {
        return ruleBased;
      }
    }

    // 2. Vrátit statickou odpověď
    return {
      content: this.staticResponses[scenario],
      fallback: true,
      scenario,
      reason: this.getReason(scenario, context),
      metadata: {
        originalRole: context.originalRequest?.role,
        error: context.error?.message,
      },
    };
  }

  /**
   * Rule-based fallback (kontext-aware)
   */
  private getRuleBasedFallback(
    scenario: FallbackScenario,
    context: FallbackContext
  ): FallbackResponse | null {
    const role = context.originalRequest?.role;

    // Pro intent detection - vrátit "unknown"
    if (role === 'intent_detection') {
      return {
        content: JSON.stringify({ intent: 'unknown', confidence: 0.5 }),
        fallback: true,
        scenario,
        reason: 'Intent detection fallback',
      };
    }

    // Pro routing - vrátit default workflow
    if (role === 'routing') {
      return {
        content: JSON.stringify({ next_action: 'qualification' }),
        fallback: true,
        scenario,
        reason: 'Routing fallback',
      };
    }

    // Pro recommendation - vrátit prázdný seznam
    if (role === 'recommendation') {
      return {
        content: JSON.stringify({ recommendations: [] }),
        fallback: true,
        scenario,
        reason: 'Recommendation fallback',
      };
    }

    // Pro quote generation - eskalovat na formulář
    if (role === 'quote_generation') {
      return {
        content: JSON.stringify({
          assistant_message:
            'Pro vytvoření nabídky prosím vyplňte formulář nebo nás kontaktujte.',
          ui_directives: {
            show_blocks: ['quote_form'],
            hide_blocks: [],
          },
        }),
        fallback: true,
        scenario,
        reason: 'Quote generation fallback - escalate to form',
      };
    }

    return null;
  }

  /**
   * Získá důvod fallbacku
   */
  private getReason(
    scenario: FallbackScenario,
    context: FallbackContext
  ): string {
    switch (scenario) {
      case 'budget_exceeded':
        return `Token budget exceeded. Remaining budget insufficient for request.`;
      case 'model_error':
        return `LLM model error: ${context.error?.message || 'Unknown error'}`;
      case 'timeout':
        return `Request timeout - LLM did not respond in time`;
      case 'rate_limit':
        return `Rate limit exceeded - too many requests`;
      case 'unknown_error':
        return `Unknown error: ${context.error?.message || 'No details'}`;
      default:
        return 'Fallback response required';
    }
  }
}
