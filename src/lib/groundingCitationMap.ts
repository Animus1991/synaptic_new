import type { MessageCitation } from '../types';
import type { GroundingCheck } from './grounding';

export type SourceHighlight = {
  fileId: string;
  charStart: number;
  charEnd: number;
};

export function buildCombinedCitationText(citations: MessageCitation[]): string {
  return citations
    .map((c) => [c.heading, c.snippet].filter(Boolean).join(' '))
    .join('\n\n');
}

/** Map a character offset in combined citation text to a file span. */
export function mapCombinedOffsetToCitation(
  citations: MessageCitation[],
  charStart: number,
  charEnd: number,
): SourceHighlight | undefined {
  if (citations.length === 0 || charStart < 0) return undefined;

  let cursor = 0;
  for (const c of citations) {
    const block = [c.heading, c.snippet].filter(Boolean).join(' ');
    const segment = `${block}\n\n`;
    const end = cursor + segment.length;
    if (charStart >= cursor && charStart < end) {
      const local = charStart - cursor;
      const headingLen = c.heading ? c.heading.length + 1 : 0;
      const snippetOffset = Math.max(0, local - headingLen);
      return {
        fileId: c.fileId,
        charStart: Math.min(c.charEnd, c.charStart + snippetOffset),
        charEnd: Math.min(c.charEnd, c.charStart + snippetOffset + Math.max(1, charEnd - charStart)),
      };
    }
    cursor = end;
  }

  const first = citations[0]!;
  return { fileId: first.fileId, charStart: first.charStart, charEnd: first.charEnd };
}

/** Resolve click-to-source highlight for a grounding check. */
export function resolveSourceHighlight(
  citations: MessageCitation[],
  check: GroundingCheck,
): SourceHighlight | undefined {
  const groundedSpan = check.spans.find((s) => s.charStart >= 0);
  if (groundedSpan) {
    return mapCombinedOffsetToCitation(citations, groundedSpan.charStart, groundedSpan.charEnd);
  }

  const probe = check.claim.trim().slice(0, 48).toLowerCase();
  if (probe.length >= 8) {
    for (const c of citations) {
      const idx = c.snippet.toLowerCase().indexOf(probe);
      if (idx >= 0) {
        return {
          fileId: c.fileId,
          charStart: c.charStart + idx,
          charEnd: Math.min(c.charEnd, c.charStart + idx + probe.length + 20),
        };
      }
    }
  }

  const first = citations[0];
  if (!first) return undefined;
  return { fileId: first.fileId, charStart: first.charStart, charEnd: first.charEnd };
}
