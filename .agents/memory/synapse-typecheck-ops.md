---
name: Synapse typecheck / test operations
description: How to get a trustworthy typecheck for the synapse artifact and what noise to ignore
---

- **Canonical check:** `pnpm --filter @workspace/synapse run typecheck`. Filter noise
  with `grep -vE "vitest|@testing-library|\.test\.tsx"` then `grep -E "error TS"`.
- **Stale incremental cache:** synapse uses incremental TS (`.tsbuildinfo`). A
  phantom error in a file you did NOT touch (e.g. a `TS2339 'never'` in
  `contentAnalysis.ts` after editing unrelated files) is almost always a stale
  buildinfo artifact, not a real error. Confirm by deleting buildinfo and re-running:
  `find artifacts/synapse -name "*.tsbuildinfo" -delete` then re-typecheck → green.
- **Tests are environment-only:** the synapse package has NO `test` script and
  `vitest` is not runnable via `pnpm --filter ... exec vitest` here (ERR command not
  found). Test-file type errors are environment-only and should be ignored. To
  sanity-check pure deterministic logic, transcribe it into a quick `node -e` script
  instead of running the vitest suite.

**Why:** Repeatedly chasing a phantom `never` typecheck error wasted effort until a
clean rebuild proved it was stale-cache noise.

**How to apply:** Trust a freshly-rebuilt typecheck over both the editor LSP and a
cached run; verify deterministic engines with `node -e` rather than the (unwired)
test runner.
