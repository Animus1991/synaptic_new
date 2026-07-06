import { useMemo, useState } from 'react';
import { Volume2, Loader2, ChevronDown, ChevronUp, ExternalLink } from '@/lib/lucide-shim';
import type { UploadedFile } from '../types';
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
  className?: string;
};

export function CourseMediaPanel({
  courseId,
  courseTitle,
  files,
  lang,
  onImportTranscript,
  className,
}: Props) {
  const el = lang === 'el';
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const audioFiles = useMemo(
    () => files.filter((f) => f.ingestMethod === 'notebooklm-audio-transcript'),
    [files],
  );

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
