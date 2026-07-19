/**
 * Weak ETag helpers for library/session sync (W1).
 * Uses ISO updatedAt so clients can round-trip If-Match without hashing payloads.
 */

export function etagFromUpdatedAt(updatedAt: string): string {
  const safe = updatedAt.trim() || new Date(0).toISOString();
  return `W/"${safe}"`;
}

export function parseIfMatch(header: string | undefined): string | null {
  if (!header || header.trim() === '' || header.trim() === '*') return null;
  // Support single weak/strong tag; take first if comma-separated.
  const first = header.split(',')[0]?.trim() ?? '';
  const m = /^W\/"(.+)"$|^"(.+)"$/i.exec(first);
  return m?.[1] ?? m?.[2] ?? null;
}

export function ifMatchSatisfied(ifMatchHeader: string | undefined, currentUpdatedAt: string): boolean {
  if (!ifMatchHeader || ifMatchHeader.trim() === '') return true; // backward compatible
  if (ifMatchHeader.trim() === '*') return Boolean(currentUpdatedAt);
  const expected = parseIfMatch(ifMatchHeader);
  if (!expected) return false;
  return expected === currentUpdatedAt;
}
