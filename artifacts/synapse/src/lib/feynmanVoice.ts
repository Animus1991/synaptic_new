/** Browser speech-to-text for Feynman draft (harmonized with readerTts). */
type VoiceRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { resultIndex: number; results: { isFinal: boolean; [i: number]: { transcript: string } }[] }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function startFeynmanVoiceInput(
  lang: 'en' | 'el',
  onText: (chunk: string) => void,
  onEnd?: () => void,
): (() => void) | null {
  const win = window as unknown as {
    SpeechRecognition?: new () => VoiceRecognition;
    webkitSpeechRecognition?: new () => VoiceRecognition;
  };
  const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = lang === 'el' ? 'el-GR' : 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  let final = '';

  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i]?.[0]?.transcript ?? '';
      if (ev.results[i]?.isFinal) final += `${t} `;
      else interim += t;
    }
    onText((final + interim).trim());
  };
  rec.onend = () => onEnd?.();
  rec.onerror = () => onEnd?.();
  rec.start();

  return () => {
    try { rec.stop(); } catch { /* ignore */ }
  };
}
