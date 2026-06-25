export type ReaderTtsOptions = {
  lang: 'en' | 'el';
  rate?: number;
  onParagraphStart?: (index: number) => void;
  onEnd?: () => void;
};

export type ReaderTtsController = {
  stop: () => void;
  activeIndex: number;
};

/**
 * Sequential paragraph TTS with scroll-follow callbacks (Reader correlation bus).
 */
export function speakParagraphs(
  paragraphs: string[],
  opts: ReaderTtsOptions,
): ReaderTtsController | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const filtered = paragraphs.map((p) => p.trim()).filter(Boolean);
  if (filtered.length === 0) return null;

  let cancelled = false;
  let activeIndex = 0;
  const utterLang = opts.lang === 'el' ? 'el-GR' : 'en-US';

  const stop = () => {
    cancelled = true;
    window.speechSynthesis.cancel();
  };

  const speakAt = (i: number) => {
    if (cancelled || i >= filtered.length) {
      opts.onEnd?.();
      return;
    }
    activeIndex = i;
    opts.onParagraphStart?.(i);
    const u = new SpeechSynthesisUtterance(filtered[i]!);
    u.lang = utterLang;
    u.rate = opts.rate ?? 1;
    u.onend = () => speakAt(i + 1);
    u.onerror = () => speakAt(i + 1);
    window.speechSynthesis.speak(u);
  };

  window.speechSynthesis.cancel();
  speakAt(0);

  return {
    stop,
    get activeIndex() { return activeIndex; },
  };
}
