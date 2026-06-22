import { Sparkles } from 'lucide-react';
import type { buildWorkspaceNoteBundle } from '../../lib/workspaceNoteContent';

export function SourceIntelligenceCard({
  report,
  toolLabel,
  onOpenRecommendedTool,
}: {
  report: NonNullable<ReturnType<typeof buildWorkspaceNoteBundle>['sourceIntelligence']>;
  toolLabel: string;
  onOpenRecommendedTool: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border p-4 shadow-[0_18px_60px_rgba(15,23,42,0.16)] border-accent-cyan/25 bg-accent-cyan/6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-accent-cyan/12 text-accent-cyan">
              Source Intelligence
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-2xl">
            {report.bestToolReason}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenRecommendedTool}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:border-accent-cyan/40 hover:text-text-primary transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            Open {toolLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
