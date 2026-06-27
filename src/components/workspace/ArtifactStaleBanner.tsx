import { AlertTriangle } from '@/lib/lucide-shim';
import type { StalePracticeTool } from '../../lib/artifactStaleness';

type Props = {
  lang: 'en' | 'el';
  tool: StalePracticeTool;
  onDismiss: () => void;
};

const TOOL_LABEL: Record<StalePracticeTool, { en: string; el: string }> = {
  quiz: { en: 'quiz questions', el: 'ερωτήσεις κουίζ' },
  leitner: { en: 'flashcards', el: 'κάρτες' },
  simulator: { en: 'simulator parameters', el: 'παράμετροι προσομοίωσης' },
};

/** Visible stale flag after source reprocess (§11). */
export function ArtifactStaleBanner({ lang, tool, onDismiss }: Props) {
  const isEl = lang === 'el';
  const label = TOOL_LABEL[tool][lang];

  return (
    <div
      className="mb-3 flex flex-col gap-2 rounded-xl border border-accent-amber/35 bg-accent-amber/10 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
      data-testid={`artifact-stale-banner-${tool}`}
      role="status"
    >
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" aria-hidden />
        <p className="text-[11px] leading-relaxed text-accent-amber">
          {isEl
            ? `Η πηγή επανεπεξεργάστηκε — οι ${label} μπορεί να βασίζονται σε παλιό υλικό.`
            : `Source was reprocessed — ${label} may be based on outdated material.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 self-end rounded-lg border border-accent-amber/40 bg-accent-amber/15 px-2.5 py-1 text-[10px] font-medium text-accent-amber hover:bg-accent-amber/25 transition-colors"
        data-testid={`artifact-stale-dismiss-${tool}`}
      >
        {isEl ? 'Εντάξει, συνέχεια' : 'Got it'}
      </button>
    </div>
  );
}
