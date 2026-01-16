import { ABACPolicyRule } from './policy-engine-v2';
import { ToolPolicy } from './types';

/**
 * Policy Recipes - Předpřipravené policy konfigurace pro běžné use cases
 */

/**
 * Recipe: High-risk tool requiring human review
 */
export function highRiskToolPolicy(): Partial<ToolPolicy> {
  return {
    requiresHumanReview: true,
    rateLimit: {
      maxCalls: 10,
      windowMs: 3600000, // 1 hodina
      scope: 'user',
    },
    rolesAllowed: ['admin', 'manager'],
  };
}

/**
 * Recipe: Public tool with rate limiting
 */
export function publicToolPolicy(maxCallsPerHour: number = 100): Partial<ToolPolicy> {
  return {
    rateLimit: {
      maxCalls: maxCallsPerHour,
      windowMs: 3600000, // 1 hodina
      scope: 'session',
    },
  };
}

/**
 * Recipe: Tenant-isolated tool
 */
export function tenantIsolatedToolPolicy(): Partial<ToolPolicy> {
  return {
    rateLimit: {
      maxCalls: 1000,
      windowMs: 3600000,
      scope: 'tenant',
    },
  };
}

/**
 * Recipe: PII-sensitive tool
 */
export function piiSensitiveToolPolicy(): Partial<ToolPolicy> {
  return {
    piiRules: {
      redactInLogs: true,
      redactInAudit: true,
      fields: ['email', 'phone', 'ssn', 'creditCard', 'password'],
    },
    rateLimit: {
      maxCalls: 50,
      windowMs: 3600000,
      scope: 'user',
    },
    rolesAllowed: ['admin', 'user'],
  };
}

/**
 * Recipe: Admin-only tool
 */
export function adminOnlyToolPolicy(): Partial<ToolPolicy> {
  return {
    rolesAllowed: ['admin'],
    rateLimit: {
      maxCalls: 1000,
      windowMs: 3600000,
      scope: 'global',
    },
  };
}

/**
 * Recipe: Verify tool with domain whitelist
 */
export function verifyToolPolicy(allowedDomains: string[]): Partial<ToolPolicy> {
  return {
    domainWhitelist: allowedDomains,
    rateLimit: {
      maxCalls: 100,
      windowMs: 3600000,
      scope: 'session',
    },
  };
}

/**
 * ABAC Recipe: Department-based access
 */
export function departmentABACRule(department: string): ABACPolicyRule {
  return {
    name: `department-${department}`,
    description: `Allow access for users in ${department} department`,
    attributes: [
      {
        key: 'department',
        value: department,
        operator: 'equals',
      },
    ],
    effect: 'allow',
    priority: 100,
  };
}

/**
 * ABAC Recipe: Time-based access
 */
export function timeBasedABACRule(
  startHour: number,
  endHour: number
): ABACPolicyRule {
  return {
    name: `time-window-${startHour}-${endHour}`,
    description: `Allow access between ${startHour}:00 and ${endHour}:00`,
    attributes: [
      {
        key: 'currentHour',
        value: startHour,
        operator: 'greaterThan',
      },
      {
        key: 'currentHour',
        value: endHour,
        operator: 'lessThan',
      },
    ],
    effect: 'allow',
    priority: 50,
  };
}

/**
 * ABAC Recipe: Cost-based access
 */
export function costBasedABACRule(maxCost: number): ABACPolicyRule {
  return {
    name: `cost-limit-${maxCost}`,
    description: `Allow access if estimated cost is below ${maxCost}`,
    attributes: [
      {
        key: 'estimatedCost',
        value: maxCost,
        operator: 'lessThan',
      },
    ],
    effect: 'allow',
    priority: 75,
  };
}
