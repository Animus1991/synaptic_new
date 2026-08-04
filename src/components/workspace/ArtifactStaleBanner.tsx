import type { StalePracticeTool } from '../../lib/artifactStaleness';
import { t, type Lang } from '../../lib/i18n';
import { WorkspacePanelWarnStrip } from './WorkspacePanelWarnStrip';

type Props = {
  lang: Lang;
  tool: StalePracticeTool;
  onDismiss: () => void;
};

const TOOL_LABEL: Record<StalePracticeTool, { en: string; el: string }> = {
  quiz: { en: 'quiz questions', el: 'ΞµΟΟ‰Ο„Ξ®ΟƒΞµΞΉΟ‚ ΞΊΞΏΟ…Ξ―Ξ¶' },
  leitner: { en: 'flashcards', el: 'ΞΊΞ¬ΟΟ„ΞµΟ‚' },
  simulator: { en: 'simulator parameters', el: 'Ο€Ξ±ΟΞ¬ΞΌΞµΟ„ΟΞΏΞΉ Ο€ΟΞΏΟƒΞΏΞΌΞΏΞ―Ο‰ΟƒΞ·Ο‚' },
};

/** Visible stale flag after source reprocess (Β§11). */
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
          className="ws-empty-cta-secondary shrink-0 self-end px-2.5 py-1 type-caption sm:self-auto"
          data-testid={`artifact-stale-dismiss-${tool}`}
        >
          {t('gotItContinue', lang)}
        </button>
      }
    >
      <p className="type-caption leading-relaxed">
        {t('artifactStaleMessage', lang).replace('{label}', label)}
      </p>
    </WorkspacePanelWarnStrip>
  );
}
