import type { StalePracticeTool } from '../../lib/artifactStaleness';
import { t, type Lang } from '../../lib/i18n';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';

type Props = {
  lang: Lang;
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
  const label = TOOL_LABEL[tool][lang];

  return (
    <WorkspacePanelWarnStrip
      testId={`artifact-stale-banner-${tool}`}
      className="flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:justify-between"
      trailing={
        <button
          type="button"
          onClick={onDismiss}
          className="ws-empty-cta-secondary shrink-0 self-end px-2.5 py-1 text-[10px] sm:self-auto"
          data-testid={`artifact-stale-dismiss-${tool}`}
        >
          {t('gotItContinue', lang)}
        </button>
      }
    >
      <p className="text-[11px] leading-relaxed">
        {t('artifactStaleMessage', lang).replace('{label}', label)}
      </p>
    </WorkspacePanelWarnStrip>
  );
}
