import { useState } from 'react';
import { HelpCircle, Sparkles, ChevronDown, ChevronRight } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WorkspaceContextBreadcrumb } from '../../lib/workspaceContextModel';
import type { WorkspaceSourceIntelligence } from '../../lib/workspaceNoteContent';
import { WorkspaceStudyRoomTrigger } from './WorkspaceStudyRoomTrigger';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

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
  onOpenStudyRoom?: () => void;
  studyRoomOpen?: boolean;
  /** When Together is already in the workspace header, hide the duplicate chip here. */
  studyRoomInHeader?: boolean;
  /**
   * OPT-M status inbox — keep breadcrumb/focus visible; fold quality/weak/concepts/next into Status.
   * All actions remain reachable when expanded.
   */
  statusInbox?: boolean;
  className?: string;
};

function qualityBand(score: number): 'weak' | 'moderate' | 'strong' {
  if (score >= 70) return 'strong';
  if (score >= 45) return 'moderate';
  return 'weak';
}

const bandClass = {
  weak: 'ws-chip-warn',
  moderate: 'ws-chip-brand',
  strong: 'ws-chip-ok',
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
  onOpenStudyRoom,
  studyRoomOpen = false,
  studyRoomInHeader = false,
  statusInbox = false,
  className,
}: Props) {
  const { t } = useI18n();
  const [inboxOpen, setInboxOpen] = useState(false);
  const score = sourceQuality ?? sourceIntelligence?.score ?? null;
  const band = typeof score === 'number' ? qualityBand(score) : null;

  const statusChips = (
    <>
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
          {t('toolSource')} <span className="ws-num">{score}</span>
          {showMigration && <span className="ml-1 opacity-80">↑</span>}
        </button>
      )}

      {onOpenStudyRoom && !studyRoomInHeader && (
        <WorkspaceStudyRoomTrigger
          lang={lang}
          open={studyRoomOpen}
          onClick={onOpenStudyRoom}
        />
      )}

      {showNextAction && onNextAction && (
        <button
          type="button"
          onClick={onNextAction}
          className="ws-eyebrow inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-500/35 bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-800 hover:bg-brand-500/15"
          data-testid="context-bar-next-action"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          <AllCapsLabel>{nextActionLabel ?? t('next')}</AllCapsLabel>
        </button>
      )}

      {weakCount > 0 && onToggleWeak && (
        <button
          type="button"
          onClick={onToggleWeak}
          aria-pressed={weakOpen}
          className={cn(
            'ws-eyebrow shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
            weakOpen ? 'ws-chip-danger' : 'ws-chip-neutral',
          )}
          data-testid="context-bar-weak-chip"
        >
          <AllCapsLabel>{t('weak')}</AllCapsLabel> <span className="ws-num">({weakCount})</span>
        </button>
      )}

      {onToggleConcepts && (
        <button
          type="button"
          onClick={onToggleConcepts}
          aria-pressed={conceptsOpen}
          className={cn(
            'ws-eyebrow shrink-0 rounded-full border px-2 py-0.5 text-[10px]',
            conceptsOpen ? 'ws-chip-brand' : 'ws-chip-neutral',
          )}
          data-testid="context-bar-concepts-chip"
        >
          <AllCapsLabel>{t('contextConceptsLabel')}</AllCapsLabel>
          {conceptCount > 0 ? <span className="ws-num"> ({conceptCount})</span> : null}
        </button>
      )}

      {onOpenIntelSheet && (
        <button
          type="button"
          onClick={onOpenIntelSheet}
          aria-pressed={intelSheetOpen}
          aria-label={t('contextIntelDetailsAria')}
          className={cn(
            'ml-auto shrink-0 rounded-full border p-1 transition-colors',
            intelSheetOpen
              ? 'ws-chip-brand'
              : 'ws-chip-neutral border-transparent bg-transparent',
          )}
          data-testid="context-bar-intel-info"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </>
  );

  return (
    <div
      className={cn(
        'relative z-10 flex min-h-[2.25rem] items-center gap-1.5 border-b border-border-subtle/70 bg-surface-primary/85 px-2 py-1 shrink-0',
        statusInbox ? 'flex-wrap max-h-none' : 'max-h-12 overflow-x-auto scrollbar-none',
        className,
      )}
      data-testid="workspace-context-bar"
      data-status-inbox={statusInbox || undefined}
    >
      <div className="hidden min-w-0 max-w-[28%] truncate text-[10px] text-text-muted sm:block" title={context.sectionLabel}>
        <span className="font-medium text-text-secondary">{context.courseLabel}</span>
        <span className="mx-1">/</span>
        <span className="text-text-primary">{context.sectionLabel}</span>
      </div>

      {focusConcept && (
        <span
          className="ws-eyebrow max-w-[8rem] truncate shrink rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] text-brand-800"
          data-testid="context-bar-focus-chip"
          title={focusConcept}
        >
          <AllCapsLabel>{focusConcept}</AllCapsLabel>
        </span>
      )}

      {statusInbox ? (
        <div className="ml-auto flex min-w-0 flex-1 flex-col items-stretch sm:max-w-[70%]">
          <button
            type="button"
            className="inline-flex w-fit items-center gap-1 self-end rounded-md border border-border-default px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            aria-expanded={inboxOpen}
            data-testid="workspace-status-inbox-toggle"
            onClick={() => setInboxOpen((v) => !v)}
          >
            {t('chromeMoreStatus')}
            {inboxOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          {inboxOpen ? (
            <div
              className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-1"
              data-testid="workspace-status-inbox"
            >
              {statusChips}
            </div>
          ) : null}
        </div>
      ) : (
        statusChips
      )}
    </div>
  );
}
