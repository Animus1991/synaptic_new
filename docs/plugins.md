# Plugin API (D7 draft)

Synapse supports an in-app plugin marketplace UI (`PluginMarketplacePanel`). This doc is the operator-facing sandbox story.

## Principles

- Plugins run in a **restricted client sandbox** (no raw Node, no arbitrary network from untrusted code).
- Server-side capabilities (LLM proxy, OCR, RAG) stay behind authenticated `/v1/*` routes with quotas + moderation (A6).
- Do not load third-party scripts into the main study workspace without CSP review.

## Sandbox story (target)

1. Manifest declares permissions (`storage`, `ui.panel`, `llm.proxy`…).
2. Host grants least privilege; default deny network.
3. Audit log for permission grants (future admin dashboard D8).

## Current state

Marketplace panel ships in Settings; treat external plugin loading as experimental until CSP + permission gate land.

See `docs/UPGRADE_BACKLOG.md` D7.
