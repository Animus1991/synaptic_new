/**
 * Server-side bilingual OCR merge (mirrors client `bilingualOcrEnsemble.ts`).
 */

export type ServerOcrModelId =
  | 'tesseract-eng+ell'
  | 'tesseract-eng'
  | 'tesseract-ell'
  | 'greek-document-repair'
  | 'unicode-nfc'
  | 'latin-confusion-repair'
  | 'mixed-script-boundary';

type Candidate = { modelId: ServerOcrModelId; text: string; score: number };

const GREEK = /\p{Script=Greek}/u;
const LATIN = /[A-Za-z]/;

function scoreText(text: string): number {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 12) return trimmed.length * 0.1;
  let greek = 0;
  let latin = 0;
  for (const ch of trimmed) {
    if (GREEK.test(ch)) greek += 1;
    else if (LATIN.test(ch)) latin += 1;
  }
  let score = Math.min(trimmed.length, 4000) * 0.02 + greek * 0.04 + latin * 0.035;
  const tokens = trimmed.split(/\s+/);
  const spaced = tokens.filter((t) => t.length === 1 && (GREEK.test(t) || LATIN.test(t))).length;
  if (spaced / Math.max(tokens.length, 1) > 0.25) score -= 18;
  score += Math.min(tokens.filter((t) => t.length >= 3).length, 120) * 0.15;
  return score;
}

function applyRepairs(text: string): string {
  let s = text.normalize('NFC');
  s = s.replace(/([\p{Script=Greek}])([A-Za-z])/gu, '$1 $2').replace(/([A-Za-z])([\p{Script=Greek}])/gu, '$1 $2');
  return s.replace(/ {2,}/g, ' ').trim();
}

export function mergeServerOcrOutputs(
  outputs: Array<{ modelId: ServerOcrModelId; text: string }>,
): { text: string; modelsUsed: ServerOcrModelId[] } {
  const candidates: Candidate[] = [];
  for (const out of outputs) {
    const base = out.text.trim();
    if (!base) continue;
    const repaired = applyRepairs(base);
    for (const [modelId, text] of [
      [out.modelId, base],
      ['greek-document-repair', repaired],
      ['unicode-nfc', repaired.normalize('NFC')],
    ] as Array<[ServerOcrModelId, string]>) {
      candidates.push({ modelId, text, score: scoreText(text) });
    }
  }
  if (candidates.length === 0) return { text: '', modelsUsed: [] };
  candidates.sort((a, b) => b.score - a.score);
  return {
    text: candidates[0]!.text,
    modelsUsed: [...new Set(candidates.map((c) => c.modelId))],
  };
}
