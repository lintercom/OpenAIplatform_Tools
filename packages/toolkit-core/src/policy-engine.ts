import { PrismaClient } from '@prisma/client';
import { ToolDefinition, ToolContext, ToolPolicy } from './types';

interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

export class PolicyEngine {
  private rateLimitCache = new Map<string, { count: number; resetAt: number }>();

  constructor(private prisma: PrismaClient) {}

  /**
   * Kontroluje všechny policy pravidla pro tool
   */
  async checkPolicy(
    tool: ToolDefinition,
    ctx: ToolContext,
    input: unknown
  ): Promise<PolicyCheckResult> {
    const policy = tool.policy;
    if (!policy) {
      return { allowed: true };
    }

    // Role check
    if (policy.rolesAllowed && ctx.role) {
      if (!policy.rolesAllowed.includes(ctx.role)) {
        return {
          allowed: false,
          reason: `Role "${ctx.role}" not allowed for tool "${tool.id}"`,
        };
      }
    }

    // Rate limiting
    if (policy.rateLimit) {
      const rateLimitResult = this.checkRateLimit(tool.id, policy.rateLimit, ctx);
      if (!rateLimitResult.allowed) {
        return rateLimitResult;
      }
    }

    // Domain whitelist (pro verify tools)
    if (policy.domainWhitelist && input?.domain) {
      const domain = input.domain.toLowerCase();
      const allowed = policy.domainWhitelist.some((allowedDomain) =>
        domain.endsWith(allowedDomain.toLowerCase())
      );
      if (!allowed) {
        return {
          allowed: false,
          reason: `Domain "${input.domain}" not in whitelist`,
        };
      }
    }

    // Human review check (pouze kontrola, skutečná fronta je v audit loggeru)
    if (policy.requiresHumanReview) {
      // Tady by se tool call přidal do fronty pro human review
      // Pro teď jen logujeme
      console.log(`[Policy] Tool "${tool.id}" requires human review`);
    }

    return { allowed: true };
  }

  /**
   * Kontroluje rate limiting
   */
  private checkRateLimit(
    toolId: string,
    rateLimit: NonNullable<ToolPolicy['rateLimit']>,
    ctx: ToolContext
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
    scope: 'global' | 'session' | 'lead',
    ctx: ToolContext
  ): string {
    switch (scope) {
      case 'global':
        return `rate:${toolId}:global`;
      case 'session':
        return `rate:${toolId}:session:${ctx.sessionId || 'anonymous'}`;
      case 'lead':
        return `rate:${toolId}:lead:${ctx.leadId || 'anonymous'}`;
      default:
        return `rate:${toolId}:global`;
    }
  }
}
