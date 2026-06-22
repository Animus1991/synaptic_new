import { config } from '../config';
import type { NerEntity } from './ner';

/**
 * Optional spaCy/Stanza (or similar) NER microservice.
 * Set NER_SERVICE_URL=http://localhost:8790 to enable.
 *
 * Expected contract:
 *   POST /entities  { text: string, max?: number, languages?: string }
 *   → { entities: { term, kind, score, span? }[] }
 */
export async function fetchDedicatedNer(text: string, max = 30): Promise<NerEntity[] | null> {
  const base = config.nerServiceUrl?.replace(/\/$/, '');
  if (!base) return null;

  try {
    const res = await fetch(`${base}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 12000), max, languages: 'ell,eng' }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { entities?: NerEntity[] };
    if (!Array.isArray(data.entities)) return null;
    return data.entities.filter((e) => typeof e.term === 'string' && e.term.length >= 3);
  } catch {
    return null;
  }
}
