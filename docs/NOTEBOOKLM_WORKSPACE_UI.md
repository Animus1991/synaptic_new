# NotebookLM-style Study Workspace UI

**Status:** Phase 0–3 partial · Phase 2 chat-inline **in progress (Jul 2026)**  
**North star:** *NotebookLM to understand · Synapse to retain + teacher visibility*  
**Reference:** [notebooklm.google.com](https://notebooklm.google.com/)

Synapse does **not** clone NotebookLM. We adopt its **calm 3-panel shell** while keeping every existing workspace tool behind Studio cards and a discreet overflow menu — zero feature removal.

---

## Audit — what prior LLM work already shipped

### Bridge & data layer (L13–L16) — **shipped**

| Area | Files | Status |
|------|-------|--------|
| NLM import (study guide, quiz, chat, audio) | `notebooklmImport.ts`, `NotebookLmImportPanel` | ✅ |
| NLM export (study guide, review pack, FSRS due) | `notebooklmExport.ts`, `NotebookLmExportPanel` | ✅ |
| Deep link to Google NLM | `notebooklmBridge.ts` | ✅ |
| Audio → FSRS | `notebooklmAudioFsrsImport.ts` | ✅ |
| Command palette bridge | `notebooklmBridgeCommands.ts` | ✅ |
| Course-level shell (Library/Course entry) | `NotebookShellView.tsx` | ✅ |
| Teacher cohort NLM heatmap | `notebooklmBridgeAnalytics.ts`, `CohortNotebookLmHeatmap` | ✅ |

### Workspace re-architecture (Phase B, master plan) — **partial**

| Item | Status | Notes |
|------|--------|-------|
| `WorkspaceProvider` + thin `StudyWorkspace.tsx` shell | ✅ | Chunk split, boot shell |
| `StudyWorkspaceBody` + `useStudyWorkspace` model | ✅ | Single model drives all tools |
| `WorkspaceContextBar` (3 chips + sheet) | ✅ | Classic layout only |
| `ToolFrame` / lazy tool registry | 🔶 | Secondary tools lazy; reader eager |
| 13 workspace tools in `workspaceToolRegistry.ts` | ✅ | All registered |
| Virtualised StepRail, worker PMI/BM25 | ✅ | Classic layout |
| Perf budget E2E | ✅ | |

### NotebookLM 3-panel workspace — **partial (this initiative)**

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **0** Skeleton | `NotebookWorkspaceLayout.tsx` — 3 resizable panels (`react-resizable-panels`) | ✅ |
| **0** Toggle | `notebookMode` persisted (`workspace-notebook-mode`, default **on**) | ✅ |
| **0** Header | Minimal chrome when `notebookMode` (`StudyWorkspaceChrome` ⋯ menu) | ✅ **this sprint** |
| **1** Sources | Source list, add source, source guide (AI), quality/reprocess strip | ✅ |
| **1** Thumbnails | File-type icons only | 🔲 |
| **2** Chat center | Inline `Agent` via `renderCenterAgent` + `embedded` prop | ✅ **this sprint** |
| **2** No redirect | `openAgentFromWorkspace` stays in workspace unless `fullPage: true` | ✅ **this sprint** |
| **3** Studio | 12 tool cards + Ask AI sparkle; `StudyWorkspaceToolSurface` overlay | ✅ |
| **4** AI-assist | `openAgentForTool` / `askAiForTool` per card | ✅ partial |
| **5** Mobile | Notebook layout disabled on mobile; classic bento chrome | 🔲 |
| **5** i18n | el/en in layout strings | ✅ partial |
| **5** Tests | `data-testid` hooks present | 🔶 needs E2E |

### Known gap (fixed this sprint)

**Before:** `openAgentFromWorkspace` closed workspace and `navigate('agent')` — chat button left the session.  
**After:** `workspaceInlineAgentOpen` + `Agent embedded` in center panel; full page only via «Πλήρης προβολή» / `fullPage: true`.

---

## The 13 studio tools (none removed)

From `workspaceToolRegistry.ts`:

1. Reader (Sources column, not Studio card)  
2. Concept Map  
3. Scratchpad  
4. Whiteboard  
5. Flashcards (Leitner)  
6. Feynman  
7. Quiz  
8. Simulator  
9. Compare  
10. Debate  
11. Timer  
12. Annotations  
13. Progress (dashboard)

Classic layout: dock + command palette + lesson panel.  
Notebook layout: Studio grid + overflow menu (⌘K, notes, study room, weak areas, classic view).

---

## Architecture

```
StudyWorkspaceBody
├── StudyWorkspaceChrome (minimal when notebookMode)
├── notebookMode && !mobile ?
│     └── NotebookWorkspaceLayout
│           ├── Sources panel
│           ├── Chat panel → renderCenterAgent() → Agent embedded
│           └── Studio panel → cards | StudyWorkspaceToolSurface
└── else StudyWorkspaceMainLayout (classic, unchanged)
```

**Additive rule:** `NotebookWorkspaceLayout` reuses `StudyWorkspaceModel` and `StudyWorkspaceToolSurface` — no tool logic duplicated.

---

## Phased rollout (remaining work)

### Phase 1 completion
- [ ] Source thumbnails (PDF/page preview chips)
- [ ] Pin active source in Sources list
- [ ] Reader opens in Studio overlay with citation sync to chat

### Phase 2 completion
- [ ] Citation chips in embedded chat jump to reader selection
- [ ] Auto-focus chat input on workspace open
- [ ] Classic layout: optional inline chat drawer (no redirect)

### Phase 3 completion
- [ ] Studio card generation states (audio overview, mind map — Synapse-native)
- [ ] Expanded tool overlay with persistent «Ask AI» rail

### Phase 4 — AI-assist everywhere
- [ ] Per-tool default prompts in `notebooklmBridgeCommands` style registry
- [ ] «Φτιάξε κουίζ» / «Mind map από πηγή» one-click from Studio

### Phase 5 — polish
- [ ] Mobile: bottom sheet Sources | Chat | Studio tabs
- [ ] Playwright: `notebook-workspace-layout`, `agent-embedded`, no redirect on chat click
- [ ] `npm run typecheck` + visual regression screenshot

---

## Regression gate

```bash
npm run typecheck
npm test -- src/lib/notebooklmBridgeCommands.test.ts
npx playwright test e2e/a11y-toast-aria-live.spec.ts
```

Manual QA:
1. Open Study Workspace → default NotebookLM 3-panel view  
2. Click Agent / chat → stays in center panel (not Agent nav tab)  
3. Studio card → tool opens; «Ask AI» pre-fills chat  
4. ⋯ menu → command palette, notes, classic view still work  
5. «Πλήρης προβολή» → optional full Agent page  

---

## References

- `docs/NOTEBOOKLM_BRIDGE.md` — import/export bridge strategy  
- `SYNAPTIC_FULL_SCALE_MASTER_PLAN_V2.md` — Phase B workspace re-architecture  
- `src/components/workspace/studyWorkspace/NotebookWorkspaceLayout.tsx`  
- `src/components/workspace/studyWorkspace/StudyWorkspaceChrome.tsx`  
- `src/lib/workspaceToolRegistry.ts`
