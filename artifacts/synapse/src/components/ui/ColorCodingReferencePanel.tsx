import { cn } from '../../utils/cn';
import {
  COLOR_CODING_ENTRIES,
  type ColorCodingEntryId,
} from '../../lib/colorCodingReference';
import { useI18n, type I18nKey } from '../../lib/i18n';
import { BlueprintSurface } from './BlueprintSurface';
import { SectionHeader } from './platformChrome';

const NAME_KEYS: Record<ColorCodingEntryId, I18nKey> = {
  mastered: 'colorRefMasteredName',
  proficient: 'colorRefProficientName',
  developing: 'colorRefDevelopingName',
  weak: 'colorRefWeakName',
  sourceGrounded: 'colorRefSourceGroundedName',
  inferred: 'colorRefInferredName',
};

const USE_KEYS: Record<ColorCodingEntryId, I18nKey> = {
  mastered: 'colorRefMasteredUse',
  proficient: 'colorRefProficientUse',
  developing: 'colorRefDevelopingUse',
  weak: 'colorRefWeakUse',
  sourceGrounded: 'colorRefSourceGroundedUse',
  inferred: 'colorRefInferredUse',
};

const COG_KEYS: Record<ColorCodingEntryId, I18nKey> = {
  mastered: 'colorRefMasteredCog',
  proficient: 'colorRefProficientCog',
  developing: 'colorRefDevelopingCog',
  weak: 'colorRefWeakCog',
  sourceGrounded: 'colorRefSourceGroundedCog',
  inferred: 'colorRefInferredCog',
};

/** Semantic mastery & trust color reference — Option-B Wave E15. */
export function ColorCodingReferencePanel({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <BlueprintSurface className={cn('ux-color-ref-panel p-5', className)} data-testid="color-coding-reference">
      <SectionHeader
        eyebrow={t('colorRefEyebrow')}
        title={t('colorRefTitle')}
        subtitle={t('colorRefSubtitle')}
        animate={false}
      />

      <p className="mt-4 text-sm leading-6 text-text-secondary">{t('colorRefIntro')}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {COLOR_CODING_ENTRIES.map((entry) => (
          <div key={entry.id} className="ux-color-ref-card">
            <div className="flex items-center gap-3">
              <div
                className="ux-color-ref-swatch"
                style={{ backgroundColor: entry.swatchVar }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text-primary">{t(NAME_KEYS[entry.id])}</div>
                <div className="text-[10px] text-text-muted">{t(entry.wcagKey)}</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{t(USE_KEYS[entry.id])}</p>
            <p className="mt-2 text-xs leading-5 text-text-tertiary italic">{t(COG_KEYS[entry.id])}</p>
          </div>
        ))}
      </div>

      <div className="ux-color-ref-rule mt-5">
        <span className="text-sm font-semibold text-text-primary">{t('colorRefRuleTitle')}</span>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{t('colorRefRuleBody')}</p>
        <div className="ux-color-ref-rule-bar mt-3" aria-hidden>
          <span className="ux-color-ref-rule-seg ux-color-ref-rule-bg" />
          <span className="ux-color-ref-rule-seg ux-color-ref-rule-structure" />
          <span className="ux-color-ref-rule-seg ux-color-ref-rule-cyan" />
          <span className="ux-color-ref-rule-seg ux-color-ref-rule-emerald" />
          <span className="ux-color-ref-rule-seg ux-color-ref-rule-rose" />
        </div>
      </div>
    </BlueprintSurface>
  );
}
