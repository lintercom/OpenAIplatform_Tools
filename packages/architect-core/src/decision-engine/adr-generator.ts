/**
 * ADR Generator
 * 
 * Generuje Architecture Decision Records pro každou významnou část návrhu
 */

import { DecisionRecord } from '../schemas/decision-record';
import { AIUsefulnessScorer, FeatureContext, AIUsefulnessScore } from './ai-usefulness-scorer';
import { DeterministicAlternativeFinder } from './deterministic-alternative-finder';
import { ProjectBrief } from '../schemas/project-brief';

/**
 * ADR Generator
 * 
 * Generuje Decision Records
 */
export class ADRGenerator {
  private aiScorer: AIUsefulnessScorer;
  private alternativeFinder: DeterministicAlternativeFinder;

  constructor() {
    this.aiScorer = new AIUsefulnessScorer();
    this.alternativeFinder = new DeterministicAlternativeFinder();
  }

  /**
   * Generuje ADR pro feature
   */
  generateADR(
    feature: FeatureContext,
    brief: ProjectBrief
  ): DecisionRecord {
    const score = this.aiScorer.score(feature, brief);
    const alternatives = this.alternativeFinder.findAlternatives(feature);

    const rationale: string[] = [];
    if (score.useAI) {
      rationale.push(`AI is useful for: ${score.reasonCodes.join(', ')}`);
      rationale.push(`Confidence: ${(score.confidence * 100).toFixed(0)}%`);
    } else {
      rationale.push(`Deterministic solution preferred: ${score.reasonCodes.join(', ')}`);
    }

    if (brief.constraints?.budget) {
      rationale.push(
        `Budget constraint: max ${brief.constraints.budget.maxCostPerRequest || 'N/A'} per request`
      );
    }

    if (feature.constraints.risk === 'high') {
      rationale.push('High risk requires deterministic fallback');
    }

    return {
      id: `adr-${feature.feature.toLowerCase().replace(/\s+/g, '-')}`,
      feature: feature.feature,
      decision: score.mode,
      rationale,
      riskLevel: feature.constraints.risk,
      costBudget: score.budgetHint.estimatedTokensPerSession > 0 ? {
        maxTokensPerSession: score.budgetHint.estimatedTokensPerSession,
        maxTokensPerWorkflow: Math.floor(score.budgetHint.estimatedTokensPerSession * 0.5),
        estimatedCostPerMonth: score.budgetHint.estimatedCostPerMonth,
      } : undefined,
      fallbackStrategy: score.fallbackHint,
      observabilityMetrics: [
        'request_count',
        'latency_p50',
        'latency_p95',
        'error_rate',
        score.useAI ? 'token_usage' : 'cache_hit_rate',
      ],
      securityNotes: {
        piiHandling: brief.security?.piiHandling || 'none',
        requiredRoles: brief.userTypes?.map((ut) => ut.role) || [],
        tenantIsolation: brief.security?.tenantIsolation || false,
      },
      alternatives: alternatives.map((alt) => ({
        option: alt.type,
        pros: alt.pros,
        cons: alt.cons,
        whyNot: score.useAI
          ? `AI provides better ${score.reasonCodes.join(' and ')}`
          : `Deterministic solution is more appropriate for this use case`,
      })),
    };
  }

  /**
   * Generuje ADR pro více features najednou
   */
  generateADRs(
    features: FeatureContext[],
    brief: ProjectBrief
  ): DecisionRecord[] {
    return features.map((feature) => this.generateADR(feature, brief));
  }
}
