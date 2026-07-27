/**
 * A6 — Server-side LLM moderation (input + output).
 *
 * Modes (MODERATION_MODE):
 *   regex (default) — local pattern MVP
 *   openai — vendor Moderation API + regex prefilter
 *   off — skip (tests / emergency only)
 *
 * Fail policy (MODERATION_FAIL_CLOSED=true|false, default false = fail-open on vendor errors).
 * Client-side transformers.js is NOT used as a control plane.
 */

import { config } from '../config';

export interface ModerationHit {
  code: string;
  reason: string;
  source?: 'regex' | 'vendor' | 'policy';
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

function moderationMode(): 'regex' | 'openai' | 'off' {
  const raw = (process.env.MODERATION_MODE ?? 'regex').trim().toLowerCase();
  if (raw === 'openai' || raw === 'off' || raw === 'regex') return raw;
  return 'regex';
}

function failClosed(): boolean {
  return process.env.MODERATION_FAIL_CLOSED === 'true';
}

function audit(event: Record<string, unknown>): void {
  console.info('[moderation]', JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

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

export function moderateTextRegex(text: string): ModerationHit | null {
  for (const rule of BLOCKED_PATTERNS) {
    if (rule.re.test(text)) {
      return { code: rule.code, reason: rule.reason, source: 'regex' };
    }
  }
  return null;
}

async function moderateTextVendor(text: string): Promise<ModerationHit | null> {
  if (!config.upstreamApiKey) {
    if (failClosed()) {
      return { code: 'vendor_unavailable', reason: 'Moderation vendor key missing', source: 'vendor' };
    }
    audit({ action: 'vendor_skip', reason: 'missing_api_key' });
    return null;
  }
  try {
    const res = await fetch(`${config.upstreamBaseUrl}/moderations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.upstreamApiKey}`,
      },
      body: JSON.stringify({ input: text.slice(0, 32_000) }),
    });
    if (!res.ok) {
      audit({ action: 'vendor_http_error', status: res.status });
      if (failClosed()) {
        return { code: 'vendor_error', reason: `Moderation API HTTP ${res.status}`, source: 'vendor' };
      }
      return null;
    }
    const data = (await res.json()) as {
      results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
    };
    const result = data.results?.[0];
    if (result?.flagged) {
      const cats = Object.entries(result.categories ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k);
      return {
        code: 'vendor_flagged',
        reason: `Flagged by vendor moderation${cats.length ? `: ${cats.join(',')}` : ''}`,
        source: 'vendor',
      };
    }
    return null;
  } catch (err) {
    audit({ action: 'vendor_exception', error: (err as Error).message });
    if (failClosed()) {
      return { code: 'vendor_exception', reason: 'Moderation vendor unreachable', source: 'vendor' };
    }
    return null;
  }
}

export async function moderatePromptText(text: string, context: string): Promise<ModerationHit | null> {
  const mode = moderationMode();
  if (mode === 'off') {
    audit({ action: 'skipped', context, mode });
    return null;
  }
  const regexHit = moderateTextRegex(text);
  if (regexHit) {
    audit({ action: 'block', context, ...regexHit });
    return regexHit;
  }
  if (mode === 'openai') {
    const vendorHit = await moderateTextVendor(text);
    if (vendorHit) {
      audit({ action: 'block', context, ...vendorHit });
      return vendorHit;
    }
  }
  return null;
}

export function moderateChatCompletionsBody(body: unknown): ModerationHit | null {
  if (!body || typeof body !== 'object') {
    return { code: 'invalid_body', reason: 'Request body must be a JSON object', source: 'policy' };
  }
  const record = body as Record<string, unknown>;
  const messages = record.messages;
  if (!Array.isArray(messages)) {
    return { code: 'missing_messages', reason: 'messages array is required', source: 'policy' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { code: 'too_many_messages', reason: `At most ${MAX_MESSAGES} messages allowed`, source: 'policy' };
  }
  const text = textFromMessages(messages);
  if (text.length > MAX_MESSAGE_CHARS) {
    return {
      code: 'payload_too_large',
      reason: `Combined message text exceeds ${MAX_MESSAGE_CHARS} characters`,
      source: 'policy',
    };
  }
  return moderateTextRegex(text);
}

/** Async path used by proxy — regex + optional vendor. */
export async function moderateChatCompletionsBodyAsync(body: unknown): Promise<ModerationHit | null> {
  const sync = moderateChatCompletionsBody(body);
  if (sync && sync.source === 'policy') return sync;
  if (sync) {
    audit({ action: 'block', context: 'chat.input', ...sync });
    return sync;
  }
  if (moderationMode() === 'off') return null;
  const text = textFromMessages((body as { messages?: unknown }).messages);
  if (moderationMode() === 'openai') {
    return moderatePromptText(text, 'chat.input');
  }
  return null;
}

export function moderateEmbeddingsBody(body: unknown): ModerationHit | null {
  if (!body || typeof body !== 'object') {
    return { code: 'invalid_body', reason: 'Request body must be a JSON object', source: 'policy' };
  }
  const input = (body as { input?: unknown }).input;
  const text = Array.isArray(input)
    ? input.filter((x): x is string => typeof x === 'string').join('\n')
    : typeof input === 'string'
      ? input
      : '';
  if (!text) {
    return { code: 'missing_input', reason: 'input is required', source: 'policy' };
  }
  if (text.length > MAX_MESSAGE_CHARS) {
    return {
      code: 'payload_too_large',
      reason: `Embedding input exceeds ${MAX_MESSAGE_CHARS} characters`,
      source: 'policy',
    };
  }
  return null;
}

/** Moderate model output text (non-stream JSON responses). */
export async function moderateCompletionOutput(text: string): Promise<ModerationHit | null> {
  if (!text.trim()) return null;
  return moderatePromptText(text, 'chat.output');
}

export function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return '';
  const msg = (choices[0] as { message?: { content?: unknown } }).message;
  const content = msg?.content;
  return typeof content === 'string' ? content : '';
}
