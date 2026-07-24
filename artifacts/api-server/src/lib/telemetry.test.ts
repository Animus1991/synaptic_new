import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('telemetry', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.OTEL_ENABLED;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_SERVICE_NAME;
  });

  it('getTelemetryStatus reports disabled when OTLP is not configured', async () => {
    const { getTelemetryStatus } = await import('./telemetry');
    expect(getTelemetryStatus()).toEqual({
      enabled: false,
      exporter: 'none',
      serviceName: 'synapse-learning-api',
      endpoint: undefined,
    });
  }, 15_000);

  it('getTelemetryStatus reports enabled when OTLP endpoint is set', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://otel-collector:4318';
    vi.resetModules();
    const { getTelemetryStatus } = await import('./telemetry');
    expect(getTelemetryStatus()).toMatchObject({
      enabled: true,
      exporter: 'otlp-http',
      endpoint: 'http://otel-collector:4318',
    });
  });

  it('initTelemetry is a no-op in test environment', async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://otel-collector:4318';
    vi.resetModules();
    const { initTelemetry } = await import('./telemetry');
    await expect(initTelemetry()).resolves.toBeUndefined();
  });
});
