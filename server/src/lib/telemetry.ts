import type { NextFunction, Request, Response } from 'express';
import { context, metrics, SpanStatusCode, trace } from '@opentelemetry/api';
import { config } from '../config';

let sdk: { start(): void | Promise<void>; shutdown(): Promise<void> } | null = null;
let started = false;

const meter = metrics.getMeter('synapse-learning-api');
const requestCounter = meter.createCounter('http.server.request.count', {
  description: 'Total HTTP requests handled by the API',
});
const requestDuration = meter.createHistogram('http.server.request.duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

export type TelemetryStatus = {
  enabled: boolean;
  exporter: 'otlp-http' | 'none';
  serviceName: string;
  endpoint?: string;
};

export function getTelemetryStatus(): TelemetryStatus {
  return {
    enabled: config.otelEnabled,
    exporter: config.otelEnabled ? 'otlp-http' : 'none',
    serviceName: config.otelServiceName,
    endpoint: config.otelExporterOtlpEndpoint,
  };
}

/** Boot OpenTelemetry when OTLP endpoint or OTEL_ENABLED=true is configured. */
export async function initTelemetry(): Promise<void> {
  if (started || !config.otelEnabled || process.env.NODE_ENV === 'test') return;

  const [
    { OTLPMetricExporter },
    { OTLPTraceExporter },
    { Resource },
    { NodeSDK },
    { PeriodicExportingMetricReader },
    { ATTR_SERVICE_NAME },
  ] = await Promise.all([
    import('@opentelemetry/exporter-metrics-otlp-http'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/sdk-metrics'),
    import('@opentelemetry/semantic-conventions'),
  ]);

  const endpoint = config.otelExporterOtlpEndpoint!.replace(/\/$/, '');
  const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  const metricExporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });

  const nextSdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: config.otelServiceName,
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000,
    }),
  });

  await nextSdk.start();
  sdk = nextSdk;
  started = true;
  console.log(`[telemetry] OpenTelemetry export enabled -> ${endpoint}`);
}

export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = null;
  started = false;
}

/** Express middleware -- HTTP spans + request metrics when telemetry is enabled. */
export function telemetryMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.otelEnabled) {
    next();
    return;
  }

  const tracer = trace.getTracer('synapse-learning-api');
  const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
  const span = tracer.startSpan(`${req.method} ${route}`);
  const startedAt = performance.now();

  context.with(trace.setSpan(context.active(), span), () => {
    res.on('finish', () => {
      const durationMs = performance.now() - startedAt;
      span.setAttribute('http.method', req.method);
      span.setAttribute('http.route', route);
      span.setAttribute('http.status_code', res.statusCode);
      span.setAttribute('http.target', req.originalUrl);
      if (res.statusCode >= 500) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
      span.end();

      requestCounter.add(1, {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      });
      requestDuration.record(durationMs, {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      });
    });
    next();
  });
}
