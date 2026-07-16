import { ArrowRight, Brain, Warning as AlertTriangle } from '@phosphor-icons/react';
import type { ProactiveAgentAlert } from '../../lib/proactiveAgentAlerts';
import { useI18n } from '../../lib/i18n';
import { MotionSection } from '../ui/MotionSection';
import { BlueprintSurface } from '../ui/BlueprintSurface';
import { cn } from '../../utils/cn';

type Props = {
  alerts: ProactiveAgentAlert[];
  onRun: (alert: ProactiveAgentAlert) => void;
};

const KIND_ICON = {
  'forgetting-risk': Brain,
  'quiz-fail-streak': AlertTriangle,
  misconception: AlertTriangle,
} as const;

export function ProactiveAgentAlertStrip({ alerts, onRun }: Props) {
  const { t } = useI18n();
  if (alerts.length === 0) return null;

  return (
    <MotionSection
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      data-testid="proactive-agent-alert-strip"
    >
      <BlueprintSurface className="p-3 space-y-2.5 border border-accent-amber/20 bg-accent-amber/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-accent-amber" weight="fill" />
          <p className="text-sm font-semibold text-text-primary">{t('proactiveAlertStripTitle')}</p>
        </div>
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const Icon = KIND_ICON[alert.kind];
            return (
              <button
                key={alert.id}
                type="button"
                data-testid={`proactive-agent-alert-${alert.id}`}
                onClick={() => onRun(alert)}
                className={cn(
                  'ux-proactive-alert-item group flex items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                  alert.severity === 'urgent'
                    ? 'border-accent-rose/30 bg-accent-rose/5 hover:border-accent-rose/50'
                    : 'border-border-subtle bg-surface-card/50 hover:border-brand-500/40',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    alert.severity === 'urgent' ? 'text-accent-rose' : 'text-accent-amber',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-xs font-semibold text-text-primary">
                    {alert.title}
                    <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="block text-[10px] text-text-muted line-clamp-2 mt-0.5">{alert.message}</span>
                </span>
              </button>
            );
          })}
        </div>
      </BlueprintSurface>
    </MotionSection>
  );
}
