import { useState } from 'react';
import { Map } from '@/lib/lucide-shim';
import type { Lang } from '../../lib/i18n';
import type { TreemapBlock } from '../../lib/knowledgeFlowAnalytics';
import { treemapAdvice } from '../../lib/knowledgeFlowAnalytics';
import { cn } from '../../utils/cn';

const TONE_CLASS: Record<TreemapBlock['tone'], string> = {
  cyan: 'border-accent-cyan/25 bg-accent-cyan/8',
  violet: 'border-accent-violet/25 bg-accent-violet/8',
  amber: 'border-accent-amber/25 bg-accent-amber/8',
  emerald: 'border-accent-emerald/25 bg-accent-emerald/8',
  rose: 'border-accent-rose/25 bg-accent-rose/8',
};

type Props = {
  blocks: TreemapBlock[];
  totalWeight: number;
  hasData: boolean;
  title: string;
  hint: string;
  emptyLabel: string;
  lang: Lang;
  weightLabel: string;
  masteryLabel: string;
  prereqLabel: string;
};

export function ConceptTreemapChart({
  blocks,
  totalWeight,
  hasData,
  title,
  hint,
  emptyLabel,
  lang,
  weightLabel,
  masteryLabel,
  prereqLabel,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = blocks.find((b) => b.id === activeId) ?? null;

  if (!hasData || blocks.length === 0) {
    return (
      <div className="ux-card blueprint-surface flex flex-col items-center justify-center min-h-[220px] text-center" data-testid="concept-treemap-empty">
        <Map className="w-8 h-8 text-text-tertiary mb-2" />
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="ux-card blueprint-surface" data-testid="concept-treemap">
      <h3 className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2">
        <Map className="w-4 h-4 text-brand-400" />
        {title}
      </h3>
      <p className="text-xs text-text-tertiary mb-4">{hint}</p>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-surface-primary/40 p-3">
        {blocks.map((block) => {
          const pct = totalWeight > 0 ? (block.value / totalWeight) * 100 : 0;
          const isActive = activeId === block.id;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => setActiveId(isActive ? null : block.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all duration-200 min-w-[8rem] treemap-block',
                TONE_CLASS[block.tone],
                isActive && 'ring-2 ring-brand-500/35 scale-[1.01]',
              )}
              style={{ flexBasis: `${Math.max(28, pct * 1.4)}%`, flexGrow: 1 }}
            >
              <div className="text-sm font-semibold text-text-primary line-clamp-2">{block.label}</div>
              <div className="mt-1 text-[10px] text-text-tertiary">
                {masteryLabel} {block.mastery}% · {weightLabel} {Math.round(pct)}%
              </div>
              <div className="mt-2 ux-progress-track h-1">
                <div
                  className="ux-progress-fill h-full"
                  style={{ width: `${block.mastery}%`, background: 'var(--color-brand-500)' }}
                />
              </div>
              {block.prereqs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {block.prereqs.map((p) => (
                    <span key={p} className="rounded-full bg-surface-hover px-2 py-0.5 text-[9px] text-text-muted">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-3 rounded-xl border border-border-subtle bg-surface-secondary/50 p-3 text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">{active.label}</span>
          {' — '}
          {weightLabel} {Math.round((active.value / totalWeight) * 100)}%, {masteryLabel.toLowerCase()} {active.mastery}%.
          <span className="block mt-1">{treemapAdvice(active.mastery, lang)}</span>
          {active.prereqs.length > 0 && (
            <span className="block mt-1 text-xs text-text-muted">
              {prereqLabel}: {active.prereqs.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
