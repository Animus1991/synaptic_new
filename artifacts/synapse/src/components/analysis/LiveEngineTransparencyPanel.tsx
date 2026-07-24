import { useMemo, useState } from 'react';
import { FileText, Search, Brain, Network } from '@/lib/lucide-shim';
import type { UploadedFile } from '../../types';
import type { Lang } from '../../lib/i18n';
import { cn } from '../../utils/cn';
import { buildLiveTransparencyData } from '../../lib/noteAnalysisSnapshot';
import { getNoteAnalysisContent } from '../../lib/noteAnalysisContent';
import { formatCitation, toCitation } from '../../lib/rag';

type Props = {
  courseId: string;
  files: UploadedFile[];
  lang: Lang;
  defaultQuery?: string;
};

export function LiveEngineTransparencyPanel({
  courseId,
  files,
  lang,
  defaultQuery = '',
}: Props) {
  const c = getNoteAnalysisContent(lang);
  const [query, setQuery] = useState(defaultQuery);
  const effectiveQuery = query.trim() || defaultQuery.trim();

  const data = useMemo(
    () => buildLiveTransparencyData(files, courseId, effectiveQuery, 5),
    [files, courseId, effectiveQuery],
  );

  return (
    <div className="space-y-4" data-testid="live-engine-transparency">
      <div className="ux-card">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-brand-600/15 flex items-center justify-center">
            <Search className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{c.liveTransparencyTitle}</h3>
            <p className="text-xs text-text-secondary mt-1">{c.liveTransparencyHint}</p>
          </div>
        </div>

        <label className="block text-xs font-medium text-text-tertiary mb-1.5">
          {c.liveTransparencyQueryLabel}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.liveTransparencyQueryPlaceholder}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-input border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-brand-500/50"
            data-testid="live-engine-query"
          />
          <button
            type="button"
            className="px-4 py-2.5 rounded-xl ws-fab text-sm font-medium whitespace-nowrap"
            onClick={() => setQuery((q) => q.trim())}
          >
            {c.liveTransparencyRun}
          </button>
        </div>
        <p className="text-[11px] text-text-tertiary mt-2">
          {data.wordCount.toLocaleString()} words indexed · {files.filter((f) => f.courseId === courseId).length} files
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="ux-card">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" />
            {c.liveTransparencyHits}
          </h3>
          {data.hits.length === 0 ? (
            <p className="text-sm text-text-secondary">{c.liveTransparencyNoHits}</p>
          ) : (
            <div className="space-y-3">
              {data.hits.map((hit, index) => {
                const citation = toCitation(hit.chunk);
                return (
                  <div key={hit.chunk.id} className="rounded-xl border border-border-subtle p-3 bg-surface-card/50">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-mono text-brand-400">#{index + 1} · {hit.score.toFixed(2)}</span>
                      <span className="text-[11px] text-text-tertiary truncate">{formatCitation(citation)}</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{citation.snippet}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ux-card">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-brand-400" />
            {c.textRankSentences}
          </h3>
          <div className="space-y-2">
            {data.textRankSentences.slice(0, 5).map((sentence, i) => (
              <div key={`${sentence.text}-${i}`} className={cn('p-3 rounded-xl border text-xs', sentence.selected ? 'border-brand-500/30 bg-brand-600/5' : 'border-border-subtle')}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-brand-400">{sentence.score.toFixed(2)}</span>
                  {sentence.selected && <span className="ux-chip-info px-2 py-0.5 rounded-full text-[10px]">Selected</span>}
                </div>
                <p className="text-text-secondary leading-relaxed">{sentence.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="ux-card overflow-x-auto">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Network className="w-4 h-4 text-brand-400" />
            {c.bm25Ranking}
          </h3>
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
              {data.bm25Terms.map((row) => (
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

        <div className="ux-card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">{c.keyphraseRankings}</h3>
          <div className="space-y-1.5">
            {data.keyphrases.map((kp, i) => (
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
      </div>
    </div>
  );
}
