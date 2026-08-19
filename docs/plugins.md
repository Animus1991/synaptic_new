# Plugin API (D7)

Synapse ships a first-party plugin subsystem plus an in-app marketplace UI
(`PluginMarketplacePanel`, surfaced in Settings). This document describes what is
implemented today and the hardening required before *untrusted third-party* code
could ever be loaded.

## Threat posture (why this is safe today)

The current design is deliberately conservative: **only curated, first-party
plugins that ship inside the app bundle can run.** There is no mechanism to fetch
or `eval` external code, so the classic add-on supply-chain risks (arbitrary
network, DOM exfiltration, token theft) are structurally out of reach until the
sandbox story below is built.

- Plugins are plain in-process JS objects registered through `registerSynapsePlugin`
  (`src/lib/pluginApi.ts`) — not downloaded scripts.
- Server-side capabilities (LLM proxy, OCR, RAG) stay behind authenticated
  `/v1/*` routes with per-account quotas + prompt/output moderation (Wave A6).
  Plugins do **not** get privileged network access; they only transform payloads
  already flowing through the client.
- Do not load third-party scripts into the study workspace without a CSP review.

## Implemented API (current state)

### Hook registry — `src/lib/pluginApi.ts`

A plugin is:

```ts
type SynapsePlugin = {
  id: string;
  name: string;
  version: string;
  description?: string;
  hooks?: Partial<Record<SynapsePluginHook, (payload: unknown) => unknown | Promise<unknown>>>;
};
```

Three transform hooks are exposed (`SynapsePluginHook`). Each runs as a sequential
pipe — every enabled plugin receives the previous plugin's output:

| Hook | Fired by | Contract |
|------|----------|----------|
| `leitner:beforeExport` | Anki/Leitner deck export | Receives/returns the card array; used to add tags |
| `course:afterGenerate` | Course generation from notes | Receives/returns `{ course }`; may stamp `pipelineMeta.pluginsApplied` |
| `agent:beforeReply` | Agent reply rendering | Receives/returns `{ text, studyMode }`; may rewrite reply text |

`runPluginHook(hook, payload)` folds the payload through the registry; the typed
wrappers `applyAgentBeforeReplyPlugins` and `applyCourseAfterGeneratePlugins`
defensively validate the returned shape and fall back to the original payload if a
plugin returns something malformed.

### Marketplace catalog — `src/lib/pluginMarketplace.ts`

- `initPluginMarketplace()` seeds the catalog from `REFERENCE_PLUGINS` and restores
  the user's enabled set from `localStorage` (`synapse-plugin-enabled`). With no
  saved state it enables `synapse.fsrs-tags` by default.
- `setPluginEnabled(id, enabled)` registers/unregisters the plugin and persists the
  enabled set; `isPluginEnabled` / `listPluginCatalog` back the Settings panel.

### Reference plugins — `src/lib/referencePlugins.ts`

Four curated examples double as living API docs and as the marketplace catalog:
`synapse.fsrs-tags`, `synapse.export-watermark`, `synapse.agent-preface`,
`synapse.course-stamp`.

### Tests

`src/lib/pluginApi.test.ts` and `src/lib/pluginMarketplace.test.ts` cover
registration, hook folding, enable/disable persistence, and payload fallbacks.

## Target sandbox (required before untrusted plugins)

Loading third-party code is **not** supported yet. Before it can be, all of the
following must land:

1. **Manifest + permissions** — declare capabilities (`storage`, `ui.panel`,
   `llm.proxy`, …); host grants least privilege, default-deny network.
2. **Isolation** — run untrusted code in a Web Worker / sandboxed `iframe`
   (`sandbox` attr, no `allow-same-origin`) behind a strict CSP, never on the main
   study thread.
3. **Permission audit log** — record grants/revocations (feeds the D8 admin
   cost/abuse dashboard).
4. **Distribution integrity** — signed/pinned plugin bundles + version review.

Until every item above ships, treat external plugin loading as unavailable, not
merely experimental.

See `docs/UPGRADE_BACKLOG.md` D7 and `docs/INDEX.md`.
