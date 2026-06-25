---
name: Synapse Learning port decisions
description: Key issues discovered when porting synaptic_new repo to the Replit pnpm monorepo as a react-vite artifact
---

## Issue: @xenova/transformers blocked by package firewall

`@xenova/transformers` requires `protobufjs` (via onnxruntime-web), which returns 403 from Replit's package firewall.

**Fix:** Stub `artifacts/synapse/src/lib/localEmbedder.ts` to always return null. The app falls back to BM25 lexical retrieval (already implemented). The dynamic import must be removed entirely — Vite's dep scanner fails even on dynamic imports to missing packages.

**Why:** protobufjs is blocked at the npm registry level in Replit's package firewall.

## Issue: pyodide requires postinstall script

`pyodide` needs `node scripts/copy-pyodide.mjs` (postinstall) to copy WASM files to `/public/pyodide/`. This script doesn't exist in the monorepo context and the package is large.

**Fix:** Remove pyodide from package.json, stub `pyodideRunner.ts` and `sympyScratchpadRunner.ts` to return error messages gracefully.

**Why:** The Python sandbox (SimulatorPanel) is a nice-to-have; all other 10 workspace tools work without it.

## Artifact location

- Artifact: `artifacts/synapse` (kind: web, previewPath: `/`)
- Port: 22167
- CSS tokens: `src/index.css` uses Tailwind v4 `@theme` with `--color-brand-*`, `--color-surface-*`, etc. Do NOT use shadcn CSS variables.
- State: custom store at `src/store/useStore.ts` (not Zustand/Redux)
- Routing: internal `AppView` state, NOT wouter/react-router

## typescript not in catalog

The pnpm workspace catalog does not have a `typescript` entry. Use `"typescript": "^5.9.3"` (explicit version) in devDependencies for this artifact.
