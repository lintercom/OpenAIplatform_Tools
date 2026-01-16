/**
 * AI Usefulness Scorer
 * 
 * Rozhoduje, zda použít AI nebo deterministické řešení
 */

import { ProjectBrief } from '../schemas/project-brief';

export type AIMode = 'AI_ASSISTED' | 'DETERMINISTIC' | 'HYBRID';

export interface AIUsefulnessScore {
  useAI: boolean;
  mode: AIMode;
  reasonCodes: string[];
  confidence: number; // 0-1
  budgetHint: {
    estimatedTokensPerSession: number;
    estimatedCostPerMonth: number;
  };
  fallbackHint: string;
}

export interface FeatureContext {
  feature: string;
  useCase: string;
  constraints: {
    dataQuality: 'low' | 'medium' | 'high';
    frequency: 'batch' | 'near-realtime' | 'realtime';
    uxNeeds: {
      personalization: boolean;
      recommendations: boolean;
      naturalLanguage: boolean;
    };
    risk: 'low' | 'medium' | 'high';
  };
}

/**
 * AI Usefulness Scorer
 * 
 * Vyhodnocuje, zda je AI vhodné pro danou feature
 */
export class AIUsefulnessScorer {
  /**
   * Vyhodnotí užitečnost AI pro feature
   */
  score(feature: FeatureContext, brief: ProjectBrief): AIUsefulnessScore {
    const reasons: string[] = [];
    let aiScore = 0;
    let mode: AIMode = 'DETERMINISTIC';

    // 1. Natural Language Processing
    if (brief.uxNeeds?.naturalLanguage) {
      aiScore += 0.4;
      reasons.push('natural_language_required');
      mode = 'AI_ASSISTED';
    }

    // 2. Personalization
    if (brief.uxNeeds?.personalization) {
      aiScore += 0.3;
      reasons.push('personalization_required');
      if (mode === 'DETERMINISTIC') mode = 'AI_ASSISTED';
    }

    // 3. Recommendations
    if (brief.uxNeeds?.recommendations) {
      aiScore += 0.3;
      reasons.push('recommendations_required');
      if (mode === 'DETERMINISTIC') mode = 'AI_ASSISTED';
    }

    // 4. Data Quality
    if (feature.constraints.dataQuality === 'low') {
      aiScore -= 0.2;
      reasons.push('low_data_quality');
    } else if (feature.constraints.dataQuality === 'high') {
      aiScore += 0.1;
      reasons.push('high_data_quality');
    }

    // 5. Frequency
    if (feature.constraints.frequency === 'realtime') {
      aiScore -= 0.2; // AI může být pomalé
      reasons.push('realtime_requirement');
      if (aiScore > 0.3) mode = 'HYBRID'; // Hybrid: AI pro batch, deterministic pro realtime
    }

    // 6. Risk
    if (feature.constraints.risk === 'high') {
      aiScore -= 0.3;
      reasons.push('high_risk');
      if (mode === 'AI_ASSISTED') mode = 'HYBRID';
    }

    // 7. Budget constraints
    if (brief.constraints?.budget?.maxCostPerRequest && brief.constraints.budget.maxCostPerRequest < 0.01) {
      aiScore -= 0.2;
      reasons.push('low_budget');
      if (mode === 'AI_ASSISTED') mode = 'HYBRID';
    }

    // 8. Simple rule-based tasks
    if (this.isSimpleRuleBased(feature)) {
      aiScore -= 0.4;
      reasons.push('simple_rule_based');
      mode = 'DETERMINISTIC';
    }

    const useAI = aiScore > 0.3;
    const confidence = Math.min(1, Math.max(0, Math.abs(aiScore)));

    // Budget hints
    const estimatedTokensPerSession = useAI
      ? this.estimateTokens(feature, brief)
      : 0;
    const estimatedCostPerMonth = useAI
      ? this.estimateMonthlyCost(estimatedTokensPerSession, brief)
      : 0;

    return {
      useAI,
      mode,
      reasonCodes: reasons,
      confidence,
      budgetHint: {
        estimatedTokensPerSession,
        estimatedCostPerMonth,
      },
      fallbackHint: this.generateFallbackHint(mode, feature),
    };
  }

  /**
   * Zkontroluje, zda je feature jednoduché rule-based
   */
  private isSimpleRuleBased(feature: FeatureContext): boolean {
    // Jednoduché úlohy, které nepotřebují AI
    const simplePatterns = [
      'validation',
      'formatting',
      'filtering',
      'sorting',
      'calculation',
      'lookup',
    ];

    return simplePatterns.some((pattern) =>
      feature.feature.toLowerCase().includes(pattern)
    );
  }

  /**
   * Odhadne tokeny pro feature
   */
  private estimateTokens(
    feature: FeatureContext,
    brief: ProjectBrief
  ): number {
    // Zjednodušený odhad
    let tokens = 1000; // Base

    if (brief.uxNeeds?.naturalLanguage) tokens += 2000;
    if (brief.uxNeeds?.personalization) tokens += 1500;
    if (brief.uxNeeds?.recommendations) tokens += 1500;

    return tokens;
  }

  /**
   * Odhadne měsíční náklady
   */
  private estimateMonthlyCost(
    tokensPerSession: number,
    brief: ProjectBrief
  ): number {
    // Odhad: 1000 sessions/měsíc, gpt-4-turbo-preview pricing
    const sessionsPerMonth = 1000;
    const costPer1kTokens = 0.01; // Input
    const costPer1kOutputTokens = 0.03; // Output

    const inputCost = (tokensPerSession * 0.7 * sessionsPerMonth) / 1000 * costPer1kTokens;
    const outputCost = (tokensPerSession * 0.3 * sessionsPerMonth) / 1000 * costPer1kOutputTokens;

    return inputCost + outputCost;
  }

  /**
   * Generuje fallback hint
   */
  private generateFallbackHint(
    mode: AIMode,
    feature: FeatureContext
  ): string {
    if (mode === 'DETERMINISTIC') {
      return 'Use deterministic solution: database queries, rule engine, or static content';
    }

    if (mode === 'HYBRID') {
      return 'Use hybrid: AI for complex parts, deterministic for simple/real-time parts';
    }

    return 'Use AI with fallback: static responses or rule-based alternatives on failure';
  }
}
