# Staging OTel overrides (B2)

Use with the chart:

```bash
helm upgrade --install synapse ./server/helm/synapse-learning \
  -f server/helm/synapse-learning/values.yaml \
  -f server/helm/synapse-learning/values-staging-otel.yaml
```

## Done criteria

- Collector receives spans when `otel.enabled: true` (wired via `OTEL_*` in Deployment).
- Alert on 5xx spike configured in the observability stack (operator).
- Production remains `otel.enabled: false` until dashboards exist.

Anchors: `server/src/lib/telemetry.ts`, `server/helm/synapse-learning/values.yaml`, `values-staging-otel.yaml`.
