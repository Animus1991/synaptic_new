import { cn } from '../utils/cn';
import { useI18n } from '../lib/i18n';

const STEPS = ['agentFlowDescribe', 'agentFlowGround', 'agentFlowReview'] as const;

/** Decorative Describe → Ground → Review rail above Agent chat (Wave R4). */
export function AgentFlowRail({ className, activeIndex = 0 }: { className?: string; activeIndex?: number }) {
  const { t } = useI18n();

  return (
    <div
      className={cn('agent-flow-rail', className)}
      data-testid="agent-flow-rail"
      aria-hidden
    >
      {STEPS.map((key, index) => (
        <span
          key={key}
          className={cn(
            'agent-flow-rail-step',
            index === activeIndex && 'agent-flow-rail-step-active',
            index < activeIndex && 'agent-flow-rail-step-done',
          )}
        >
          {t(key)}
        </span>
      ))}
    </div>
  );
}
