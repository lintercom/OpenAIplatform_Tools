import { randomUUID } from 'crypto';
import { ToolExecutionContext, ToolExecutionResult } from '@ai-toolkit/tool-contract';

/**
 * Trace span pro distributed tracing
 */
export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, string | number | boolean>;
  events: TraceEvent[];
  status: 'ok' | 'error' | 'unset';
  error?: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Trace event
 */
export interface TraceEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Trace context pro propagation
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  flags?: number;
}

/**
 * Tracer pro distributed tracing
 */
export class Tracer {
  private spans = new Map<string, TraceSpan>();

  /**
   * Začne nový span
   */
  startSpan(
    name: string,
    parentContext?: TraceContext,
    attributes?: Record<string, string | number | boolean>
  ): TraceContext {
    const traceId = parentContext?.traceId || randomUUID();
    const spanId = randomUUID();
    const parentSpanId = parentContext?.spanId;

    const span: TraceSpan = {
      spanId,
      traceId,
      parentSpanId,
      name,
      startTime: Date.now(),
      attributes: attributes || {},
      events: [],
      status: 'unset',
    };

    this.spans.set(spanId, span);

    return {
      traceId,
      spanId,
      parentSpanId,
    };
  }

  /**
   * Přidá event do spanu
   */
  addEvent(
    spanId: string,
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Přidá atribut do spanu
   */
  setAttribute(
    spanId: string,
    key: string,
    value: string | number | boolean
  ): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.attributes[key] = value;
  }

  /**
   * Ukončí span
   */
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok', error?: Error): void {
    const span = this.spans.get(spanId);
    if (!span) {
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (error) {
      span.error = {
        message: error.message,
        code: (error as { code?: string }).code,
        stack: error.stack,
      };
    }
  }

  /**
   * Vrací span
   */
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Vrací všechny spany pro trace
   */
  getSpansByTraceId(traceId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter(
      (span) => span.traceId === traceId
    );
  }

  /**
   * Exportuje trace ve formátu pro OpenTelemetry (zjednodušený)
   */
  exportTrace(traceId: string): {
    traceId: string;
    spans: TraceSpan[];
  } {
    return {
      traceId,
      spans: this.getSpansByTraceId(traceId),
    };
  }

  /**
   * Vyčistí staré spany (starší než maxAge ms)
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [spanId, span] of this.spans.entries()) {
      if (span.endTime && now - span.endTime > maxAge) {
        this.spans.delete(spanId);
      }
    }
  }
}

/**
 * Singleton tracer instance
 */
export const tracer = new Tracer();

/**
 * Helper pro vytvoření trace context z headers
 */
export function extractTraceContext(
  headers: Record<string, string | string[] | undefined>
): TraceContext | undefined {
  const traceId = Array.isArray(headers['x-trace-id'])
    ? headers['x-trace-id'][0]
    : headers['x-trace-id'];
  const spanId = Array.isArray(headers['x-span-id'])
    ? headers['x-span-id'][0]
    : headers['x-span-id'];
  const parentSpanId = Array.isArray(headers['x-parent-span-id'])
    ? headers['x-parent-span-id'][0]
    : headers['x-parent-span-id'];

  if (traceId && spanId) {
    return {
      traceId: typeof traceId === 'string' ? traceId : '',
      spanId: typeof spanId === 'string' ? spanId : '',
      parentSpanId:
        parentSpanId && typeof parentSpanId === 'string'
          ? parentSpanId
          : undefined,
    };
  }

  return undefined;
}

/**
 * Helper pro vytvoření trace headers z context
 */
export function injectTraceContext(
  context: TraceContext
): Record<string, string> {
  return {
    'x-trace-id': context.traceId,
    'x-span-id': context.spanId,
    ...(context.parentSpanId && { 'x-parent-span-id': context.parentSpanId }),
  };
}
