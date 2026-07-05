import { useState } from 'react';
import { Volume2, Square } from '@/lib/lucide-shim';
import type { Course, UserSettings } from '../types';
import { playAudioStudyGuide } from '../lib/audioStudyGuide';
import { playNeuralStudyGuide } from '../lib/audioPodcastClient';
import { cn } from '../utils/cn';

type Props = {
  course: Course;
  lang: 'en' | 'el';
  settings?: UserSettings;
  className?: string;
};

export function AudioStudyGuideButton({ course, lang, settings, className }: Props) {
  const [playing, setPlaying] = useState(false);
  const [neural, setNeural] = useState(false);
  const [sectionTitle, setSectionTitle] = useState<string | null>(null);
  const [controller, setController] = useState<{ stop: () => void } | null>(null);

  const stopPlayback = () => {
    controller?.stop();
    setPlaying(false);
    setNeural(false);
    setSectionTitle(null);
    setController(null);
  };

  const startBrowserTts = () => {
    const ctrl = playAudioStudyGuide(course, lang, (_idx, title) => {
      setSectionTitle(title);
    });
    if (!ctrl) return;
    setController(ctrl);
    setPlaying(true);
    setNeural(false);
  };

  const startNeuralPodcast = async () => {
    const token = settings?.authToken?.trim();
    if (!token || !settings) {
      startBrowserTts();
      return;
    }
    setNeural(true);
    setPlaying(true);
    const ctrl = await playNeuralStudyGuide(
      token,
      settings,
      {
        courseTitle: course.title,
        topics: (course.topics ?? []).map((t) => ({
          title: t.title,
          description: t.description,
        })),
        lang,
      },
      (_idx, title) => setSectionTitle(title),
      () => {
        stopPlayback();
        startBrowserTts();
      },
    );
    if (!ctrl) {
      setNeural(false);
      startBrowserTts();
      return;
    }
    setController(ctrl);
  };

  const toggle = () => {
    if (playing && controller) {
      stopPlayback();
      return;
    }
    void startNeuralPodcast();
  };

  const label =
    lang === 'el'
      ? playing
        ? neural
          ? 'Διακοπή podcast'
          : 'Διακοπή οδηγού'
        : 'Audio podcast μελέτης'
      : playing
        ? neural
          ? 'Stop podcast'
          : 'Stop guide'
        : 'Audio study podcast';

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
        {playing ? (
          <Square className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {label}
      </button>
      {sectionTitle && playing && (
        <span className="text-[10px] text-text-muted truncate max-w-xs">{sectionTitle}</span>
      )}
    </div>
  );
}
