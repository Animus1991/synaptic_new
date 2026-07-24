import type { UserSettings } from '../types';
import { chatCompletion, isLlmAvailable } from './llmClient';

/** Summarize a lecture/video transcript into study bullets (client LLM). */
export async function summarizeTranscript(
  transcript: string,
  settings: UserSettings | undefined,
  lang: 'en' | 'el',
  title?: string,
): Promise<string> {
  const text = transcript.trim();
  if (!text) return lang === 'el' ? 'Δεν βρέθηκε κείμενο.' : 'No transcript text.';
  if (!isLlmAvailable(settings)) {
    return text.slice(0, 1200) + (text.length > 1200 ? '…' : '');
  }

  const prompt =
    lang === 'el'
      ? `Σύνοψε την παρακάτω μεταγραφή${title ? ` από «${title}»` : ''} σε δομημένο οδηγό μελέτης (επικεφαλίδες, bullets, βασικές έννοιες). Μέγιστο 400 λέξεις.\n\n${text.slice(0, 12000)}`
      : `Summarize the transcript below${title ? ` from "${title}"` : ''} as a structured study guide (headings, bullets, key concepts). Max 400 words.\n\n${text.slice(0, 12000)}`;

  const summary = await chatCompletion(
    [{ role: 'user', content: prompt }],
    settings,
    { temperature: 0.3, maxTokens: 900 },
  );
  return summary.trim() || (lang === 'el' ? 'Η σύνοψη απέτυχε.' : 'Summary failed.');
}

export function isMediaFile(file: { name?: string; type?: string }): boolean {
  const name = (file.name ?? '').toLowerCase();
  const type = (file.type ?? '').toLowerCase();
  return (
    type.startsWith('audio/') ||
    type.startsWith('video/') ||
    /\.(mp3|m4a|wav|ogg|webm|mp4|mov|mkv|avi)$/.test(name)
  );
}
