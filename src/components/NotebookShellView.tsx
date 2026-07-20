import { X, BookOpen, Sparkles, ExternalLink, Layers, Brain, BarChart3, Upload } from '@/lib/lucide-shim';
import { useMemo, useState } from 'react';
import type { Course, GlossaryEntry, LearnerModel, UploadedFile } from '../types';
import { cn } from '../utils/cn';
import { AllCapsLabel } from './ui/AllCapsLabel';
import { openNotebookLm, notebookLmSourceLabel } from '../lib/notebooklmBridge';
import { parseNotebookLmExport, parseNotebookLmAudioFromMarkdown } from '../lib/notebooklmImport';
import {
  buildNotebookLmExportPayload,
  exportToNotebookLm,
  type NotebookLmExportKind,
} from '../lib/notebooklmExport';

type Props = {
  course: Course;
  sources: UploadedFile[];
  glossaryEntries?: GlossaryEntry[];
  learnerModel?: LearnerModel;
  lang: 'en' | 'el';
  onClose: () => void;
  onOpenWorkspace: () => void;
  onOpenLibraryImport?: () => void;
  onAddQuizToFsrs?: () => void;
  onAddAudioToFsrs?: (fileId: string) => void;
  quizCardCount?: number;
};

type StudioTile = {
  id: string;
  label: string;
  hint: string;
  icon: typeof Sparkles;
  onClick: () => void;
  testId?: string;
};

/** L13-6 — NotebookLM-inspired 3-column shell (Synapse-native). */
export function NotebookShellView({
  course,
  sources,
  glossaryEntries = [],
  learnerModel,
  lang,
  onClose,
  onOpenWorkspace,
  onOpenLibraryImport,
  onAddQuizToFsrs,
  onAddAudioToFsrs,
  quizCardCount: quizCardCountProp,
}: Props) {
  const el = lang === 'el';
  const [exportBusy, setExportBusy] = useState<NotebookLmExportKind | null>(null);
  const primarySource = sources[0];
  const excerpt = primarySource?.extractedText?.trim().slice(0, 1200) ?? '';
  const topicLine = course.topics.slice(0, 4).map((t) => t.title).join(' · ');
  const quizCardCount = useMemo(() => {
    if (quizCardCountProp != null) return quizCardCountProp;
    if (!primarySource?.extractedText?.trim()) return 0;
    return parseNotebookLmExport(primarySource.extractedText).quizCards.length;
  }, [primarySource?.extractedText, quizCardCountProp]);

  const audioSource = useMemo(
    () => sources.find(
      (f) => f.ingestMethod === 'notebooklm-audio-transcript'
        || (f.ingestMethod === 'transcript' && f.courseId === course.id),
    ),
    [sources, course.id],
  );
  const audioChapterCount = useMemo(
    () => (audioSource?.extractedText
      ? parseNotebookLmAudioFromMarkdown(audioSource.extractedText).length
      : 0),
    [audioSource?.extractedText],
  );

  const handleExport = async (kind: NotebookLmExportKind) => {
    setExportBusy(kind);
    try {
      const payload = buildNotebookLmExportPayload(kind, {
        course,
        glossary: glossaryEntries,
        learnerModel,
        lang,
      });
      await exportToNotebookLm(payload, lang);
    } finally {
      setExportBusy(null);
    }
  };

  const tiles: StudioTile[] = [
    {
      id: 'workspace',
      label: el ? 'Study Workspace' : 'Study Workspace',
      hint: el ? 'FSRS · εργαλεία · βήματα μαθήματος' : 'FSRS tools · lesson steps',
      icon: Layers,
      onClick: onOpenWorkspace,
      testId: 'notebook-shell-open-workspace',
    },
    {
      id: 'nlm',
      label: el ? 'Ρώτα στο NotebookLM' : 'Ask in NotebookLM',
      hint: el ? 'Grounded Q&A στο Google' : 'Grounded Q&A on Google',
      icon: ExternalLink,
      onClick: () => void openNotebookLm({
        sourceTitle: primarySource ? notebookLmSourceLabel(primarySource.name, primarySource.ingestMethod) : course.title,
        lang,
      }),
      testId: 'notebook-shell-open-nlm',
    },
    {
      id: 'import',
      label: el ? 'Εισαγωγή από NLM' : 'Import from NLM',
      hint: el ? 'Paste study guide / quiz' : 'Paste study guide / quiz',
      icon: BookOpen,
      onClick: () => onOpenLibraryImport?.(),
      testId: 'notebook-shell-import-nlm',
    },
    {
      id: 'retention',
      label: el ? 'Retention (FSRS)' : 'Retention (FSRS)',
      hint: el ? 'Leitner · Anki · due queue στο workspace' : 'Leitner · Anki · due queue in workspace',
      icon: Brain,
      onClick: onOpenWorkspace,
    },
    {
      id: 'export-review',
      label: el ? 'Export review pack' : 'Export review pack',
      hint: el ? 'Synapse → NotebookLM markdown' : 'Synapse → NotebookLM markdown',
      icon: Upload,
      onClick: () => void handleExport('review-pack'),
      testId: 'notebook-shell-export-review',
    },
    {
      id: 'export-guide',
      label: el ? 'Export study guide' : 'Export study guide',
      hint: el ? 'Οδηγός + γλωσσάρι για NLM' : 'Study guide + glossary for NLM',
      icon: Upload,
      onClick: () => void handleExport('study-guide'),
      testId: 'notebook-shell-export-guide',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col bg-surface-primary"
      data-testid="notebook-shell-view"
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle bg-surface-secondary/80 shrink-0">
        <div className="min-w-0">
          <p className="type-micro text-brand-700 font-semibold">
            {el ? 'Notebook Shell' : 'Notebook Shell'}
          </p>
          <h1 className="text-sm font-semibold text-text-primary truncate">{course.title}</h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={el ? 'Κλείσιμο' : 'Close'}
          className="p-2 rounded-lg hover:bg-surface-hover text-text-secondary"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Sources rail */}
        <aside
          className="lg:w-60 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border-subtle bg-surface-card/40 overflow-y-auto"
          data-testid="notebook-shell-sources"
        >
          <div className="px-3 py-2 border-b border-border-subtle/60">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              <AllCapsLabel>{el ? 'Πηγές' : 'Sources'}</AllCapsLabel>
            </p>
          </div>
          <ul className="p-2 space-y-1">
            {sources.length === 0 ? (
              <li className="px-2 py-3 text-xs text-text-muted">
                {el ? 'Χωρίς συνδεδεμένα αρχεία.' : 'No linked files yet.'}
              </li>
            ) : sources.map((file) => (
              <li key={file.id}>
                <button
                  type="button"
                  onClick={() => void openNotebookLm({
                    sourceTitle: notebookLmSourceLabel(file.name, file.ingestMethod),
                    lang,
                  })}
                  className="w-full text-left rounded-lg px-2 py-2 hover:bg-surface-hover transition-colors"
                  data-testid={`notebook-shell-source-${file.id}`}
                >
                  <p className="text-xs font-medium text-text-primary truncate">{file.name}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {file.ingestMethod === 'notebooklm-import' || file.ingestMethod === 'notebooklm-chat' || file.ingestMethod === 'notebooklm-audio-transcript'
                      ? 'NotebookLM'
                      : file.type.toUpperCase()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Center — study focus */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6" data-testid="notebook-shell-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
              <p className="text-xs text-text-secondary mb-2">
                {el ? 'Κέντρο μελέτης — Synapse native' : 'Study center — Synapse native'}
              </p>
              {topicLine && (
                <p className="text-sm font-medium text-text-primary mb-3">{topicLine}</p>
              )}
              {excerpt ? (
                <p className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-[12]">{excerpt}</p>
              ) : (
                <p className="text-xs text-text-muted">
                  {el ? 'Άνοιξε το Workspace για πλήρες υλικό.' : 'Open Workspace for full material.'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium"
                data-testid="notebook-shell-continue-workspace"
              >
                <Sparkles className="w-4 h-4" />
                {el ? 'Συνέχεια στο Workspace' : 'Continue in Workspace'}
              </button>
              {quizCardCount > 0 && onAddQuizToFsrs && (
                <button
                  type="button"
                  onClick={onAddQuizToFsrs}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-emerald/90 text-white text-sm font-medium"
                  data-testid="notebook-shell-add-fsrs"
                >
                  <Brain className="w-4 h-4" />
                  {el ? `FSRS deck (${quizCardCount})` : `FSRS deck (${quizCardCount})`}
                </button>
              )}
              {audioChapterCount > 0 && audioSource?.id && onAddAudioToFsrs && (
                <button
                  type="button"
                  onClick={() => onAddAudioToFsrs(audioSource.id!)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-violet/90 text-white text-sm font-medium"
                  data-testid="notebook-shell-add-audio-fsrs"
                >
                  <Brain className="w-4 h-4" />
                  {el
                    ? `Audio → FSRS (${audioChapterCount})`
                    : `Audio → FSRS (${audioChapterCount})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => void openNotebookLm({ sourceTitle: course.title, lang })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:bg-surface-hover"
              >
                <ExternalLink className="w-4 h-4" />
                {el ? 'NotebookLM Q&A' : 'NotebookLM Q&A'}
              </button>
            </div>
          </div>
        </main>

        {/* Studio rail */}
        <aside
          className="lg:w-64 xl:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-border-subtle bg-surface-secondary/30 overflow-y-auto"
          data-testid="notebook-shell-studio"
        >
          <div className="px-3 py-2 border-b border-border-subtle/60 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-accent-amber" />
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              <AllCapsLabel>Studio</AllCapsLabel>
            </p>
          </div>
          <div className="p-2 grid grid-cols-2 lg:grid-cols-1 gap-2">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                disabled={exportBusy != null && tile.id.startsWith('export-')}
                onClick={tile.onClick}
                data-testid={tile.testId}
                className={cn(
                  'rounded-xl border border-border-subtle bg-surface-card p-3 text-left',
                  'hover:border-brand-300 hover:bg-surface-hover transition-colors',
                )}
              >
                <tile.icon className="w-4 h-4 text-brand-600 mb-2" />
                <p className="text-xs font-semibold text-text-primary">{tile.label}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{tile.hint}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
