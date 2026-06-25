import { Layers, Sparkles } from 'lucide-react';
import type { buildWorkspaceNoteBundle } from '../../lib/workspaceNoteContent';
import type { DocumentStructureKind } from '../../lib/documentStructureReport';
import { displaySectionLabel } from '../../lib/readerDocumentLayout';

const KIND_BADGE: Record<DocumentStructureKind, string> = {
  conversation: 'Chat / Q&A',
  faq: 'FAQ',
  slides: 'Slides',
  headings: 'Sections',
  dialogue: 'Dialogue',
  journal: 'Journal',
  flat: 'Plain text',
};

export function SourceIntelligenceCard({
  report,
  toolLabel,
  onOpenRecommendedTool,
}: {
  report: NonNullable<ReturnType<typeof buildWorkspaceNoteBundle>['sourceIntelligence']>;
  toolLabel: string;
  onOpenRecommendedTool: () => void;
}) {
  const structure = report.documentStructure;
  const bandColor =
    report.band === 'strong' ? 'text-accent-emerald' : report.band === 'moderate' ? 'text-accent-cyan' : 'text-accent-amber';

  return (
    <div className="mb-4 rounded-2xl border p-4 shadow-[0_18px_60px_rgba(15,23,42,0.16)] border-accent-cyan/25 bg-accent-cyan/6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide bg-accent-cyan/12 text-accent-cyan">
              Source Intelligence
            </span>
            <span className={`text-[11px] font-semibold ${bandColor}`}>
              {report.score}/100 · {report.band}
            </span>
            {structure && structure.sectionCount >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium bg-white/[0.06] text-text-secondary">
                <Layers className="w-3 h-3" />
                {structure.sectionCount} {KIND_BADGE[structure.kind]}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-2xl">
            {report.bestToolReason}
          </p>
          {structure && structure.sections.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {structure.sections.slice(0, 8).map((sec, i) => {
                const label = sec.heading ?? displaySectionLabel(undefined, sec.preview) ?? `§${i + 1}`;
                if (/page break/i.test(label)) return null;
                return (
                <span
                  key={i}
                  title={sec.preview}
                  className="inline-block max-w-[180px] truncate rounded-lg border border-white/10 bg-surface-card/80 px-2 py-1 text-[10px] text-text-secondary"
                >
                  {label.slice(0, 40)}
                </span>
              );})}
            </div>
          )}
          {report.strengths[0] && (
            <p className="mt-2 text-[11px] text-accent-emerald/90">{report.strengths[0]}</p>
          )}
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
