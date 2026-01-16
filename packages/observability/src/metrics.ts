import { ToolExecutionResult } from '@ai-toolkit/tool-contract';

/**
 * Metric type
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
}

/**
 * Metric
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

/**
 * Metrics collector
 */
export class MetricsCollector {
  private metrics: Metric[] = [];

  /**
   * Zaznamená metric
   */
  record(
    name: string,
    type: MetricType,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.metrics.push({
      name,
      type,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Zaznamená counter
   */
  increment(name: string, labels?: Record<string, string>): void {
    this.record(name, MetricType.COUNTER, 1, labels);
  }

  /**
   * Zaznamená gauge
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, MetricType.GAUGE, value, labels);
  }

  /**
   * Zaznamená histogram (např. latency)
   */
  histogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    this.record(name, MetricType.HISTOGRAM, value, labels);
  }

  /**
   * Zaznamená tool execution metrics
   */
  recordToolExecution(
    toolId: string,
    result: ToolExecutionResult
  ): void {
    // Latency
    this.histogram('tool.execution.latency', result.latency, {
      tool: toolId,
      status: result.success ? 'success' : 'error',
    });

    // Success/Error counter
    if (result.success) {
      this.increment('tool.execution.success', { tool: toolId });
    } else {
      this.increment('tool.execution.error', {
        tool: toolId,
        error_type: result.error?.type || 'unknown',
      });
    }

    // Cost
    if (result.cost !== undefined) {
      this.histogram('tool.execution.cost', result.cost, { tool: toolId });
    }

    // Policy decision
    if (result.policyDecision) {
      if (result.policyDecision.allowed) {
        this.increment('tool.policy.allowed', { tool: toolId });
      } else {
        this.increment('tool.policy.blocked', {
          tool: toolId,
          reason: result.policyDecision.reason || 'unknown',
        });
      }
    }
  }

  /**
   * Vrací všechny metrics
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Vrací metrics pro daný časový rozsah
   */
  getMetricsByTimeRange(startTime: number, endTime: number): Metric[] {
    return this.metrics.filter(
      (m) => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Vrací metrics podle labels
   */
  getMetricsByLabels(labels: Record<string, string>): Metric[] {
    return this.metrics.filter((m) => {
      if (!m.labels) {
        return false;
      }
      return Object.entries(labels).every(
        ([key, value]) => m.labels?.[key] === value
      );
    });
  }

  /**
   * Vyčistí staré metrics
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    this.metrics = this.metrics.filter((m) => now - m.timestamp < maxAge);
  }

  /**
   * Exportuje metrics ve formátu pro Prometheus (zjednodušený)
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    for (const metric of this.metrics) {
      const labels =
        metric.labels && Object.keys(metric.labels).length > 0
          ? `{${Object.entries(metric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')}}`
          : '';
      lines.push(`${metric.name}${labels} ${metric.value}`);
    }
    return lines.join('\n');
  }
}

/**
 * Singleton metrics collector
 */
export const metrics = new MetricsCollector();
