# NotebookLM bridge — product strategy

**Status:** Sprint L13 (Jul 2026)  
**North star:** *NotebookLM to understand · Synapse to retain and for teachers to see.*

Synapse is a **learning OS**, not a NotebookLM clone. We do **not** compete on grounded chat, RAG quality, or Studio audio. We **bridge** NotebookLM exports into structured study, FSRS retention, and teacher visibility.

---

## Positioning

| Layer | Owner | Synapse role |
| ----- | ----- | ------------ |
| Source-grounded Q&A | [NotebookLM](https://notebooklm.google.com/) | Deep link out; import exports back in |
| Course structure | Synapse | Upload / NLM import → outline → diagnostics |
| Study session | Synapse | Study Workspace + tools |
| Retention | Synapse | FSRS, Leitner, Anki `.apkg`, due queue |
| Institution | Synapse | SAML, LTI, cohort heatmaps, audit |

**LLM policy:** BYOK API (Gemini, Claude, OpenAI). Use LLM for generation and scoped explain — never as the whole product surface.

---

## Integration model (no public API)

NotebookLM has **no public API**. Integration is **file + workflow**:

### Import (NLM → Synapse)

| NotebookLM artifact | Synapse destination | L13 slice |
| ------------------- | ------------------- | --------- |
| Saved note / study guide (markdown) | Library `UploadedFile` (`ingestMethod: notebooklm-import`) | **L13-1** |
| Studio Quiz (paste) | Parser → quiz cards → FSRS deck one-click / Anki TSV | **L13-3** / L13-1 |
| Chat transcript (manual copy) | Supplementary source text | L13-2 |
| Audio transcript | Course media panel | backlog |

**UI:** Library → **Import from NotebookLM** (paste or `.md` / `.txt`).

### Export (Synapse → NLM)

| Synapse artifact | NotebookLM action |
| ---------------- | ----------------- |
| Course summary + glossary | Paste as new source in a notebook |
| Weak-area report | New notebook «Review pack» |
| FSRS due list | Checklist note (manual) |

### Deep link

On each imported source: **Open in NotebookLM** → `https://notebooklm.google.com/` with user instructions to upload the linked PDF or paste the summary.

---

## What we cut (consolidation)

Features that duplicate NotebookLM without moat are **hidden** by default (`platformFocus.ts`):

- Standalone **Agent** nav tab (Agent remains in Study Workspace context)
- **Cross-library synthesis** hero panel (use NotebookLM for multi-doc digest)

Re-enable via `VITE_SHOW_NOTEBOOKLM_PARITY=true` for power users / QA.

---

## Sprint L13 roadmap

| Slice | Deliverable |
| ----- | ----------- |
| **L13-1** | `notebooklmImport.ts` + Library import panel |
| **L13-2** | `openNotebookLm()` + `@capacitor/browser` + per-source buttons |
| **L13-6** | `NotebookShellView` — 3-column Synapse-native shell |
| **L13-3** | Studio Quiz → FSRS deck one-click (`notebooklmFsrsImport.ts`) |

---

## Regression gate

```bash
npm test -- src/lib/notebooklmImport.test.ts src/lib/notebooklmFsrsImport.test.ts
npm run typecheck
npx playwright test e2e/a11y-toast-aria-live.spec.ts
```

---

## References

- `src/lib/notebooklmImport.ts` — parser + `UploadedFile` builder
- `src/lib/notebooklmBridge.ts` — deep link + in-app browser
- `src/components/NotebookShellView.tsx` — 3-column shell
