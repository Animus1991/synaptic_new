import { useState } from 'react';
import { Volume2, Square } from '@/lib/lucide-shim';
import type { Course } from '../types';
import { playAudioStudyGuide } from '../lib/audioStudyGuide';
import { cn } from '../utils/cn';

type Props = {
  course: Course;
  lang: 'en' | 'el';
  className?: string;
};

export function AudioStudyGuideButton({ course, lang, className }: Props) {
  const [playing, setPlaying] = useState(false);
  const [sectionTitle, setSectionTitle] = useState<string | null>(null);
  const [controller, setController] = useState<{ stop: () => void } | null>(null);

  const toggle = () => {
    if (playing && controller) {
      controller.stop();
      setPlaying(false);
      setSectionTitle(null);
      setController(null);
      return;
    }
    const ctrl = playAudioStudyGuide(course, lang, (_idx, title) => {
      setSectionTitle(title);
    });
    if (!ctrl) return;
    setController(ctrl);
    setPlaying(true);
  };

  const label =
    lang === 'el'
      ? playing ? 'Διακοπή οδηγού' : 'Audio οδηγός μελέτης'
      : playing ? 'Stop guide' : 'Audio study guide';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        type="button"
        onClick={toggle}
        data-testid="audio-study-guide-btn"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors',
          playing
            ? 'border-accent/50 bg-accent/10 text-accent'
            : 'border-border hover:bg-surface-hover text-text-secondary',
        )}
      >
        {playing ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        {label}
      </button>
      {sectionTitle && playing && (
        <span className="text-[10px] text-text-muted truncate max-w-xs">{sectionTitle}</span>
      )}
    </div>
  );
}
