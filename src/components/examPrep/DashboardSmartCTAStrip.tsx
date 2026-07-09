import { ArrowRight, Sparkle as Sparkles } from '@phosphor-icons/react';
import type { DashboardSmartCTA } from '../../lib/examPrep/dashboardSmartCTAs';
import { useI18n } from '../../lib/i18n';
import { MotionSection } from '../ui/MotionSection';
import { BlueprintSurface } from '../ui/BlueprintSurface';

type Props = {
  ctas: DashboardSmartCTA[];
  onRun: (cta: DashboardSmartCTA) => void;
};

export function DashboardSmartCTAStrip({ ctas, onRun }: Props) {
  const { t } = useI18n();
  if (ctas.length === 0) return null;

  return (
    <MotionSection
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.07 }}
      data-testid="dashboard-smart-cta-strip"
    >
      <BlueprintSurface className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <p className="text-sm font-semibold text-text-primary">{t('dashboardSmartCtaTitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ctas.map((cta) => (
            <button
              key={cta.id}
              type="button"
              data-testid={`dashboard-smart-cta-${cta.id}`}
              onClick={() => onRun(cta)}
              className="group flex flex-col items-start gap-0.5 rounded-xl border border-border-subtle bg-surface-card/50 px-3 py-2 text-left hover:border-brand-500/40 hover:bg-brand-600/5 transition-colors max-w-full sm:max-w-[14rem]"
            >
              <span className="flex items-center gap-1 text-xs font-semibold text-brand-800">
                {cta.label}
                <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </span>
              {cta.hint && (
                <span className="text-[10px] text-text-muted line-clamp-2">{cta.hint}</span>
              )}
            </button>
          ))}
        </div>
      </BlueprintSurface>
    </MotionSection>
  );
}
