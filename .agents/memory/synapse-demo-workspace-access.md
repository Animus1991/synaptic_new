---
name: Reaching the Synapse Study Workspace (demo flow)
description: How to actually open the internal Study Workspace view (e.g. for Playwright), and why the one-click demo button looks broken.
---

The Study Workspace is an internal `AppView` state (no URL route). To reach it you must
first have a course/task to study, then trigger `openStudyWorkspace` (via starting a task
or an "open workspace" / "study" action).

**Demo entry quirk:** clicking "Explore Demo" / "See Demo" calls `updateSettings({ showDemoContent: true })`
+ `completeOnboarding`. Neither re-seeds the `courses` state — `setCourses(initialCourses(...))`
only runs at store **init** (and in `applyRemoteLibrary`, which itself reads stale `user.settings`).
So immediately after clicking the demo button the Library/Dashboard stay EMPTY.

**Why:** `showDemoContent` is read once when the store initializes its `courses` useState from
persisted settings. Toggling the setting later only flips a filter (`visibleCourses`) over an
already-empty array; it does not inject `mockCourses`.

**How to apply:** to land in the workspace (tests or manual repro):
1. Navigate to `/`, click the demo button ("Explore Demo" on dashboard, "See Demo" on landing).
2. **Reload the page** (`/` again) — store re-inits and `initialCourses` now includes mockCourses
   (c1–c4) because the persisted setting is true.
3. Open a demo task (e.g. task "Review: Supply & Demand Equilibrium") or open the
   "Microeconomics Fundamentals" course and start studying → `study-workspace` testid appears.

Demo seed IDs: courses c1–c4, tasks task1–task10 (see `lib/demoMode.ts`, `demo/mockData.ts`).
