/**
 * Cost Control Types
 * 
 * Definice typů pro Cost & Control vrstvu
 */

import { z } from 'zod';

// LLM Role types
export type LLMRole =
  | 'intent_detection'
  | 'routing'
  | 'recommendation'
  | 'explanation'
  | 'quote_generation'
  | 'analytics_batch'
  | 'general';

// Model configuration
export interface ModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  fallbackModel?: string; // Fallback pokud primární model selže
}

// Role-based model mapping
export interface RoleModelMapping {
  [role: string]: ModelConfig;
}

// Token usage
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// Budget context
export interface BudgetContext {
  sessionId?: string;
  workflowId?: string;
  toolId?: string;
  tenantId?: string;
  role?: LLMRole;
  period?: 'session' | 'workflow' | 'tool' | 'daily';
}

// Budget decision
export interface BudgetDecision {
  allowed: boolean;
  reason?: string;
  action?: 'allow' | 'downgrade_model' | 'truncate_context' | 'fallback' | 'reject';
  suggestedModel?: string;
  maxTokens?: number;
}

// LLM Request
export interface LLMRequest {
  role: LLMRole;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    tools?: unknown[];
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  };
  context?: BudgetContext;
}

// LLM Response
export interface LLMResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  costUSD: number;
  cached?: boolean;
  fallback?: boolean;
  metadata?: Record<string, unknown>;
}

// Cache entry
export interface CachedResponse {
  response: LLMResponse;
  expiresAt: Date;
  hitCount: number;
}

// Fallback scenario
export type FallbackScenario =
  | 'budget_exceeded'
  | 'model_error'
  | 'timeout'
  | 'rate_limit'
  | 'unknown_error';

// Fallback context
export interface FallbackContext {
  scenario: FallbackScenario;
  originalRequest: LLMRequest;
  error?: Error;
  budgetContext?: BudgetContext;
}

// Fallback response
export interface FallbackResponse {
  content: string;
  fallback: true;
  scenario: FallbackScenario;
  reason: string;
  metadata?: Record<string, unknown>;
}

// Cost record
export interface CostRecord {
  sessionId?: string;
  workflowId?: string;
  toolId?: string;
  role?: LLMRole;
  tenantId?: string;
  model: string;
  usage: TokenUsage;
  costUSD: number;
  cached?: boolean;
  fallback?: boolean;
  metadata?: Record<string, unknown>;
}

// Cost filters
export interface CostFilters {
  sessionId?: string;
  workflowId?: string;
  toolId?: string;
  role?: LLMRole;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Cost report
export interface CostReport {
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  cacheHitRate: number;
  fallbackRate: number;
  breakdown: {
    byRole: Record<string, { cost: number; tokens: number; requests: number }>;
    byModel: Record<string, { cost: number; tokens: number; requests: number }>;
    byTool: Record<string, { cost: number; tokens: number; requests: number }>;
  };
  period: {
    start: Date;
    end: Date;
  };
}

// Dashboard data
export interface DashboardData {
  summary: {
    totalCost: number;
    totalTokens: number;
    averageCostPerRequest: number;
    cacheHitRate: number;
    fallbackRate: number;
  };
  trends: Array<{
    date: string;
    cost: number;
    tokens: number;
    requests: number;
  }>;
  topConsumers: Array<{
    type: 'role' | 'tool' | 'workflow';
    name: string;
    cost: number;
    tokens: number;
    requests: number;
  }>;
}

// Token estimation
export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  confidence: 'low' | 'medium' | 'high';
}

// Model pricing (per 1K tokens)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
};

// Default role model mapping
export const DEFAULT_ROLE_MODEL_MAPPING: RoleModelMapping = {
  intent_detection: {
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    fallbackModel: 'gpt-3.5-turbo',
  },
  routing: {
    model: 'gpt-3.5-turbo',
    temperature: 0.5,
    fallbackModel: 'gpt-3.5-turbo',
  },
  recommendation: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    fallbackModel: 'gpt-3.5-turbo',
  },
  explanation: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    fallbackModel: 'gpt-3.5-turbo',
  },
  quote_generation: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.5,
    fallbackModel: 'gpt-3.5-turbo',
  },
  analytics_batch: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    fallbackModel: 'gpt-3.5-turbo',
  },
  general: {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    fallbackModel: 'gpt-3.5-turbo',
  },
};
