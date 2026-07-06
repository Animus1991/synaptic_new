import { useMemo, useRef, useState } from 'react';
import { Volume2, Loader2, ChevronDown, ChevronUp, ExternalLink, Upload, Brain } from '@/lib/lucide-shim';
import type { UploadedFile, UserSettings } from '../types';
import { cn } from '../utils/cn';
import { formatChapterTimestamp } from '../lib/videoChapters';
import { parseNotebookLmAudioFromMarkdown } from '../lib/notebooklmImport';
import { openNotebookLm } from '../lib/notebooklmBridge';

type Props = {
  courseId: string;
  courseTitle: string;
  files: UploadedFile[];
  lang: 'en' | 'el';
  onImportTranscript: (raw: string, courseId: string) => boolean;
  onUploadAudio?: (file: File, courseId: string) => Promise<boolean>;
  onAddAudioToFsrs?: (fileId: string, courseId: string) => void;
  userSettings?: UserSettings;
  className?: string;
};

export function CourseMediaPanel({
  courseId,
  courseTitle,
  files,
  lang,
  onImportTranscript,
  onUploadAudio,
  onAddAudioToFsrs,
  userSettings,
  className,
}: Props) {
  const el = lang === 'el';
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const audioFiles = useMemo(
    () => files.filter((f) =>
      f.ingestMethod === 'notebooklm-audio-transcript'
      || (f.ingestMethod === 'transcript' && f.courseId === courseId),
    ),
    [files, courseId],
  );

  const canUploadAudio = Boolean(onUploadAudio && userSettings?.authToken?.trim());

  const activeFile = audioFiles.find((f) => f.id === activeFileId) ?? audioFiles[0] ?? null;
  const segments = useMemo(
    () => (activeFile?.extractedText ? parseNotebookLmAudioFromMarkdown(activeFile.extractedText) : []),
    [activeFile?.extractedText],
  );

  const handleImport = () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const ok = onImportTranscript(text, courseId);
      if (ok) setText('');
    } finally {
      setBusy(false);
    }
  };

  const handleAudioFile = async (file: File | undefined) => {
    if (!file || !onUploadAudio) return;
    setUploadBusy(true);
    try {
      await onUploadAudio(file, courseId);
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div
      className={cn('ws-bento p-4', className)}
      data-testid="course-media-panel"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left mb-2"
      >
        <Volume2 className="w-4 h-4 text-accent-violet shrink-0" />
        <span className="text-sm font-semibold text-text-primary flex-1">
          {el ? 'Media — NotebookLM audio' : 'Media — NotebookLM audio'}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {open && (
        <div className="space-y-3">
          <p className="text-[10px] text-text-secondary">
            {el
              ? 'Επικόλλησε το transcript από το Studio Audio Overview του NotebookLM — εμφανίζεται εδώ με κεφάλαια.'
              : 'Paste the transcript from NotebookLM Studio Audio Overview — appears here with chapter navigation.'}
          </p>
          <button
            type="button"
            onClick={() => void openNotebookLm({ sourceTitle: courseTitle, lang })}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-700 dark:text-brand-300 hover:underline"
            data-testid="course-media-open-nlm"
          >
            <ExternalLink className="w-3 h-3" />
            {el ? 'Άνοιγμα NotebookLM' : 'Open NotebookLM'}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={
              el
                ? '[0:00] Εισαγωγή\nΚείμενο…\n\n[2:15] Θέμα 1\n…'
                : '[0:00] Introduction\nText…\n\n[2:15] Topic one\n…'
            }
            className="w-full rounded-lg border border-border-subtle bg-surface-input px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted resize-y min-h-[72px]"
            data-testid="course-media-import-text"
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={handleImport}
            className="px-3 py-1.5 rounded-lg bg-accent-violet/90 text-white text-xs font-medium disabled:opacity-50"
            data-testid="course-media-import-submit"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : el ? 'Εισαγωγή transcript' : 'Import transcript'}
          </button>

          {onUploadAudio && (
            <div className="pt-2 border-t border-border-subtle/60 space-y-2">
              <p className="text-[10px] text-text-secondary">
                {el
                  ? 'Ή ανέβασε αρχείο ήχου — Whisper transcript στο media panel (απαιτείται σύνδεση).'
                  : 'Or upload an audio file — Whisper transcript lands in this panel (sign-in required).'}
              </p>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
                className="hidden"
                data-testid="course-media-audio-input"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) void handleAudioFile(picked);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={uploadBusy || !canUploadAudio}
                onClick={() => audioInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-violet/30 text-xs font-medium text-accent-violet hover:bg-accent-violet/10 disabled:opacity-50"
                data-testid="course-media-upload-audio"
                title={canUploadAudio ? undefined : el ? 'Σύνδεση απαιτείται' : 'Sign-in required'}
              >
                {uploadBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploadBusy
                  ? el ? 'Μεταγραφή…' : 'Transcribing…'
                  : el ? 'Ανέβασμα ήχου' : 'Upload audio'}
              </button>
            </div>
          )}

          {audioFiles.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border-subtle/60">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {el ? 'Transcripts' : 'Transcripts'} ({audioFiles.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {audioFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => {
                      setActiveFileId(file.id);
                      setActiveSegment(null);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-lg text-[10px] border transition-colors',
                      activeFile?.id === file.id
                        ? 'border-accent-violet/40 bg-accent-violet/10 text-text-primary'
                        : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
                    )}
                    data-testid={`course-media-file-${file.id}`}
                  >
                    {file.name.replace(/\.md$/i, '')}
                  </button>
                ))}
              </div>
              {segments.length > 0 && (
                <div
                  className="rounded-lg border border-border-subtle bg-surface-primary/60 overflow-hidden"
                  data-testid="course-media-chapters"
                >
                  {onAddAudioToFsrs && activeFile?.id && (
                    <div className="px-2 py-2 border-b border-border-subtle/60">
                      <button
                        type="button"
                        onClick={() => onAddAudioToFsrs(activeFile.id!, courseId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-emerald/90 text-white text-xs font-medium"
                        data-testid="course-media-add-audio-fsrs"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        {el
                          ? `FSRS deck (${segments.length} κεφάλαια)`
                          : `FSRS deck (${segments.length} chapters)`}
                      </button>
                    </div>
                  )}
                  <ul className="max-h-40 overflow-y-auto divide-y divide-border-subtle/60">
                    {segments.map((segment) => (
                      <li key={segment.index}>
                        <button
                          type="button"
                          onClick={() => setActiveSegment(segment.index)}
                          className={cn(
                            'w-full text-left px-2 py-1.5 text-[10px] hover:bg-surface-secondary/50 transition-colors',
                            activeSegment === segment.index && 'bg-accent-violet/10',
                          )}
                          data-testid={`course-media-segment-${segment.index}`}
                        >
                          {segment.startSec != null && (
                            <span className="font-mono text-accent-violet mr-1.5">
                              {formatChapterTimestamp(segment.startSec)}
                            </span>
                          )}
                          <span className="text-text-primary">{segment.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {activeSegment != null && segments[activeSegment] && (
                    <p className="text-[10px] text-text-secondary p-2 border-t border-border-subtle/60 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {segments[activeSegment].text}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
