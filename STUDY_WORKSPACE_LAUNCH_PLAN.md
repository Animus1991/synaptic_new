# Study Workspace — Launch Readiness Plan

Every tool reads **WorkspaceContext** (§2.1), emits **LearningEvents** (§2.2), and projects through **Concept Bus / Weak Areas / Progress / Next Action**. No siloed features.

**Spine (shared correlation):** `workspaceContextModel` · `emitWorkspaceConceptEvent` · `workspaceConceptBus` · `workspaceCorrelation` · `workspaceFocus` · `artifactStaleness` · `nextActionEngine` · `workspaceToolAgentPrompts` · `weakAreaReasons` · `conceptBusRemediation`

**Legend:** ✅ Launch-ready · 🟡 MVP-ready · 🟠 Needs polish · 🔴 Prototype · ⬜ Planned

---

## Wave 0 — Spine & contracts ✅

WorkspaceContext, learning events, split-view Agent, dock/strip, ⌘K, stale/reprocess flags.

---

## Wave 1 — Selection-action contract (§13.5) ✅

Identical affordances: *Annotate · Ask Agent · Make card · Quiz · Compare · Debate · Scratchpad · Open in Reader*

| Surface | Status |
|---------|--------|
| Reader | ✅ |
| Concept Map | ✅ |
| LessonContent | ✅ |
| Compare / Debate rows | ✅ |
| Annotations sidebar | ✅ (Wave 5B) |

---

## Wave 2 — Per-tool upgrades (§13.4) 🟡

| Tool | Status | Remaining polish |
|------|--------|------------------|
| Reader | 🟡 | Heatmap learning mode ✅; OCR fragment actions |
| Concept Map | 🟡 | — |
| Scratchpad | 🟡 | SymPy offline validation ✅ |
| Whiteboard | 🟡 | Agent diagram explain ✅ |
| Leitner | 🟡 | — |
| Feynman | 🟡 | — |
| Quiz | 🟡 | Session summary copy ✅ |
| Simulator | 🟡 | Exam presets ↔ Timer ✅ |
| Timer | 🟡 | Exam blocks ↔ Simulator ✅ · Break → Leitner ✅ |
| Annotations | 🟡 | Reprocess remap UI ✅ |
| Progress | 🟢 | PDF/HTML/JSON session export |

---

## Wave 3 — Intelligence rail (§13.3) ✅

| Component | Status |
|-----------|--------|
| ConceptBusPanel remediation matrix | ✅ |
| WeakAreasFocusRail reasons | ✅ |
| WorkspaceDiscoverabilityPanel | 🟢 |
| WorkspaceLearningActionBar | ✅ |

---

## Wave 4 — Agent coexistence (§13.6) ✅

| Item | Status |
|------|--------|
| WorkspaceContext injection | ✅ |
| Split view | ✅ |
| Mode-specific prompts per tool | ✅ `workspaceToolAgentPrompts.ts` |
| Low-quality source warning in Agent banner | 🟡 |

---

## Wave 5 — Cross-surface harmonization ✅

| Item | Status | Spine links |
|------|--------|-------------|
| **5A** Progress weak spots + reasons + remediation | ✅ | Concept Bus → Dashboard |
| **5B** Annotations selection contract | ✅ | Same bar as Reader |
| **5C** Discoverability ↔ next action engine | ✅ | nextActionEngine → subline, tool, quick actions |
| **5D** Quiz panel selection contract | ✅ | §13.5 bar → Concept Bus |
| **5E** Progress PDF / session export | ✅ | Concept Bus snapshot + next action |

---

## Wave 6+ — Launch polish queue (ordered)

See **`PLATFORM_UI_UX_MASTER_PLAN.md`** for platform-wide UI/UX, reliability, and self-explanatory design (Phases A–D).

1. Reader heatmap (real weak/confusion density) — ✅ Wave 6.1 `readerLearningHeatmap.ts`
2. Debate rebuttal persistence — ✅ Wave 6.2 `debateTreePersist.ts`
3. Simulator ↔ Timer exam presets — ✅ Wave 6.3 `examPracticePresets.ts`
4. Annotations reprocess anchor remap UI — ✅ Wave 6.4 `annotationAnchorRemap.ts` + `AnnotationRemapPanel.tsx`
5. Whiteboard Agent diagram coach — ✅ Wave 6.5 `whiteboardDiagramCoach.ts` + `WhiteboardDiagramCoach.tsx`
6. Scratchpad SymPy step validation — ✅ Wave 6.6 `scratchpadSympyValidation.ts` + `sympyScratchpadRunner.ts`
7. Mobile intelligence rail QA — ✅ Wave 6.7 touch targets, scroll cap, ARIA tabpanels (`WorkspaceMobileIntelligenceTabs.tsx`)
8. Full §20 questionnaire audit per tool — Wave 6.8 spine (`workspaceToolS20Spine.ts`) + purpose hint UI

### Wave 6.8 — §20 audit sub-waves (one tool per pass, no skips)

| Sub | Tool | Readiness | Focus |
|-----|------|-----------|-------|
| 6.8a | Reader | launch-ready | ✅ Heatmap + step sync QA (`readerHeatmapStepSyncQA.ts`) |
| 6.8b | Concept Map | launch-ready | ✅ Large-graph layout policy + lens parity (`conceptMapLayoutPolicy.ts`) |
| 6.8c | Quiz | launch-ready | ✅ Selection contract + remediation (`quizSelectionRemediationQA.ts`) |
| 6.8d | Leitner | launch-ready | ✅ Stale artifact mobile UX (`leitnerStaleArtifactUX.ts`) |
| 6.8e | Annotations | launch-ready | ✅ Reprocess remap edge cases (`annotationRemapEdgeCasesQA.ts`) |
| 6.8f | Scratchpad | launch-ready | ✅ SymPy chain edge cases (`scratchpadSympyChainEdgeCasesQA.ts`) |
| 6.8g | Whiteboard | launch-ready | ✅ Coach blueprint coverage (`whiteboardBlueprintCoverageQA.ts`) |
| 6.8h | Debate | launch-ready | ✅ Rebuttal graph persistence (`debateRebuttalGraphPersistQA.ts`) |
| 6.8i | Compare | launch-ready | ✅ Reader selection parity + bilingual OCR ensemble (`compareReaderSelectionParityQA.ts`, `bilingualOcrEnsemble.ts`) |
| 6.8j | Simulator | launch-ready | ✅ Timer preset sync (`simulatorTimerPresetSyncQA.ts`) |
| 6.8k | Timer | launch-ready | ✅ Exam countdown ↔ dashboard (`timerExamCountdownDashboardQA.ts`) |
| 6.8l | Feynman | needs-polish | Rubric export discoverability |
| 6.8m | Progress | launch-ready | Export + Concept Bus mirror |

---

## Implementation order (no skips)

1. ✅ Waves 0–4 core
2. ✅ Wave 5A Progress harmonization
3. ✅ Wave 5B Annotations selection
4. ✅ Wave 5C Discoverability sync
5. ✅ Wave 5D Quiz selection
6. ✅ Wave 5E Progress export
7. ⬜ Wave 6 per-tool polish — Reader 6.1 ✅ · Debate 6.2 ✅ · Sim/Timer 6.3 ✅ · Annotations 6.4 ✅ · Whiteboard 6.5 ✅ · Scratchpad 6.6 ✅ · Mobile intel rail 6.7 ✅ · §20 spine 6.8 🔄

*Updated: Wave 5E — Progress panel HTML/PDF/JSON session export on shared spine.*
