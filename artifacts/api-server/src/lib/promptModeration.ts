/**
 * W0 MVP prompt moderation for Agent / LLM proxy traffic.
 * Blocks obvious injection / exfil patterns and oversized payloads.
 * Not a full safety stack — complements quotas + rate limits.
 */

export interface ModerationHit {
  code: string;
  reason: string;
}

const MAX_MESSAGE_CHARS = 100_000;
const MAX_MESSAGES = 64;

const BLOCKED_PATTERNS: { code: string; re: RegExp; reason: string }[] = [
  {
    code: 'ignore_prior',
    re: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
    reason: 'Prompt-injection pattern (ignore prior instructions)',
  },
  {
    code: 'system_override',
    re: /\b(system\s*prompt|developer\s*message)\b.{0,40}\b(override|reveal|print|dump)\b/i,
    reason: 'Attempt to override or reveal system prompt',
  },
  {
    code: 'exfil_secrets',
    re: /\b(api[_-]?key|jwt[_-]?secret|stripe[_-]?(secret|key)|password)\b.{0,30}\b(print|reveal|exfil|send|leak)\b/i,
    reason: 'Secret exfiltration pattern',
  },
  {
    code: 'jailbreak',
    re: /\b(DAN\s+mode|jailbreak|do\s+anything\s+now)\b/i,
    reason: 'Jailbreak / unrestricted-mode pattern',
  },
];

function textFromMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return '';
  const parts: string[] = [];
  for (const msg of messages.slice(0, MAX_MESSAGES)) {
    if (!msg || typeof msg !== 'object') continue;
    const content = (msg as { content?: unknown }).content;
    if (typeof content === 'string') parts.push(content);
    else if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === 'string') parts.push(part);
        else if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
          parts.push((part as { text: string }).text);
        }
      }
    }
  }
  return parts.join('\n');
}

export function moderateChatCompletionsBody(body: unknown): ModerationHit | null {
  if (!body || typeof body !== 'object') {
    return { code: 'invalid_body', reason: 'Request body must be a JSON object' };
  }
  const record = body as Record<string, unknown>;
  const messages = record.messages;
  if (!Array.isArray(messages)) {
    return { code: 'missing_messages', reason: 'messages array is required' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { code: 'too_many_messages', reason: `At most ${MAX_MESSAGES} messages allowed` };
  }
  const text = textFromMessages(messages);
  if (text.length > MAX_MESSAGE_CHARS) {
    return { code: 'payload_too_large', reason: `Combined message text exceeds ${MAX_MESSAGE_CHARS} characters` };
  }
  for (const rule of BLOCKED_PATTERNS) {
    if (rule.re.test(text)) {
      return { code: rule.code, reason: rule.reason };
    }
  }
  return null;
}

/** Embedding input size guard (string or string[]). */
export function moderateEmbeddingsBody(body: unknown): ModerationHit | null {
  if (!body || typeof body !== 'object') {
    return { code: 'invalid_body', reason: 'Request body must be a JSON object' };
  }
  const input = (body as { input?: unknown }).input;
  const text = Array.isArray(input)
    ? input.filter((x): x is string => typeof x === 'string').join('\n')
    : typeof input === 'string'
      ? input
      : '';
  if (!text) {
    return { code: 'missing_input', reason: 'input is required' };
  }
  if (text.length > MAX_MESSAGE_CHARS) {
    return { code: 'payload_too_large', reason: `Embedding input exceeds ${MAX_MESSAGE_CHARS} characters` };
  }
  return null;
}
