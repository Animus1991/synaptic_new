---
name: Study Workspace "honesty over false precision" convention
description: Design rule for deterministic workspace tools — never display indefensible numbers
---

Rule: Synapse's Study Workspace tools are deterministic and client-side (no LLM).
Every number a tool shows must be defensible from the learner's own notes. Do not
manufacture precision the data cannot support.

Concrete patterns established:
- **Percent vs near-zero baseline:** a "% change from baseline" is undefined when
  the baseline is ~0 and explodes into absurd values for tiny baselines. Gate it
  with a `pctMeaningful` flag (baseline non-trivial AND |pct| within a sane bound);
  otherwise show the **absolute** change with its unit.
- **Ranking / bar magnitude:** rank "how much did the learner move this parameter"
  by **fraction of the slider's own min–max range**, not by percent-of-baseline —
  it stays meaningful even when the baseline is 0.
- **State the method:** sensitivity/what-if readouts include a one-line method note
  clarifying they report independent per-parameter change and do NOT model
  relationships between parameters (point users to the Scratchpad for real formulas).
- **Optional-by-design fields must be guarded at EVERY render site.** Dashboard XP is
  optional: only a real `t.xpReward` is shown; synthetic bus/weak-area next-actions
  carry no `xp`. There are 3 render sites (MiniDashboard, DashboardPanel, and the HTML
  progress export in `progressSessionExport.ts`) — each must guard `xp != null` or it
  prints `+undefined XP`. The HTML export is the one most easily forgotten.

**Why:** The product goal is "maximally functional, no demo/placeholder logic, no
false precision." An earlier sandbox readout divided by a near-zero baseline and
rendered `+100000000%`, which is exactly the indefensible output to avoid.

**How to apply:** When adding any numeric readout to a workspace tool, ask "what
happens at 0, empty input, and unicode/Greek text?" and prefer absolute /
range-relative measures over ratios that can blow up. Keep new UI strings bilingual
EL/EN.
