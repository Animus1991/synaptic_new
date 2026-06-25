---
name: Bilingual (EL/EN) regex boundaries
description: Why ASCII \b breaks Greek term matching and the Unicode-aware pattern to use instead
---

Rule: In this Greek/English codebase, never use ASCII `\b` word boundaries around
non-ASCII (Greek) terms. JavaScript `\b` is defined only over `[A-Za-z0-9_]`, so a
boundary never fires between a space and a Greek letter — patterns like
`/\bόμως\b/i` effectively never match Greek text. Use Unicode-aware lookarounds and
the `u` flag:

```
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
new RegExp(`${B}(however|όμως|εκτός|...)${E}`, 'iu');
```

This keeps substring safety (e.g. won't match "not" inside "notebook") for BOTH
alphabets while actually matching Greek cues.

**Why:** A debate counter-argument detector silently failed on Greek notes because
its cue regexes wrapped Greek terms in `\b`, breaking EL/EN parity (the product
requires bilingual feature equivalence).

**How to apply:** Any time you write a keyword/cue regex that must match Greek as
well as English (hedges, negation, exceptions, evidence markers, etc.), reach for
the `\p{L}\p{N}` lookaround helpers + `/u`, not `\b`. Other older libs in this repo
may still use `\b` with Greek terms — suspect this first when an EL-only matching
bug appears.
