/**
 * Agent reply TTS — thin wrapper over speechSynthesis, aligned with readerTts.
 */

export type AgentTtsHandle = { stop: () => void };

let active: AgentTtsHandle | null = null;

/** Strip markdown / UI chrome so TTS sounds natural. */
export function plainTextForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_~#>]+/g, ' ')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stopAgentTts(): void {
  active?.stop();
  active = null;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isAgentTtsSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

/**
 * Speak an agent reply. Cancels any in-flight utterance first.
 * Returns null when unsupported or text empty.
 */
export function speakAgentText(
  text: string,
  lang: 'en' | 'el',
  opts?: { rate?: number; onEnd?: () => void },
): AgentTtsHandle | null {
  if (!isAgentTtsSupported()) return null;
  const plain = plainTextForSpeech(text);
  if (!plain) return null;

  stopAgentTts();

  let cancelled = false;
  const utter = new SpeechSynthesisUtterance(plain.slice(0, 4000));
  utter.lang = lang === 'el' ? 'el-GR' : 'en-US';
  utter.rate = opts?.rate ?? 1;

  const handle: AgentTtsHandle = {
    stop: () => {
      cancelled = true;
      window.speechSynthesis.cancel();
    },
  };
  active = handle;

  utter.onend = () => {
    if (!cancelled) {
      if (active === handle) active = null;
      opts?.onEnd?.();
    }
  };
  utter.onerror = () => {
    if (active === handle) active = null;
    opts?.onEnd?.();
  };

  window.speechSynthesis.speak(utter);
  return handle;
}
