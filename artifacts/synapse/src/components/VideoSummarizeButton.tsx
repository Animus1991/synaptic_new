import { useState, useRef } from 'react';
import { Play, Loader2, List, ChevronDown, ChevronUp } from '@/lib/lucide-shim';
import type { UploadedFile, UserSettings } from '../types';
import { cn } from '../utils/cn';
import {
  fileToBase64,
  enqueueTranscribeJob,
  waitForTranscribeJob,
  type VideoChapter,
} from '../lib/transcribeClient';
import { formatChapterTimestamp } from '../lib/videoChapters';
import { summarizeTranscript, isMediaFile } from '../lib/videoSummarize';

type Props = {
  file: UploadedFile;
  settings?: UserSettings;
  lang: 'en' | 'el';
  className?: string;
};

export function VideoSummarizeButton({ file, settings, lang, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<'summarize' | 'chapters' | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingActionRef = useRef<'summarize' | 'chapters'>('summarize');

  if (!isMediaFile(file) && file.type !== 'video' && file.type !== 'audio' && file.type !== 'youtube') {
    return null;
  }

  const token = settings?.authToken?.trim();
  const canTranscribe = Boolean(token);

  const applyTranscribeJob = async (
    job: Awaited<ReturnType<typeof waitForTranscribeJob>>,
    action: 'summarize' | 'chapters',
  ) => {
    if (job.status === 'failed' || !job.text?.trim()) {
      throw new Error(job.error ?? 'Transcription failed');
    }
    if (job.chapters?.length) {
      setChapters(job.chapters);
      setChaptersOpen(true);
    }
    if (action === 'summarize') {
      const text = await summarizeTranscript(job.text, settings, lang, file.name);
      setSummary(text);
    }
  };

  const runFromBlob = async (blob: Blob, filename: string, action: 'summarize' | 'chapters') => {
    if (!token || !settings) {
      setError(lang === 'el' ? 'Απαιτείται σύνδεση στο proxy.' : 'Proxy sign-in required.');
      return;
    }
    setBusy(true);
    setBusyAction(action);
    setError(null);
    if (action === 'summarize') setSummary(null);
    try {
      const mediaFile = new File([blob], filename);
      const audioBase64 = await fileToBase64(mediaFile);
      const { jobId } = await enqueueTranscribeJob(token, settings, audioBase64, { filename });
      const job = await waitForTranscribeJob(token, settings, jobId);
      await applyTranscribeJob(job, action);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  };

  const onPickFile = async (picked: File) => {
    await runFromBlob(picked, picked.name, pendingActionRef.current);
  };

  const transcribeAndRun = async (action: 'summarize' | 'chapters') => {
    if (file.extractedText?.trim() && action === 'summarize') {
      setBusy(true);
      setBusyAction('summarize');
      setError(null);
      try {
        const text = await summarizeTranscript(file.extractedText, settings, lang, file.name);
        setSummary(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setBusy(false);
        setBusyAction(null);
      }
      return;
    }
    pendingActionRef.current = action;
    inputRef.current?.click();
  };

  const summarizeLabel = lang === 'el' ? 'Σύνοψη βίντεο/ήχου' : 'Summarize media';
  const chaptersLabel = lang === 'el' ? 'Κεφάλαια' : 'Chapters';
  const signInHint = lang === 'el' ? 'Σύνδεση απαιτείται για Whisper' : 'Sign in for Whisper jobs';

  return (
    <div className={cn('flex flex-col gap-2 min-w-[10rem]', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.m4a,.wav,.mp4,.webm"
        className="hidden"
        data-testid={`video-summarize-input-${file.id}`}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) void onPickFile(picked);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          data-testid={`video-summarize-btn-${file.id}`}
          disabled={busy}
          aria-busy={busy && busyAction === 'summarize' ? true : undefined}
          onClick={() => void transcribeAndRun('summarize')}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 disabled:opacity-60"
          title={canTranscribe ? summarizeLabel : signInHint}
        >
          {busy && busyAction === 'summarize' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {busy && busyAction === 'summarize'
            ? lang === 'el'
              ? 'Σύνοψη…'
              : 'Summarizing…'
            : summarizeLabel}
        </button>
        <button
          type="button"
          data-testid={`video-chapters-btn-${file.id}`}
          disabled={busy}
          aria-busy={busy && busyAction === 'chapters' ? true : undefined}
          onClick={() => {
            if (chapters.length > 0) {
              setChaptersOpen((open) => !open);
              return;
            }
            void transcribeAndRun('chapters');
          }}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border border-accent-violet/30 text-accent-violet hover:bg-accent-violet/10 disabled:opacity-60"
          title={canTranscribe ? chaptersLabel : signInHint}
        >
          {busy && busyAction === 'chapters' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <List className="w-3 h-3" />
          )}
          {busy && busyAction === 'chapters'
            ? lang === 'el'
              ? 'Κεφάλαια…'
              : 'Chapters…'
            : chaptersLabel}
          {chapters.length > 0 &&
            (chaptersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </button>
      </div>
      {error && <p className="text-[10px] text-accent-rose">{error}</p>}
      {chaptersOpen && chapters.length > 0 && (
        <div
          className="rounded-lg border border-border-subtle bg-surface-primary/60 overflow-hidden"
          data-testid={`video-chapters-panel-${file.id}`}
        >
          <ul className="max-h-36 overflow-y-auto divide-y divide-border-subtle/60">
            {chapters.map((chapter) => (
              <li key={chapter.index}>
                <button
                  type="button"
                  data-testid={`video-chapter-${file.id}-${chapter.index}`}
                  onClick={() => setActiveChapter(chapter.index)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 text-[10px] hover:bg-surface-secondary/50 transition-colors',
                    activeChapter === chapter.index && 'bg-accent-violet/10',
                  )}
                >
                  <span className="font-mono text-accent-violet mr-1.5">
                    {formatChapterTimestamp(chapter.startSec)}
                  </span>
                  <span className="text-text-primary">{chapter.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {activeChapter !== null && chapters[activeChapter] && (
            <p className="text-[10px] text-text-secondary p-2 border-t border-border-subtle/60 whitespace-pre-wrap">
              {chapters[activeChapter].preview}
            </p>
          )}
        </div>
      )}
      {summary && (
        <pre className="text-[10px] text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto p-2 rounded-lg bg-surface-primary/60 border border-border-subtle">
          {summary}
        </pre>
      )}
    </div>
  );
}
