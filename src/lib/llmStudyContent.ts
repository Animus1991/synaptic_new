import type { UserSettings } from '../types';
import type { Lang } from './i18n';
import type { QuizDef } from './lessonTypes';
import { chatCompletion, isLlmAvailable } from './llmClient';

export type LlmFlashcard = { front: string; back: string };

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? trimmed).trim();
  const start = body.search(/[\[{]/);
  if (start < 0) throw new Error('no json');
  return JSON.parse(body.slice(start));
}

export function parseLlmQuizPayload(raw: string): QuizDef[] {
  const parsed = extractJson(raw);
  const list = Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(list)) return [];
  const out: QuizDef[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const question = typeof rec.question === 'string' ? rec.question.trim() : '';
    if (question.length < 8) continue;
    const options = Array.isArray(rec.options) ? rec.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).map((o) => o.trim()) : [];
    const correctIndex = typeof rec.correctIndex === 'number' ? rec.correctIndex : Number(rec.correctIndex);
    if (options.length >= 3 && Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length) {
      out.push({ kind: 'mc', question, options: options.slice(0, 6), correctIndex });
      continue;
    }
    const accepted = Array.isArray(rec.acceptedAnswers)
      ? rec.acceptedAnswers.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).map((a) => a.trim())
      : [];
    if (accepted.length > 0) {
      out.push({
        kind: 'short-answer',
        question,
        acceptedAnswers: accepted.slice(0, 6),
        hint: typeof rec.hint === 'string' ? rec.hint : undefined,
      });
    }
  }
  return out.slice(0, 6);
}

export function parseLlmCardPayload(raw: string): LlmFlashcard[] {
  const parsed = extractJson(raw);
  const list = Array.isArray(parsed) ? parsed : (parsed as { cards?: unknown }).cards;
  if (!Array.isArray(list)) return [];
  const out: LlmFlashcard[] = [];
  const seen = new Set<string>();
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const front = typeof rec.front === 'string' ? rec.front.trim() : '';
    const back = typeof rec.back === 'string' ? rec.back.trim() : '';
    if (front.length < 2 || back.length < 8) continue;
    const key = front.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ front, back: back.slice(0, 400) });
  }
  return out.slice(0, 12);
}

export async function generateStudyQuizWithLlm(opts: {
  notes: string;
  concept: string;
  lang: Lang;
  settings?: UserSettings;
}): Promise<QuizDef[] | null> {
  if (!isLlmAvailable(opts.settings)) return null;
  const notes = opts.notes.trim().slice(0, 6000);
  if (notes.length < 40) return null;
  const langName = opts.lang === 'el' ? 'Greek' : 'English';
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content: `Write ${langName} quiz questions grounded only in the notes. Return JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0}]}. No markdown.`,
        },
        {
          role: 'user',
          content: `Concept: ${opts.concept}\nNotes:\n${notes}`,
        },
      ],
      opts.settings,
      { temperature: 0.3, maxTokens: 700 },
    );
    const parsed = parseLlmQuizPayload(raw);
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function generateStudyCardsWithLlm(opts: {
  notes: string;
  concept: string;
  lang: Lang;
  settings?: UserSettings;
}): Promise<LlmFlashcard[] | null> {
  if (!isLlmAvailable(opts.settings)) return null;
  const notes = opts.notes.trim().slice(0, 6000);
  if (notes.length < 40) return null;
  const langName = opts.lang === 'el' ? 'Greek' : 'English';
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content: `Write ${langName} flashcards grounded only in the notes. Return JSON: {"cards":[{"front":"...","back":"..."}]}. No markdown.`,
        },
        {
          role: 'user',
          content: `Concept: ${opts.concept}\nNotes:\n${notes}`,
        },
      ],
      opts.settings,
      { temperature: 0.3, maxTokens: 700 },
    );
    const parsed = parseLlmCardPayload(raw);
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function generateAnalyticsInsightsWithLlm(opts: {
  observations: string[];
  lang: Lang;
  settings?: UserSettings;
}): Promise<string[] | null> {
  if (!isLlmAvailable(opts.settings)) return null;
  if (opts.observations.length === 0) return null;
  const langName = opts.lang === 'el' ? 'Greek' : 'English';
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content: `Rewrite these study observations as 3-5 short ${langName} insights. Stay faithful to the facts. Return JSON: {"observations":["..."]}.`,
        },
        { role: 'user', content: opts.observations.join('\n') },
      ],
      opts.settings,
      { temperature: 0.2, maxTokens: 400 },
    );
    const parsed = extractJson(raw) as { observations?: unknown };
    const list = Array.isArray(parsed.observations) ? parsed.observations : Array.isArray(parsed) ? parsed : [];
    const texts = list.filter((x): x is string => typeof x === 'string' && x.trim().length > 8).map((x) => x.trim());
    return texts.length > 0 ? texts.slice(0, 6) : null;
  } catch {
    return null;
  }
}
