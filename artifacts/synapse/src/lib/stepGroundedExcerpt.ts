import { detectSections } from './contentAnalysis';
import { conceptMatchesStepTitle } from './conceptLensRibbon';
import { conceptRelevanceScore, relevantExcerpt } from './noteContentExtractors';

/** Query variants for BM25 / overlap (e.g. «Supply & Demand» ↔ «Supply and Demand»). */
function excerptQueryVariants(primary: string, fallback: string): string[] {
  const out: string[] = [];
  const add = (q: string) => {
    const t = q.trim();
    if (!t || out.includes(t)) return;
    out.push(t);
    const expanded = t.replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();
    if (expanded && !out.includes(expanded)) out.push(expanded);
  };
  add(primary);
  if (fallback.trim() && fallback.trim() !== primary.trim()) add(fallback);
  return out;
}

function bestSectionExcerpt(sourceFullText: string, focus: string, maxChars: number): string {
  const sections = detectSections(sourceFullText);
  if (sections.length === 0) return '';

  let best: { body: string; score: number } | null = null;
  for (const s of sections) {
    const body = (s.heading ? `${s.heading}\n\n` : '') + s.text.trim();
    if (!body) continue;
    const headingScore = s.heading && conceptMatchesStepTitle(focus, s.heading) ? 0.35 : 0;
    const score = conceptRelevanceScore(body, focus) + headingScore;
    if (!best || score > best.score) best = { body, score };
  }
  if (!best || best.score < 0.12) return '';
  return best.body.length > maxChars ? `${best.body.slice(0, maxChars)}…` : best.body;
}

/**
 * Step-aware note excerpt for lesson pane + reader focus.
 * Prefers the active workspace step title, then course concept, then heading-aligned section.
 */
export function resolveWorkspaceStepExcerpt(
  sourceFullText: string,
  stepTitle: string | undefined,
  courseConcept: string,
  maxChars = 12000,
): string {
  const full = sourceFullText.trim();
  if (!full) return '';

  const focus = stepTitle?.trim() || courseConcept.trim();

  if (focus) {
    for (const s of detectSections(full)) {
      if (s.heading && conceptMatchesStepTitle(focus, s.heading) && s.text.trim()) {
        const body = `${s.heading}\n\n${s.text.trim()}`;
        return body.length > maxChars ? `${body.slice(0, maxChars)}…` : body;
      }
    }
  }

  for (const query of excerptQueryVariants(focus, courseConcept)) {
    const excerpt = relevantExcerpt(full, query, maxChars).trim();
    if (excerpt) return excerpt;
  }

  const section = bestSectionExcerpt(full, focus, maxChars);
  if (section) return section;

  return full.slice(0, maxChars);
}
