# Sentry — `synapse:chunk-error` triage

## 0. Runtime init (client)

Set `VITE_SENTRY_DSN` in `.env` (see `.env.example`). `main.tsx` calls
`initSentry()` at boot — no-op when the DSN is absent. When enabled,
`@sentry/react` initializes and exposes `window.Sentry` so
`reportChunkError` forwards chunk-load failures automatically.

## 0.1 Dashboard import (one-time)

```bash
export SENTRY_AUTH_TOKEN=…   # org token with project:write
export SENTRY_ORG=my-org
export SENTRY_PROJECT=synapse-web
npm run sentry:import-dashboard
```

Template: `docs/observability/sentry-dashboard.synapse-chunk-health.json`.

---

`reportChunkError` forwards every dynamic-import / chunk-load failure to
`window.Sentry.captureException` with a structured `extra` payload:

```ts
{
  flow: 'analytics' | 'lesson' | 'agent' | 'teacher' | 'study-workspace' | …,
  attempt: number,
  maxAttempts: number,
  willReload: boolean,
  url?: string,
  message: string,
  version: __APP_VERSION__,   // injected by Vite at build time
  timestamp: string,
  userAgent: string
}
```

The same payload is also dispatched as a `CustomEvent('synapse:chunk-error')`
and beaconed to `POST /__chunk_errors` (best-effort) so non-Sentry hosts can
subscribe.

## 1. Inbound issue grouping

Add a Sentry **Inbound Filter / Fingerprint Rule** so chunk errors group by
`flow + version` instead of stack trace (default grouping splinters into one
issue per chunk hash):

```yaml
# sentry → Settings → Issue Grouping → Fingerprint Rules
error.value:"*Failed to fetch dynamically imported module*" -> ["chunk-error", "{{ extra.flow }}", "{{ extra.version }}"]
error.value:"*Importing a module script failed*"           -> ["chunk-error", "{{ extra.flow }}", "{{ extra.version }}"]
error.value:"*Loading chunk*"                              -> ["chunk-error", "{{ extra.flow }}", "{{ extra.version }}"]
```

## 2. Saved search

```
event.type:error extra.flow:* extra.version:* message:"*dynamically imported module*"
```

Pin under **Issues → Saved Searches** as `Chunk Errors — by flow/version`.

## 3. Dashboard

Create a dashboard `Synapse — Chunk Health` with these widgets:

| Widget | Query | Group by | Viz |
|---|---|---|---|
| Errors per release | `extra.version:*` filter, count() | `extra.version` | Bar (timeseries) |
| Errors per flow | same | `extra.flow` | Stacked bar |
| Reload-forced rate | `extra.willReload:true` / total | `extra.flow` | Big number + table |
| Top failing chunk URLs | filter as above, count() | `extra.url` | Table (top 10) |
| Median attempts before success/give-up | `avg(extra.attempt)` | `extra.flow` | Number |

JSON template (importable via Sentry CLI / API) is provided in
`docs/observability/sentry-dashboard.synapse-chunk-health.json`.

## 4. Alerts

- **Spike per release**: when `count_unique(user)` of `extra.version:<latest>`
  with `error.value:"*dynamically imported module*"` exceeds 25 in 5 min, page
  on-call. Indicates a bad deploy with stale `index.html`.
- **Single-flow regression**: per-flow rule (`extra.flow:analytics` etc.)
  triggering at 10 events / 10 min — catches a broken route in isolation.

## 5. Issue template

When a Sentry issue is converted into a GitHub issue, use
`.github/ISSUE_TEMPLATE/chunk-error.yml` (created alongside this doc). It
prompts for `flow`, `version`, sample `url`, and links the saved search.
