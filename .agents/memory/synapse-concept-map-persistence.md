---
name: Synapse concept-map persistence & debounced saves
description: Scoped layout persistence and the stable-handler rule for debounced child writers
---

Rule: Synapse Study Workspace state is persisted **per scope**, keyed by
`progressKey = taskId ? 'task:'+taskId : 'concept:'+quizConcept`. Concept-map node
positions/notes are saved/loaded with this scope so layouts don't bleed across tasks.

**Persistence needs BOTH ends wired.** A loader existing in `workspacePersistence.ts`
does not mean it runs. `loadConceptMapPositions` was defined but never called, so
dragged layouts saved fine but silently reset on every remount. Restore happens by
merging saved `{x,y,note}` over the freshly-seeded nodes at the data-build site
(the `conceptNodes` useMemo), keyed by id — new nodes keep their deterministic seed,
removed nodes are not resurrected. Seeding itself (`buildConceptMapFromCourse`, arc
layout cx=320 cy=200 r=140) is already deterministic — no randomness to "stabilize".

**Stable-handler rule for debounced children:** a save handler passed into a child
that debounces + flushes-on-unmount MUST be referentially stable per scope
(`useCallback(..., [progressKey])`). An inline arrow recreates the handler every
render, which makes the child's flush-cleanup effect (`deps: [onNodeUpdate]`) tear
down and re-run every render — flushing immediately and defeating the debounce.
**Why:** with a stable handler, the cleanup captures the OLD handler and flushes any
pending write to the OLD scope right before the scope changes — no cross-scope
contamination, no lost last-write on unmount.

**How to apply:** when wiring any debounced writer (concept map, whiteboard, etc.),
(1) confirm the loader is actually called at the build site, (2) stabilize the save
callback on its scope key, (3) flush pending writes on unmount/scope-change. Calling
the debounced `persistNodes` inside a `setNodes` updater is acceptable here because it
only touches refs + a timer (no setState), and the debounce coalesces StrictMode
double-invokes.
