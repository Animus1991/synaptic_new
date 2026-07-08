import { useMemo, useState } from 'react';
import {
  ArrowLeft, FileText, Brain, FlaskConical, Network, BookOpen, ShieldCheck,
  AlertTriangle, CheckCircle2, ArrowRight, Play, Lightbulb,
} from '@/lib/lucide-shim';
import type { Course, UploadedFile } from '../types';
import type { Lang } from '../lib/i18n';
import { cn } from '../utils/cn';
import { buildNoteAnalysisSnapshot, type NoteAnalysisStageId } from '../lib/noteAnalysisSnapshot';
import { getNoteAnalysisContent, NOTE_ANALYSIS_STAGES } from '../lib/noteAnalysisContent';
import { ConceptGraph } from './visuals/ConceptGraph';
import { Page, PageHeader } from './ui/primitives';
import { workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';
import { LiveEngineTransparencyPanel } from './analysis/LiveEngineTransparencyPanel';

const STAGE_ICONS: Record<NoteAnalysisStageId, typeof FileText> = {
  1: FileText,
  2: Brain,
  2.5: FlaskConical,
  3: Network,
  4: BookOpen,
  5: ShieldCheck,
};

type Props = {
  course: Course;
  files: UploadedFile[];
  lang: Lang;
  onBack: () => void;
  onOpenCourse: () => void;
  onOpenWorkspace: () => void;
};

export function NoteAnalysisView({
  course,
  files,
  lang,
  onBack,
  onOpenCourse,
  onOpenWorkspace,
}: Props) {
  const c = getNoteAnalysisContent(lang);
  const snapshot = useMemo(() => buildNoteAnalysisSnapshot(course, files, lang), [course, files, lang]);
  const [activeStage, setActiveStage] = useState<NoteAnalysisStageId>(2);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(0);
  const [expandedModule, setExpandedModule] = useState<string | null>(snapshot.modules[0]?.id ?? null);

  return (
    <Page className="max-w-6xl">
      <PageHeader
        title={c.pageTitle}
        subtitle={c.subtitle(snapshot.courseTitle, snapshot.sourceQualityScore)}
        icon={FlaskConical}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle text-sm text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
              {c.backToLibrary}
            </button>
            <button
              type="button"
              onClick={onOpenWorkspace}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl ws-fab text-sm font-medium"
              {...workspaceEntryPrefetchHandlers()}
            >
              <Play className="w-4 h-4" />
              {c.openWorkspace}
            </button>
            <button type="button" onClick={onOpenCourse} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/15 text-brand-400 text-sm font-medium hover:bg-brand-600/25">
              {c.generateCourse}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Stage navigator */}
      <div className="flex flex-wrap gap-2 mb-6">
        {NOTE_ANALYSIS_STAGES.map((stageId) => {
          const Icon = STAGE_ICONS[stageId];
          const active = activeStage === stageId;
          return (
            <button
              key={String(stageId)}
              type="button"
              data-testid={`note-analysis-stage-${stageId}`}
              onClick={() => setActiveStage(stageId)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                active ? 'border-brand-500/40 bg-brand-600/10 text-brand-300' : 'border-border-subtle text-text-tertiary hover:border-brand-500/25',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {c.stageNames[stageId]}
            </button>
          );
        })}
      </div>

      {/* Stage 1 — File Processing */}
      {activeStage === 1 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: c.filesUploaded, value: snapshot.fileCount },
            { label: c.pagesParsed, value: snapshot.pageEstimate },
            { label: c.wordsExtracted, value: snapshot.wordCount.toLocaleString() },
            { label: c.detectedSubject, value: snapshot.subject },
          ].map((item) => (
            <div key={item.label} className="ux-card">
              <p className="text-xs text-text-tertiary mb-1">{item.label}</p>
              <p className="text-lg font-semibold text-text-primary">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stage 2 — Content Diagnosis */}
      {activeStage === 2 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {snapshot.extractedItems.map((item) => (
              <div key={item.label} className="ux-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-brand-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">{item.count}</p>
                  <p className="text-xs text-text-tertiary">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="ux-card">
            <h3 className="text-sm font-semibold text-text-primary mb-3">{c.detectedIssues}</h3>
            {snapshot.issues.length === 0 ? (
              <p className="text-sm text-text-secondary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                {c.noIssues}
              </p>
            ) : (
              <div className="space-y-2">
                {snapshot.issues.map((issue, i) => (
                  <div key={i} className="rounded-xl border border-border-subtle overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-start gap-3 p-3 text-left hover:bg-surface-hover"
                      onClick={() => setExpandedIssue(expandedIssue === i ? null : i)}
                    >
                      <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', issue.severity === 'error' ? 'text-accent-rose' : issue.severity === 'warning' ? 'text-accent-amber' : 'text-brand-400')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{issue.title}</p>
                        {expandedIssue === i && (
                          <p className="text-xs text-text-secondary mt-2">{issue.detail}</p>
                        )}
                      </div>
                    </button>
                    {expandedIssue === i && (
                      <div className="px-3 pb-3 text-xs text-brand-400 border-t border-border-subtle pt-2 mx-3">
                        → {issue.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage 2.5 — Algorithm Transparency */}
      {activeStage === 2.5 && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{c.algorithmTransparency}</p>

          <LiveEngineTransparencyPanel
            courseId={course.id}
            files={files}
            lang={lang}
            defaultQuery={snapshot.keyphrases[0]?.phrase ?? course.title}
          />

          {snapshot.bm25Terms.length > 0 && (
            <div className="ux-card overflow-x-auto">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{c.bm25Ranking}</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-tertiary border-b border-border-subtle">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Term</th>
                    <th className="text-right py-2 pr-4">TF</th>
                    <th className="text-right py-2 pr-4">IDF</th>
                    <th className="text-right py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.bm25Terms.map((row) => (
                    <tr key={row.term} className="border-b border-border-subtle/50">
                      <td className="py-2 pr-4 font-mono text-text-muted">{row.rank}</td>
                      <td className="py-2 pr-4 text-text-primary">{row.term}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.tf}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.idf}</td>
                      <td className="py-2 text-right font-mono text-brand-400">{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {snapshot.textRankSentences.length > 0 && (
            <div className="ux-card">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{c.textRankSentences}</h3>
              <div className="space-y-2">
                {snapshot.textRankSentences.map((s, i) => (
                  <div key={i} className={cn('p-3 rounded-xl border text-xs', s.selected ? 'border-brand-500/30 bg-brand-600/5' : 'border-border-subtle')}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-brand-400">{s.score.toFixed(2)}</span>
                      {s.selected && <span className="ux-chip-info px-2 py-0.5 rounded-full text-[10px]">Selected</span>}
                    </div>
                    <p className="text-text-secondary leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {snapshot.keyphrases.length > 0 && (
            <div className="ux-card">
              <h3 className="text-sm font-semibold text-text-primary mb-3">{c.keyphraseRankings}</h3>
              <div className="space-y-1.5">
                {snapshot.keyphrases.map((kp, i) => (
                  <div key={kp.phrase} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-text-muted w-4">{i + 1}</span>
                    <div className="flex-1 ux-progress-track h-1.5">
                      <div className="ux-progress-fill h-full" style={{ width: `${Math.min(100, kp.score * 100)}%` }} />
                    </div>
                    <span className="text-xs text-text-primary min-w-[8rem] truncate">{kp.phrase}</span>
                    <span className="text-xs font-mono text-brand-400">{kp.score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage 3 — Knowledge Graph */}
      {activeStage === 3 && (
        <div className="ux-card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">{c.knowledgeGraph}</h3>
          {snapshot.graphNodes.length > 0 ? (
            <ConceptGraph nodes={snapshot.graphNodes} edges={snapshot.graphEdges} width={720} height={380} />
          ) : (
            <p className="text-sm text-text-secondary">{c.noIssues}</p>
          )}
        </div>
      )}

      {/* Stage 4 — Course Architecture */}
      {activeStage === 4 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">{c.courseArchitecture}</h3>
          {snapshot.modules.map((mod) => (
            <div key={mod.id} className="ux-card">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left"
                onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{mod.title}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {mod.lessonCount} lessons · {mod.minutes} min · {mod.concepts} concepts
                  </p>
                </div>
                <ArrowRight className={cn('w-4 h-4 text-text-muted transition-transform', expandedModule === mod.id && 'rotate-90')} />
              </button>
              {expandedModule === mod.id && (
                <ul className="mt-3 pt-3 border-t border-border-subtle space-y-1">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson} className="text-xs text-text-secondary">· {lesson}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stage 5 — Quality Assurance */}
      {activeStage === 5 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {snapshot.qaMetrics.map((metric) => {
            const displayScore = metric.invert ? 100 - metric.score : metric.score;
            return (
              <div key={metric.label} className="ux-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-text-primary">{metric.label}</p>
                  <p className="text-xl font-bold font-mono text-text-primary">{displayScore}%</p>
                </div>
                <div className="ux-progress-track mb-2">
                  <div className="ux-progress-fill" style={{ width: `${displayScore}%` }} />
                </div>
                <p className="text-xs text-text-tertiary">{metric.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
