import { HelpCircle, Sparkles } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WorkspaceContextBreadcrumb } from '../../lib/workspaceContextModel';
import type { WorkspaceSourceIntelligence } from '../../lib/workspaceNoteContent';

type Props = {
  context: WorkspaceContextBreadcrumb;
  lang: 'en' | 'el';
  sourceQuality?: number | null;
  sourceIntelligence?: WorkspaceSourceIntelligence | null;
  focusConcept?: string;
  showNextAction?: boolean;
  nextActionLabel?: string;
  onNextAction?: () => void;
  weakCount?: number;
  conceptCount?: number;
  onToggleWeak?: () => void;
  onToggleConcepts?: () => void;
  weakOpen?: boolean;
  conceptsOpen?: boolean;
  onOpenIntelSheet?: () => void;
  intelSheetOpen?: boolean;
  showMigration?: boolean;
  className?: string;
};

function qualityBand(score: number): 'weak' | 'moderate' | 'strong' {
  if (score >= 70) return 'strong';
  if (score >= 45) return 'moderate';
  return 'weak';
}

const bandClass = {
  weak: 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber',
  moderate: 'border-accent-cyan/35 bg-accent-cyan/10 text-accent-cyan',
  strong: 'border-accent-emerald/35 bg-accent-emerald/10 text-accent-emerald',
};

/** Single contextual strip — replaces stacked WorkspaceContextStrip + collapsed source intel. */
export function WorkspaceContextBar({
  context,
  lang,
  sourceQuality,
  sourceIntelligence,
  focusConcept,
  showNextAction,
  nextActionLabel,
  onNextAction,
  weakCount = 0,
  conceptCount = 0,
  onToggleWeak,
  onToggleConcepts,
  weakOpen = false,
  conceptsOpen = false,
  onOpenIntelSheet,
  intelSheetOpen = false,
  showMigration = false,
  className,
}: Props) {
  const isEl = lang === 'el';
  const score = sourceQuality ?? sourceIntelligence?.score ?? null;
  const band = typeof score === 'number' ? qualityBand(score) : null;

  return (
    <div
      className={cn(
        'relative z-10 flex min-h-[2.25rem] max-h-12 items-center gap-1.5 border-b border-border-subtle/70 bg-surface-primary/85 px-2 py-1 shrink-0 overflow-x-auto scrollbar-none',
        className,
      )}
      data-testid="workspace-context-bar"
    >
      <div className="hidden min-w-0 max-w-[28%] truncate text-[10px] text-text-muted sm:block" title={context.sectionLabel}>
        <span className="font-medium text-text-secondary">{context.courseLabel}</span>
        <span className="mx-1">/</span>
        <span className="text-text-primary">{context.sectionLabel}</span>
      </div>

      {typeof score === 'number' && band && (
        <button
          type="button"
          onClick={onOpenIntelSheet}
          className={cn(
            'ws-eyebrow shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono normal-case tracking-normal',
            bandClass[band],
          )}
          data-testid="context-bar-quality-chip"
          aria-pressed={intelSheetOpen}
        >
          {isEl ? 'Πηγή' : 'Source'} <span className="ws-num">{score}</span>
          {showMigration && <span className="ml-1 opacity-80">↑</span>}
        </button>
      )}

      {focusConcept && (
        <span
          className="ws-eyebrow max-w-[8rem] truncate shrink rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-800"
          data-testid="context-bar-focus-chip"
          title={focusConcept}
        >
          {focusConcept}
        </span>
      )}

      {showNextAction && onNextAction && (
        <button
          type="button"
          onClick={onNextAction}
          className="ws-eyebrow inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-500/35 bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-800 hover:bg-brand-500/15"
          data-testid="context-bar-next-action"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          {nextActionLabel ?? (isEl ? 'Επόμενο' : 'Next')}
        </button>
      )}

      {weakCount > 0 && onToggleWeak && (
        <button
          type="button"
          onClick={onToggleWeak}
          aria-pressed={weakOpen}
          className={cn(
            'ws-eyebrow shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
            weakOpen
              ? 'border-accent-rose/40 bg-accent-rose/10 text-accent-rose'
              : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
          )}
          data-testid="context-bar-weak-chip"
        >
          {isEl ? 'Αδύναμα' : 'Weak'} <span className="ws-num">({weakCount})</span>
        </button>
      )}

      {onToggleConcepts && (
        <button
          type="button"
          onClick={onToggleConcepts}
          aria-pressed={conceptsOpen}
          className={cn(
            'ws-eyebrow shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
            conceptsOpen
              ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
              : 'border-border-subtle text-text-secondary hover:bg-surface-hover',
          )}
          data-testid="context-bar-concepts-chip"
        >
          {isEl ? 'Έννοιες' : 'Concepts'}
          {conceptCount > 0 ? <span className="ws-num"> ({conceptCount})</span> : null}
        </button>
      )}

      {onOpenIntelSheet && (
        <button
          type="button"
          onClick={onOpenIntelSheet}
          aria-pressed={intelSheetOpen}
          aria-label={isEl ? 'Λεπτομέρειες πηγής και intelligence' : 'Source & intelligence details'}
          className={cn(
            'ml-auto shrink-0 rounded-full border p-1 transition-colors',
            intelSheetOpen
              ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
              : 'border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-hover',
          )}
          data-testid="context-bar-intel-info"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
