---
name: Synapse demo + Study Workspace
description: How the demo mode populates the Study Workspace, and gotchas that make redesign work invisible.
---

# Demo mode drives what the user can evaluate

The Study Workspace is only reachable via demo or a real upload. When showing UI/UX work,
the user almost always views the **demo**. Two traps make redesign work look like "nothing changed":

## 1. Demo navigation must open the workspace, not just flag it
Opening the workspace requires BOTH `enableDemoContent()` and an actual navigation +
`openStudyWorkspace()`. Setting only `studyWorkspaceOpen=true` while `currentView` stays
`landing` leaves the landing early-return in control, so the overlay never renders.
A `?demo=1` deep link exists for reaching the workspace directly (useful for screenshots).

## 2. Demo had no SOURCE content → every tool showed an empty "upload your notes" state
Demo seeds courses/tasks but historically seeded **no uploaded files**, so `noteBundle.hasSource`
was false and Reader/Quiz/ConceptMap/RAG all rendered empty upload prompts — the redesign was
invisible and tools looked non-functional.
**Fix:** in-memory demo source files (`demo/mockSource.ts`) injected via `initialUploadedFiles` /
`initialGlossary` (demoMode.ts), guarded by `demo-file-` id prefix and stripped before persist
(`stripDemoFiles` inside `persistLibrary`). Never persisted to the user's real library.
**Why:** lets the demo demonstrate every tool with grounded content without touching real data.

## 3. Demo source files must set `pipelineVersion` to the current `CONTENT_PIPELINE_VERSION`
Otherwise the Reader shows an alarming amber "analyzed with an older recognition pipeline …
re-upload" card (WorkspaceSourceStatusBar), which is exactly the kind of clutter to avoid.
Low-quality warning threshold is `< 50` (`LOW_SOURCE_QUALITY_THRESHOLD`), separate from the
pipeline-outdated warning.

# Redesign conventions (UI/UX work)
- **ws-* type scale** lives in index.css (`ws-eyebrow`=11px upper, `ws-caption`=12px, `ws-meta`=13px,
  `ws-body`=14px, `ws-title`=16px). Use these instead of ad-hoc `text-[9/10/11px]`. Reserve 9-10px for
  badges/counts ONLY. Min interactive text 12px; hit targets 32px desktop / 44px mobile.
- **The "3 sections" are NOT duplication** — pedagogical step rail (workspace-step-rail-*) vs document
  heading nav (reader-section-nav) vs current step title are distinct affordances. Do NOT collapse them.
  **Why:** one document section can span multiple lesson steps; they answer different questions.
- **One primary next-action rule:** the rich left NEXT ACTION card (WorkspaceLearningActionBar in
  LessonContent) is canonical when the lesson panel is visible; the compact top-bar next-action button
  should render ONLY when that card is hidden (`layout === 'focus-tool' || lessonCollapsed`).
- **Architect (code_review) calls time out at 120s** on this large multi-file scope — keep `task` tight
  and `relevantFiles` minimal, or skip and proceed on own judgment.

# Verifying the workspace
Typecheck filter (no vitest runner is wired): 
`pnpm --filter @workspace/synapse run typecheck 2>&1 | grep "error TS" | grep -vE "vitest|@testing-library|\.test\."` — empty = clean.
Screenshot the populated workspace via app_preview, path `/?demo=1`.
