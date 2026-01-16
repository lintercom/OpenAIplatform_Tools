import { ToolMetadata } from '@ai-toolkit/tool-contract';

/**
 * Capability - skupina tools, které řeší konkrétní business capability
 */
export interface Capability {
  id: string;
  name: string;
  description: string;
  tools: string[]; // Tool IDs
  dependencies?: string[]; // Capability IDs
  riskLevel: 'low' | 'medium' | 'high';
  piiLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Architecture Blueprint - výsledek architect toolu
 */
export interface ArchitectureBlueprint {
  id: string;
  name: string;
  description: string;
  capabilities: string[]; // Capability IDs
  workflows: WorkflowBlueprint[];
  apiEndpoints: APIEndpointBlueprint[];
  uiHints: UIHint[];
  policy: ArchitecturePolicy;
  estimatedCost?: {
    perRequest: number;
    perMonth?: number;
  };
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    risks: Array<{
      level: 'low' | 'medium' | 'high';
      description: string;
      mitigation?: string;
    }>;
  };
}

/**
 * Workflow Blueprint
 */
export interface WorkflowBlueprint {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  requiredTools: string[];
  estimatedLatency: number; // ms
}

/**
 * Workflow Step
 */
export interface WorkflowStep {
  id: string;
  toolId: string;
  condition?: string; // Zod schema pro condition
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
  errorHandling?: {
    strategy: 'fail' | 'skip' | 'retry' | 'fallback';
    fallbackToolId?: string;
  };
}

/**
 * API Endpoint Blueprint
 */
export interface APIEndpointBlueprint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  requiredTools: string[];
  inputSchema: unknown; // JSON Schema
  outputSchema: unknown; // JSON Schema
  authRequired: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * UI Hint
 */
export interface UIHint {
  type: 'form' | 'list' | 'detail' | 'action';
  description: string;
  requiredFields?: string[];
  optionalFields?: string[];
  actions?: Array<{
    label: string;
    action: string;
    toolId: string;
  }>;
}

/**
 * Architecture Policy
 */
export interface ArchitecturePolicy {
  requiredRoles?: string[];
  tenantIsolation?: boolean;
  piiHandling: 'none' | 'redact' | 'encrypt' | 'isolate';
  auditLevel: 'minimal' | 'standard' | 'full';
  costLimits?: {
    maxPerRequest: number;
    maxPerMonth: number;
  };
}

/**
 * Architect Tool Input
 */
export interface ArchitectInput {
  requirements: string; // Natural language description
  constraints?: {
    maxTools?: number;
    maxCostPerRequest?: number;
    requiredCapabilities?: string[];
    excludedTools?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  context?: {
    domain?: string;
    industry?: string;
    useCase?: string;
  };
}

/**
 * Architect Tool Output
 */
export interface ArchitectOutput {
  blueprint: ArchitectureBlueprint;
  rationale: string; // Proč byla zvolena tato architektura
  alternatives?: Array<{
    blueprint: ArchitectureBlueprint;
    pros: string[];
    cons: string[];
  }>;
}
