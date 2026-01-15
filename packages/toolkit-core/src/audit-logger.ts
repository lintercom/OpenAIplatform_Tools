import { PrismaClient } from '@prisma/client';
import { AuditLogEntry } from './types';

interface LogInput {
  toolId: string;
  sessionId?: string;
  leadId?: string;
  input: any;
  output?: any;
  status: 'success' | 'error' | 'blocked';
  error?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  constructor(private prisma: PrismaClient) {}

  /**
   * Loguje tool call do databáze
   */
  async log(input: LogInput): Promise<string> {
    const entry = await this.prisma.toolCall.create({
      data: {
        toolId: input.toolId,
        sessionId: input.sessionId,
        leadId: input.leadId,
        input: input.input as any,
        output: input.output as any,
        status: input.status,
        error: input.error,
        metadata: input.metadata as any,
      },
    });

    return entry.id;
  }

  /**
   * Vrací audit logy s filtrováním
   */
  async getLogs(filters: {
    toolId?: string;
    sessionId?: string;
    leadId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogEntry[]> {
    const entries = await this.prisma.toolCall.findMany({
      where: {
        ...(filters.toolId && { toolId: filters.toolId }),
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.leadId && { leadId: filters.leadId }),
        ...(filters.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });

    return entries.map((entry) => ({
      id: entry.id,
      toolId: entry.toolId,
      sessionId: entry.sessionId || undefined,
      leadId: entry.leadId || undefined,
      input: entry.input as any,
      output: entry.output as any,
      status: entry.status as 'success' | 'error' | 'blocked',
      error: entry.error || undefined,
      metadata: entry.metadata as any,
      createdAt: entry.createdAt,
    }));
  }
}
