import { PrismaClient } from '@prisma/client';
import { ToolDefinition, ToolContext, ToolPolicy } from './types';

/**
 * Policy Check Result s rozšířenými informacemi
 */
export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  requiresHumanReview?: boolean;
  reviewQueueId?: string;
  tenantIsolated?: boolean;
  attributes?: Record<string, unknown>;
}

/**
 * ABAC Attribute
 */
export interface ABACAttribute {
  key: string;
  value: string | number | boolean;
  operator?: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in';
}

/**
 * ABAC Policy Rule
 */
export interface ABACPolicyRule {
  name: string;
  description?: string;
  attributes: ABACAttribute[];
  effect: 'allow' | 'deny';
  priority?: number; // Vyšší = vyšší priorita
}

/**
 * Tenant Isolation Policy
 */
export interface TenantIsolationPolicy {
  enabled: boolean;
  strictMode?: boolean; // Pokud true, tool může být volán pouze v rámci stejného tenantu
  crossTenantAllowed?: boolean; // Povolit cross-tenant access
}

/**
 * Human Review Policy
 */
export interface HumanReviewPolicy {
  required: boolean;
  queueName?: string; // Název fronty pro human review
  autoApproveAfter?: number; // Auto-approve po X ms (volitelné)
  notifyChannels?: string[]; // Kanály pro notifikace
}

/**
 * Enterprise Policy Engine v2
 * 
 * Podporuje:
 * - RBAC (Role-Based Access Control)
 * - ABAC (Attribute-Based Access Control)
 * - Tenant isolation
 * - Human review queue
 * - Policy recipes
 */
export class PolicyEngineV2 {
  private rateLimitCache = new Map<string, { count: number; resetAt: number }>();
  private abacRules: ABACPolicyRule[] = [];
  private tenantIsolationEnabled = true;

  constructor(
    private prisma: PrismaClient,
    options?: {
      tenantIsolationEnabled?: boolean;
      abacRules?: ABACPolicyRule[];
    }
  ) {
    this.tenantIsolationEnabled = options?.tenantIsolationEnabled ?? true;
    this.abacRules = options?.abacRules || [];
  }

  /**
   * Kontroluje všechny policy pravidla pro tool
   */
  async checkPolicy(
    tool: ToolDefinition,
    ctx: ToolContext & { tenantId?: string; permissions?: string[]; attributes?: Record<string, unknown> },
    input: unknown
  ): Promise<PolicyCheckResult> {
    const policy = tool.policy;
    if (!policy) {
      return { allowed: true };
    }

    // 1. Tenant Isolation Check
    if (this.tenantIsolationEnabled && ctx.tenantId) {
      const tenantCheck = this.checkTenantIsolation(tool, ctx);
      if (!tenantCheck.allowed) {
        return tenantCheck;
      }
    }

    // 2. RBAC Check (Role-Based)
    if (policy.rolesAllowed && ctx.role) {
      if (!policy.rolesAllowed.includes(ctx.role)) {
        return {
          allowed: false,
          reason: `Role "${ctx.role}" not allowed for tool "${tool.id}"`,
        };
      }
    }

    // 3. ABAC Check (Attribute-Based)
    if (this.abacRules.length > 0 && ctx.attributes) {
      const abacResult = this.checkABAC(tool, ctx, input);
      if (!abacResult.allowed) {
        return abacResult;
      }
    }

    // 4. Permission Check (pokud jsou definované permissions)
    if (ctx.permissions && policy.rolesAllowed) {
      // Pokud tool vyžaduje specifické permissions, zkontroluj je
      const requiredPermissions = this.getRequiredPermissions(tool);
      if (requiredPermissions.length > 0) {
        const hasAllPermissions = requiredPermissions.every((perm) =>
          ctx.permissions?.includes(perm)
        );
        if (!hasAllPermissions) {
          return {
            allowed: false,
            reason: `Missing required permissions: ${requiredPermissions.join(', ')}`,
          };
        }
      }
    }

    // 5. Rate Limiting
    if (policy.rateLimit) {
      const rateLimitResult = this.checkRateLimit(tool.id, policy.rateLimit, ctx);
      if (!rateLimitResult.allowed) {
        return rateLimitResult;
      }
    }

    // 6. Domain Whitelist (pro verify tools)
    if (policy.domainWhitelist && input && typeof input === 'object' && 'domain' in input) {
      const domain = (input as { domain?: string }).domain?.toLowerCase();
      if (domain) {
        const allowed = policy.domainWhitelist.some((allowedDomain) =>
          domain.endsWith(allowedDomain.toLowerCase())
        );
        if (!allowed) {
          return {
            allowed: false,
            reason: `Domain "${domain}" not in whitelist`,
          };
        }
      }
    }

    // 7. Human Review Check
    if (policy.requiresHumanReview) {
      const reviewResult = await this.checkHumanReview(tool, ctx, input);
      if (reviewResult.requiresHumanReview) {
        return reviewResult;
      }
    }

    return { allowed: true };
  }

  /**
   * Kontroluje tenant isolation
   */
  private checkTenantIsolation(
    tool: ToolDefinition,
    ctx: ToolContext & { tenantId?: string }
  ): PolicyCheckResult {
    // Pokud není tenantId v contextu, povolíme (pro backward compatibility)
    if (!ctx.tenantId) {
      return { allowed: true };
    }

    // Zde by se kontrolovalo, zda tool může být volán v rámci tohoto tenantu
    // Pro teď implementujeme základní logiku
    // V produkci by se kontrolovalo z databáze nebo cache

    return {
      allowed: true,
      tenantIsolated: true,
    };
  }

  /**
   * Kontroluje ABAC pravidla
   */
  private checkABAC(
    tool: ToolDefinition,
    ctx: ToolContext & { attributes?: Record<string, unknown> },
    input: unknown
  ): PolicyCheckResult {
    if (!ctx.attributes) {
      return { allowed: true };
    }

    // Najdi relevantní ABAC pravidla pro tento tool
    const relevantRules = this.abacRules.filter((rule) => {
      // Zde by se kontrolovalo, zda se pravidlo vztahuje na tento tool
      // Pro teď použijeme všechny pravidla
      return true;
    });

    // Seřaď podle priority (vyšší = vyšší priorita)
    relevantRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Zkontroluj každé pravidlo
    for (const rule of relevantRules) {
      const matches = rule.attributes.every((attr) => {
        const contextValue = ctx.attributes?.[attr.key];
        if (contextValue === undefined) {
          return false;
        }

        switch (attr.operator || 'equals') {
          case 'equals':
            return contextValue === attr.value;
          case 'contains':
            return String(contextValue).includes(String(attr.value));
          case 'greaterThan':
            return Number(contextValue) > Number(attr.value);
          case 'lessThan':
            return Number(contextValue) < Number(attr.value);
          case 'in':
            return Array.isArray(attr.value) && attr.value.includes(contextValue);
          default:
            return false;
        }
      });

      if (matches) {
        return {
          allowed: rule.effect === 'allow',
          reason: rule.effect === 'deny' ? `ABAC rule "${rule.name}" denied access` : undefined,
          attributes: ctx.attributes,
        };
      }
    }

    // Pokud žádné pravidlo neplatí, použij default (allow)
    return { allowed: true };
  }

  /**
   * Kontroluje human review requirements
   */
  private async checkHumanReview(
    tool: ToolDefinition,
    ctx: ToolContext,
    input: unknown
  ): Promise<PolicyCheckResult> {
    // Vytvoř human review request v databázi
    const reviewRequest = await this.prisma.humanReviewRequest.create({
      data: {
        toolId: tool.id,
        sessionId: ctx.sessionId,
        leadId: ctx.leadId,
        userId: ctx.userId,
        input: input as Record<string, unknown>,
        status: 'pending',
        metadata: ctx.metadata,
      },
    });

    return {
      allowed: false, // Blokujeme dokud není schváleno
      requiresHumanReview: true,
      reviewQueueId: reviewRequest.id,
      reason: `Tool "${tool.id}" requires human review. Review ID: ${reviewRequest.id}`,
    };
  }

  /**
   * Získá required permissions pro tool
   */
  private getRequiredPermissions(tool: ToolDefinition): string[] {
    // Zde by se permissions načítaly z tool metadata
    // Pro teď vracíme prázdné pole
    return [];
  }

  /**
   * Kontroluje rate limiting
   */
  private checkRateLimit(
    toolId: string,
    rateLimit: NonNullable<ToolPolicy['rateLimit']>,
    ctx: ToolContext & { tenantId?: string; userId?: string }
  ): PolicyCheckResult {
    const scope = rateLimit.scope || 'global';
    const key = this.getRateLimitKey(toolId, scope, ctx);
    const now = Date.now();

    let entry = this.rateLimitCache.get(key);
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + rateLimit.windowMs,
      };
      this.rateLimitCache.set(key, entry);
    }

    entry.count++;
    if (entry.count > rateLimit.maxCalls) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${rateLimit.maxCalls} calls per ${rateLimit.windowMs}ms`,
      };
    }

    return { allowed: true };
  }

  /**
   * Vytvoří klíč pro rate limit cache
   */
  private getRateLimitKey(
    toolId: string,
    scope: 'global' | 'session' | 'lead' | 'user' | 'tenant',
    ctx: ToolContext & { tenantId?: string; userId?: string }
  ): string {
    switch (scope) {
      case 'global':
        return `rate:${toolId}:global`;
      case 'session':
        return `rate:${toolId}:session:${ctx.sessionId || 'anonymous'}`;
      case 'lead':
        return `rate:${toolId}:lead:${ctx.leadId || 'anonymous'}`;
      case 'user':
        return `rate:${toolId}:user:${ctx.userId || 'anonymous'}`;
      case 'tenant':
        return `rate:${toolId}:tenant:${(ctx as { tenantId?: string }).tenantId || 'anonymous'}`;
      default:
        return `rate:${toolId}:global`;
    }
  }

  /**
   * Přidá ABAC pravidlo
   */
  addABACRule(rule: ABACPolicyRule): void {
    this.abacRules.push(rule);
    // Seřaď podle priority
    this.abacRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Vrací všechny ABAC pravidla
   */
  getABACRules(): ABACPolicyRule[] {
    return [...this.abacRules];
  }
}
