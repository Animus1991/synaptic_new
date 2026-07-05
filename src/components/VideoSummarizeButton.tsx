import { useState, useRef } from 'react';
import { Play, Loader2 } from '@/lib/lucide-shim';
import type { UploadedFile, UserSettings } from '../types';
import { cn } from '../utils/cn';
import { fileToBase64, enqueueTranscribeJob, waitForTranscribeJob } from '../lib/transcribeClient';
import { summarizeTranscript, isMediaFile } from '../lib/videoSummarize';

type Props = {
  file: UploadedFile;
  settings?: UserSettings;
  lang: 'en' | 'el';
  className?: string;
};

export function VideoSummarizeButton({ file, settings, lang, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isMediaFile(file) && file.type !== 'video' && file.type !== 'audio' && file.type !== 'youtube') {
    return null;
  }

  const token = settings?.authToken?.trim();
  const canTranscribe = Boolean(token);

  const runFromBlob = async (blob: Blob, filename: string) => {
    if (!token || !settings) {
      setError(lang === 'el' ? 'Απαιτείται σύνδεση στο proxy.' : 'Proxy sign-in required.');
      return;
    }
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const mediaFile = new File([blob], filename);
      const audioBase64 = await fileToBase64(mediaFile);
      const { jobId } = await enqueueTranscribeJob(token, settings, audioBase64, { filename });
      const job = await waitForTranscribeJob(token, settings, jobId);
      if (job.status === 'failed' || !job.text?.trim()) {
        throw new Error(job.error ?? 'Transcription failed');
      }
      const text = await summarizeTranscript(job.text, settings, lang, file.name);
      setSummary(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (picked: File) => {
    await runFromBlob(picked, picked.name);
  };

  const onSummarizeExisting = async () => {
    if (file.extractedText?.trim()) {
      setBusy(true);
      setError(null);
      try {
        const text = await summarizeTranscript(file.extractedText, settings, lang, file.name);
        setSummary(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setBusy(false);
      }
      return;
    }
    inputRef.current?.click();
  };

  const label = lang === 'el' ? 'Σύνοψη βίντεο/ήχου' : 'Summarize media';

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
      <button
        type="button"
        data-testid={`video-summarize-btn-${file.id}`}
        disabled={busy}
        onClick={() => void onSummarizeExisting()}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 disabled:opacity-60"
        title={canTranscribe ? label : (lang === 'el' ? 'Σύνδεση απαιτείται για Whisper' : 'Sign in for Whisper jobs')}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
        {busy ? (lang === 'el' ? 'Σύνοψη…' : 'Summarizing…') : label}
      </button>
      {error && <p className="text-[10px] text-accent-rose">{error}</p>}
      {summary && (
        <pre className="text-[10px] text-text-secondary whitespace-pre-wrap max-h-32 overflow-y-auto p-2 rounded-lg bg-surface-primary/60 border border-border-subtle">
          {summary}
        </pre>
      )}
    </div>
  );
}
