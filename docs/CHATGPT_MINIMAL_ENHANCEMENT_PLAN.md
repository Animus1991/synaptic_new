# ChatGPT-inspired calm UI/UX plan (zero feature removal)

**Status:** active SSoT for post–OPT-M20 calm/chat layer  
**Constraint:** restyle / reorganize / disclose only — **never remove** views, tools, enterprise, auth, i18n, or a11y  
**Brand rule:** ChatGPT / OpenAI chat **principles**, not logo, GPT wordmark, or product clone  
**Relation to Primer:** OPT-M0–M19 shipped GitHub/Primer clarity (`minimal` / `minimal-dark`). This plan is the **next aesthetic axis**: conversation-first calm. Prefer evolving Minimal under a gated CSS layer (`chatgpt-calm` tokens / classes) rather than a third default theme unless Settings needs an explicit toggle.

Related: `docs/PRIMER_GITHUB_ENHANCEMENT_PLAN.md`, `docs/PRIMER_MINIMAL_THEME.md`, `docs/PRIMER_MINIMAL_SCREENSHOT_MATRIX.md`, `src/styles/primer-minimal.css`, `src/components/Agent.tsx`

---

## 0. Executive verdict

| Question | Answer |
|----------|--------|
| Can Synapse feel ChatGPT-calm without losing features? | **Yes** — same IA; softer chat column, quieter chrome, progressive disclosure |
| Is Minimal already ChatGPT? | **No** — Minimal ≈ GitHub (borders, dense slots). ChatGPT ≈ soft canvas, prose column, sticky composer |
| Safest architecture? | CSS + Agent/workspace chat layout under Minimal; Blueprint stays opt-in |
| Start where? | Agent full page + embedded notebook chat (closest surface), then shell sidebar, then tool chrome |
| Clone ChatGPT brand? | **No** — principles only |

---

## 1. What “ChatGPT UI/UX” means here (principles → Synapse)

| Principle | ChatGPT product cue | Synapse mapping | Non-negotiable |
|-----------|---------------------|-----------------|----------------|
| Conversation is the hero | Center column, max-width prose | Agent thread + notebook center chat | Keep modes, citations, grounding |
| Quiet chrome | Thin left rail, icon+label, little subtitle noise | Shell `aside` quieter under Minimal | Keep all nav views |
| Soft surfaces | Fills > hard cards; sparse borders | Tone down `ux-card` / bubble chrome in chat | Status/OCR still reachable |
| Sticky composer | Bottom rounded input bar | Agent `textarea` + send cluster | Keep source pin, mic, modes |
| Assistant as text | Less “card chat”; more document flow | `MessageBubble` assistant: flat, no avatar gradient | User bubble can stay subtle |
| Progressive tools | Models/tools in menus | Modes → sidebar/popover; flow rail collapsed | All 15 modes remain |
| Empty = invite | Large calm empty + few starters | `PlatformEmptyState` + starters above composer | Keep quick actions (collapsed) |
| Motion = functional | Typing/stream only | Gate decorative stagger in chat | `prefers-reduced-motion` |
| One job per viewport | Chat or tool, not both screaming | Notebook 3-panel: sources / chat / studio hierarchy | Keep NotebookLM IA |

**Out of scope (do not port):** OpenAI logo/wordmark, GPT model picker branding, Plus upsell chrome, voice-mode full-screen clone, memory marketing UI, equal “app grid” replacing study tools.

---

## 2. Baseline after Primer (what we already have)

### 2.1 Shipped (helps ChatGPT calm)

| Asset | Why it helps |
|-------|----------------|
| `minimal` / `minimal-dark` default | Neutral canvas; orbs gated in app-shell |
| `CollapsibleChromeSection` | Agent flow + quick actions already collapsible |
| Status bus + shell inbox | Noise off the thread |
| Density Comfortable/Compact | Greek safety + compact chrome |
| Overflow menus (classic/notebook) | Fewer permanent icons |
| Command palette + `?` help | Power without permanent walls |
| Content-first empty states (M18) | Closer to ChatGPT empty invite |

### 2.2 Conflicts / gaps vs ChatGPT calm

| Area | Current (Minimal/Primer) | ChatGPT-like target |
|------|--------------------------|---------------------|
| Aesthetic axis | Border-first, table/tool density | Soft fill, prose breathing room |
| Agent bubbles | Card + border + gradient avatar | Assistant: plain text block; user: soft fill |
| Agent layout | Wide + side mode catalog + banners | Centered ~48rem column; modes in rail/menu |
| Composer | Functional but utilitarian | Rounded sticky bar, subtle shadow/border, auto-grow |
| Shell nav | Subtitles under each item (`Shell.tsx`) | Optional single-line labels; subtitles in tooltip/`title` only |
| Panels | Many `ux-card` / `platform-panel-*` | Chat surfaces flatter; keep cards for *interactive* tool UIs |
| Color accents | Multi-accent mode icons | One quiet accent; modes via icon+label not rainbow |
| Embedded chat | Compact but still “panel” | Match full Agent calm for notebook center |

---

## 3. Non-negotiable inventory (must remain 100%)

Landing, Onboarding, Dashboard, Library, Course (4 tabs), Note Analysis, Tasks, Agent (**all modes**), Analytics, Teacher, Student Org, Settings · Workspace tools (reader, concept-map, scratchpad, whiteboard, leitner, feynman, quiz, simulator, compare, debate, timer, annotations, dashboard/intel) + discover/concept-bus/weak-areas · split/focus/zen · notebook 3-panel · agent/course splits · OCR/conflict/remap · CRDT · IRT · FSRS · roster/assignments/discussion/gradebook · LTI/SAML/passback · Auth/sync/billing/Google/plugins · EL/EN · WCAG AA · Blueprint selectable.

---

## 4. Surface audit → ChatGPT adaptations (no removals)

### 4.1 Agent (primary ROI)

| Pattern | Adaptation | Keep |
|---------|------------|------|
| Centered thread | `max-w-3xl` (or ~48rem) centered message list | Streaming, citations, grounding badges |
| Soft assistant | Remove/gradient-mute avatar under Minimal; assistant = prose | RichText, system messages |
| Soft user | Muted fill, not loud brand slab | Role distinction |
| Sticky composer | Bottom bar: grow textarea, send, attach/source, mode chip | Source filter, pin file, mic if present |
| Modes | Desktop: slim rail or ⌘K; mobile: sheet | All modes in catalog |
| Flow rail / quick actions | Stay in `CollapsibleChromeSection` (default collapsed) | Same actions |
| Empty state | Centered invite + 3–6 starters above composer | Dashboard next-action hooks |
| Embedded | Same bubble/composer tokens as full page | `embedded` + `onOpenFullPage` |

**Key files:** `src/components/Agent.tsx`, `agent/AgentModeSidebar.tsx`, `AgentFlowRail.tsx`, `AgentContextBanner.tsx`, `primer-minimal.css` (new calm selectors)

### 4.2 Shell

| Pattern | Adaptation | Keep |
|---------|------------|------|
| Narrower/quieter rail | Optional `w-56`, hide nav subtitles under Minimal (keep `title=`) | All `nav-*` views + badges |
| Top actions | Search/⌘K + bell as primary; theme cycle secondary | Notifications panel contents |
| Less orb DNA | Already gated; ensure no residual glow on chat routes | Landing mild orbs OK |

**Key files:** `src/components/Shell.tsx`, `primer-minimal.css`

### 4.3 Notebook workspace chat column

| Pattern | Adaptation | Keep |
|---------|------------|------|
| Chat as calm middle | Apply Agent calm CSS when `embedded` | Sources + Studio panels |
| Studio cards | Soft list, not loud tiles | All studio-card tools |
| Sources | File list density like ChatGPT sidebar files | Upload/OCR paths |

**Key files:** `NotebookWorkspaceLayout.tsx`, embedded `Agent`

### 4.4 Classic dock / tools

| Pattern | Adaptation | Keep |
|---------|------------|------|
| Tool body first | Keep M2/M9 overflow + Status | All dock tools |
| Not “chat clone” | Tools stay tool UIs; only shared tokens (radius, border quiet) | Quiz/Leitner/etc. |

### 4.5 Dashboard / Library / Tasks / Analytics / Teacher / Org / Settings

| Pattern | Adaptation | Keep |
|---------|------------|------|
| Quieter page headers | One title + one line; secondary in collapse | KPIs, tables, LTI |
| Lists over card grids (where safe) | Soft rows for courses/tasks under Minimal | Filters, upload, deep links |
| Settings | Grouped sections like ChatGPT settings: calm list, not marketing cards | Theme/density/Blueprint |

### 4.6 Mobile

| Pattern | Adaptation | Keep |
|---------|------------|------|
| Bottom composer safe-area | Agent + embedded | Drawer tools |
| Single-line nav drawer | Labels without dual subtitle stack | All mobile nav targets |

---

## 5. Functional patterns worth adapting (add/organize only)

| ChatGPT-like capability | Synapse mapping | Benefit | Wave |
|-------------------------|-----------------|---------|------|
| Sticky composer | Agent + embedded | Muscle memory | **OPT-C1** |
| Soft message rhythm | MessageBubble restyle under Minimal | Readability | **OPT-C1** |
| Model/tool menu | Mode catalog in menu/sidebar (already partial) | Less rainbow chrome | **OPT-C2** |
| Conversation starters | Empty-state chips (keep quick actions) | Faster first message | **OPT-C1** |
| Sidebar collapse | Shell collapse / icon rail optional | Focus | **OPT-C3** |
| “Temporary chat” calm | Zen-adjacent: hide non-chat chrome while Agent focused | Deep work | **OPT-C4** |
| Stop / regenerate affordances | Ensure visible near stream end (if present, style; if missing, add without removing send) | Control | **OPT-C2** |
| File/context chip near composer | Source pin + course filter as chips | Grounding clarity | **OPT-C1** |
| Shared chat tokens | CSS variables `--chat-column`, `--composer-radius` | Consistency | **OPT-C0** |

---

## 6. Wave plan (OPT-C*)

| Wave | Scope | Done when | Risk |
|------|--------|-----------|------|
| **OPT-C0** | Tokens: chat column width, composer radius, bubble typography; CSS file `src/styles/chatgpt-calm.css` imported under Minimal only; inventory doc | Visual tokens exist; Blueprint unchanged | Low — **shipped 2026-07-19** |
| **OPT-C1** | Agent full + embedded: centered thread, soft bubbles, sticky composer, starters | Agent feels conversation-first; all modes/citations/stream OK | Medium — **shipped 2026-07-19** |
| **OPT-C2** | Mode UI quieting: reduce multi-color mode noise; catalog in rail/menu; stop/regenerate polish | Modes 100% reachable | Low |
| **OPT-C3** | Shell: quieter nav (subtitle → tooltip), optional collapse width | All nav testids + a11y | Low — **shipped 2026-07-19** |
| **OPT-C4** | Notebook center chat parity + optional “focus chat” chrome hide | 3-panel IA intact | Medium — **shipped 2026-07-19** |
| **OPT-C5** | Dashboard/Library/Tasks soft lists under Minimal | No feature loss | Low |
| **OPT-C6** | Analytics/Teacher/Org/Settings calm headers | Enterprise intact | Low |
| **OPT-C7** | Mobile composer + drawer label cleanup | Touch targets ≥ 40px | Medium |
| **OPT-C8** | Screenshot matrix rows for calm Agent/shell (extend M20 or sibling checklist) | Human Pass? | Process |

---

## 7. ROI-ranked gap list (actionable)

1. **Agent message bubbles** — assistant too “cardy”; gradient avatar fights calm (**C1**)  
2. **Agent column width** — thread not conversation-centered (**C1**)  
3. **Composer** — not sticky/soft enough vs ChatGPT bar (**C1**)  
4. **Mode rainbow** — 15 colored modes compete with content (**C2**)  
5. **Shell nav subtitles** — doubles vertical noise (**C3**)  
6. **Embedded Agent parity** — notebook chat still panel-like (**C4**)  
7. **Context banner / task strip** — brand tint bars above chat (**C1/C4** disclose)  
8. **Flow rail default** — even collapsed, ensure zero idle height noise (**C1**)  
9. **Library card grid** — denser than ChatGPT file sidebar (**C5**)  
10. **Dashboard multi-panel** — still “hub”; collapse secondary (**C5**)  
11. **Tool dock icon wall** — keep tools; prefer overflow already shipped; soft active state (**C4**)  
12. **Settings theme UI** — clarify Minimal = calm/chat; Blueprint = expressive (**C6**)  
13. **Empty Agent** — strengthen centered invite + starters (**C1**)  
14. **Citations chrome** — keep; style as quiet footnotes not chips wall (**C1**)  
15. **Motion** — mode sheet AnimatePresence OK; reduce decorative (**C0/C1**)  
16. **Teacher/Analytics** — headers only; no chat clone (**C6**)  
17. **Landing** — already brand-first; don’t ChatGPT-clone marketing (**non-goal**)  
18. **M20 human QA** — add calm Agent captures after C1 (**C8**)

---

## 8. Aesthetic rules (scientific / objective)

| Rule | Measure |
|------|---------|
| Conversation dominance | ≥60% of Agent viewport height is thread+composer when keyboard closed |
| Accent budget | ≤1 strong accent per viewport (send / active nav) |
| Border budget (chat) | Prefer hairline or none on assistant blocks; composer may keep 1px |
| Type scale | Body 15–16px, leading ≥1.5 in thread; UI chrome ≤13px |
| Radius | Composer/inputs ~1–1.25rem; avoid pill clusters |
| Color | No purple-default; keep Synapse cyan/teal sparingly |
| Cards | Allowed for interactive tools; discouraged as message wrappers |
| i18n | EL strings must not clip; Comfortable density default for `el` |
| A11y | Contrast AA; focus rings remain; no color-only mode state |

---

## 9. Non-goals

- Removing any Agent mode, tool, or enterprise surface  
- Replacing NotebookLM 3-panel with single chat  
- Cloning OpenAI brand assets  
- Making Dashboard a chat-only home (Dashboard stays hub; can get quieter)  
- Forcing Compact on Greek  
- One-shot rewrite of all of `index.css`  
- Undoing Blueprint as selectable theme  

---

## 10. Completeness answer (honest)

**Primer Minimal made Synapse GitHub-clear. It is not yet ChatGPT-calm.**  
The highest-leverage path is **OPT-C0 → C1** (tokens + Agent/embedded conversation UI) under existing Minimal, with zero feature removal, then shell quieting (C3) and notebook parity (C4).

**Shipped:** OPT-C0–C1 (Agent calm), OPT-C3 (quiet shell nav), OPT-C4 (notebook chat parity).  
**Next:** OPT-C2 mode quieting, OPT-C5 Dashboard/Library soft lists, OPT-C8 screenshot rows.

---

## 11. Sign-off

| Role | Date | Notes |
|------|------|-------|
| Engineering (plan) | 2026-07-19 | Audit complete; waves OPT-C0–C8 defined. |
| Engineering (C0/C1) | 2026-07-19 | Calm CSS + Agent conversation-first under Minimal. Modes/citations/stream retained. |
| Engineering (C3/C4) | 2026-07-19 | Shell single-line nav + narrower rail; notebook-calm chat/studio. |
| | | |
