import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { AllCapsLabel } from './AllCapsLabel';
type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  className?: string;
  titleClassName?: string;
  titleId?: string;
  subtitleId?: string;
};

/** Replit-style modal header — eyebrow → title → subtitle (Wave R7). */
export function ModalHeaderStack({
  eyebrow,
  title,
  subtitle,
  className,
  titleClassName,
  titleId,
  subtitleId,
}: Props) {
  return (
    <div className={cn('ux-modal-header-stack', className)}>
      {eyebrow ? <p className="ux-semi-mono-eyebrow ux-modal-eyebrow"><AllCapsLabel>{eyebrow}</AllCapsLabel></p> : null}
      <h2
        id={titleId}
        className={cn(
          /* OPT-K95 — same calm title weight on every theme (Minimal clarity) */
          'ux-modal-title text-base font-semibold text-text-primary leading-snug',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          id={subtitleId}
          className={cn(
            'ux-modal-subtitle text-text-secondary mt-0.5 type-body leading-relaxed',
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
