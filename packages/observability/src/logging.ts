import { ToolExecutionContext, ToolExecutionResult } from '@ai-toolkit/tool-contract';

/**
 * Log level
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  toolId?: string;
  userId?: string;
  sessionId?: string;
  leadId?: string;
  tenantId?: string;
  attributes?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, error?: Error, attributes?: Record<string, unknown>): void;
  log(entry: LogEntry): void;
}

/**
 * Structured JSON logger
 */
export class StructuredLogger implements Logger {
  constructor(private service: string = 'ai-toolkit') {}

  private createLogEntry(
    level: LogLevel,
    message: string,
    attributes?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...attributes,
    };
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, attributes));
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, attributes));
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, attributes));
  }

  error(
    message: string,
    error?: Error,
    attributes?: Record<string, unknown>
  ): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, attributes);
    if (error) {
      entry.error = {
        message: error.message,
        code: (error as { code?: string }).code,
        stack: error.stack,
      };
    }
    this.log(entry);
  }

  log(entry: LogEntry): void {
    // V produkci by se zde posílalo do log aggregatoru (Datadog, CloudWatch, atd.)
    // Pro teď vypisujeme JSON do stdout
    console.log(JSON.stringify(entry));
  }

  /**
   * Loguje tool execution
   */
  logToolExecution(
    ctx: ToolExecutionContext,
    result: ToolExecutionResult,
    toolId: string
  ): void {
    const level =
      result.success && !result.error
        ? LogLevel.INFO
        : LogLevel.ERROR;

    this.log({
      timestamp: new Date().toISOString(),
      level,
      message: `Tool execution: ${toolId}`,
      service: this.service,
      requestId: ctx.requestId,
      correlationId: ctx.correlationId,
      traceId: ctx.traceId,
      toolId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      leadId: ctx.leadId,
      tenantId: ctx.tenantId,
      attributes: {
        latency: result.latency,
        cost: result.cost,
        policyDecision: result.policyDecision,
        success: result.success,
      },
      error: result.error
        ? {
            message: result.error.title,
            code: result.error.type,
          }
        : undefined,
    });
  }
}

/**
 * Singleton logger instance
 */
export const logger = new StructuredLogger();

/**
 * Context-aware logger wrapper
 */
export class ContextLogger {
  constructor(
    private baseLogger: Logger,
    private context: Partial<ToolExecutionContext>
  ) {}

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.baseLogger.debug(message, {
      ...this.context,
      ...attributes,
    });
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.baseLogger.info(message, {
      ...this.context,
      ...attributes,
    });
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.baseLogger.warn(message, {
      ...this.context,
      ...attributes,
    });
  }

  error(
    message: string,
    error?: Error,
    attributes?: Record<string, unknown>
  ): void {
    this.baseLogger.error(message, error, {
      ...this.context,
      ...attributes,
    });
  }
}
