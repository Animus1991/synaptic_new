# Memory index

- [Bilingual regex boundaries](bilingual-regex.md) — JS `\b` is ASCII-only and never fires around Greek letters; use `\p{L}\p{N}` lookarounds + `/u` in this EL/EN codebase.
- [Workspace honesty convention](workspace-honesty-convention.md) — Study Workspace tools must avoid false precision; show absolute / fraction-of-range when a percent is undefined.
- [Synapse typecheck ops](synapse-typecheck-ops.md) — phantom TS errors in untouched files = stale `.tsbuildinfo`; how to get a true-green check; tests are env-only.
