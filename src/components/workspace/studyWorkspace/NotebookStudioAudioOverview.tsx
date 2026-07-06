import { useCallback, useEffect, useRef } from 'react';
import { Square, Volume2 } from '@/lib/lucide-shim';
import type { Course, UserSettings } from '../../../types';
import { playAudioStudyGuide } from '../../../lib/audioStudyGuide';
import { playNeuralStudyGuide } from '../../../lib/audioPodcastClient';
import { cn } from '../../../utils/cn';

export type AudioOverviewGenState = 'idle' | 'running' | 'playing' | 'done' | 'error';

type Props = {
  course: Course;
  lang: 'en' | 'el';
  userSettings?: UserSettings;
  genState: AudioOverviewGenState;
  onGenStateChange: (state: AudioOverviewGenState) => void;
  className?: string;
};

/** Synapse-native audio overview quick action for Studio (STU-03 stretch). */
export function NotebookStudioAudioOverview({
  course,
  lang,
  userSettings,
  genState,
  onGenStateChange,
  className,
}: Props) {
  const controllerRef = useRef<{ stop: () => void } | null>(null);

  const stopPlayback = useCallback(() => {
    controllerRef.current?.stop();
    controllerRef.current = null;
    onGenStateChange('idle');
  }, [onGenStateChange]);

  useEffect(() => () => {
    controllerRef.current?.stop();
  }, []);

  const startBrowserTts = useCallback(() => {
    const ctrl = playAudioStudyGuide(course, lang, () => {
      onGenStateChange('playing');
    });
    if (!ctrl) {
      onGenStateChange('error');
      return;
    }
    controllerRef.current = ctrl;
    onGenStateChange('playing');
  }, [course, lang, onGenStateChange]);

  const startPlayback = useCallback(async () => {
    if (genState === 'playing' || genState === 'running') {
      stopPlayback();
      return;
    }
    onGenStateChange('running');
    const token = userSettings?.authToken?.trim();
    if (token && userSettings) {
      const ctrl = await playNeuralStudyGuide(
        token,
        userSettings,
        {
          courseTitle: course.title,
          topics: (course.topics ?? []).map((t) => ({
            title: t.title,
            description: t.description,
          })),
          lang,
        },
        () => onGenStateChange('playing'),
        () => startBrowserTts(),
      );
      if (ctrl) {
        controllerRef.current = ctrl;
        onGenStateChange('playing');
        return;
      }
    }
    startBrowserTts();
  }, [genState, stopPlayback, onGenStateChange, userSettings, course, lang, startBrowserTts]);

  const label =
    lang === 'el'
      ? genState === 'running'
        ? 'Προετοιμασία…'
        : genState === 'playing'
          ? 'Διακοπή podcast'
          : 'Audio overview'
      : genState === 'running'
        ? 'Preparing…'
        : genState === 'playing'
          ? 'Stop podcast'
          : 'Audio overview';

  return (
    <button
      type="button"
      data-testid="studio-action-audio-overview"
      data-generation-state={genState}
      disabled={genState === 'running'}
      onClick={() => void startPlayback()}
      className={cn(
        'flex items-center gap-1 rounded-full border border-border-subtle bg-surface-secondary/60 px-2.5 py-1 type-micro font-medium transition-colors disabled:opacity-60',
        genState === 'playing'
          ? 'border-accent/50 text-accent'
          : 'text-text-secondary hover:border-brand-200 hover:text-brand-800',
        className,
      )}
    >
      {genState === 'playing' ? (
        <Square className="h-3 w-3" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}
