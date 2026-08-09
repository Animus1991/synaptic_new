import { ArrowRight, Brain, ChatCircle, Warning as AlertTriangle } from '@phosphor-icons/react';
import type { ProactiveAgentAlert } from '../../lib/proactiveAgentAlerts';
import { useI18n } from '../../lib/i18n';
import { MotionSection } from '../ui/MotionSection';
import { CollapsibleChromeSection } from '../workspace/CollapsibleChromeSection';
import { cn } from '../../utils/cn';

type Props = {
  alerts: ProactiveAgentAlert[];
  onRun: (alert: ProactiveAgentAlert) => void;
};

const KIND_ICON = {
  'forgetting-risk': Brain,
  'quiz-fail-streak': AlertTriangle,
  misconception: AlertTriangle,
  'daily-checkin': ChatCircle,
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
      <CollapsibleChromeSection
        title={t('chromeAlerts')}
        alwaysCollapse
        meta={alerts.length}
        data-testid="proactive-alerts-chrome"
      >
        {/* OPT-K103 — soft nested stack (no amber wash card); all alerts still reachable */}
        <div className="ux-soft-alert-stack space-y-2 px-1 pb-2" data-testid="proactive-alerts-stack">
          <div className="flex items-center gap-2 px-0.5">
            <AlertTriangle className="w-4 h-4 text-text-secondary" weight="regular" />
            <p className="type-meta font-semibold text-text-primary">{t('proactiveAlertStripTitle')}</p>
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
                    /* OPT-K111 — interactive row: wash + hover, no outline cage */
                    'ux-proactive-alert-item ux-soft-alert-row group flex items-start gap-3 border-0 px-1 py-2 text-left transition-colors',
                    'rounded-md bg-transparent hover:bg-surface-secondary/70',
                    alert.severity === 'urgent' && 'dashboard-urgency-signal',
                  )}
                  data-tone={alert.severity === 'urgent' ? 'forget' : 'quiz'}
                >
                  <Icon
                    className="w-4 h-4 mt-0.5 shrink-0 text-text-secondary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 type-caption font-semibold text-text-primary">
                      {alert.title}
                      <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    <span className="block type-micro text-text-muted line-clamp-2 mt-0.5">{alert.message}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CollapsibleChromeSection>
    </MotionSection>
  );
}
