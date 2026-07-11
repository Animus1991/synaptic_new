import { useState } from 'react';
import { Volume2, Square } from '@/lib/lucide-shim';
import type { Course, UserSettings } from '../types';
import { playAudioStudyGuide } from '../lib/audioStudyGuide';
import { playNeuralStudyGuide, podcastSpeakerLabel, type PodcastSpeaker } from '../lib/audioPodcastClient';
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
  const [activeSpeaker, setActiveSpeaker] = useState<PodcastSpeaker | null>(null);
  const [controller, setController] = useState<{ stop: () => void } | null>(null);

  const stopPlayback = () => {
    controller?.stop();
    setPlaying(false);
    setNeural(false);
    setSectionTitle(null);
    setActiveSpeaker(null);
    setController(null);
  };

  const startBrowserTts = () => {
    const ctrl = playAudioStudyGuide(course, lang, (_idx, title) => {
      setSectionTitle(title);
      setActiveSpeaker(null);
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
      (event) => {
        setSectionTitle(event.sectionTitle);
        setActiveSpeaker(event.speaker);
      },
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
        : 'Podcast μελέτης (2 φωνές)'
      : playing
        ? neural
          ? 'Stop podcast'
          : 'Stop guide'
        : 'Study podcast (2 voices)';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <button
        type="button"
        onClick={toggle}
        data-testid="audio-study-guide-btn"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors',
          playing
            ? 'border-brand-500/50 bg-brand-500/10 text-brand-600'
            : 'border-border-subtle hover:bg-surface-hover text-text-secondary',
        )}
      >
        {playing ? (
          <Square className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {label}
      </button>
      {playing && (sectionTitle || activeSpeaker) && (
        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
          {neural && activeSpeaker && (
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-md',
                activeSpeaker === 'host'
                  ? 'bg-brand-500/15 text-brand-600'
                  : 'bg-accent-emerald/15 text-accent-emerald',
              )}
              data-testid="podcast-speaker-badge"
            >
              {podcastSpeakerLabel(activeSpeaker, lang)}
            </span>
          )}
          {sectionTitle && (
            <span className="text-[10px] text-text-muted truncate">{sectionTitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
