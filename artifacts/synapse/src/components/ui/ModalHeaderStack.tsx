import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { AllCapsLabel } from './AllCapsLabel';
import { useMinimalTheme } from '../../lib/useMinimalTheme';

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
  const isMinimal = useMinimalTheme();
  return (
    <div className={cn('ux-modal-header-stack', className)}>
      {eyebrow ? <p className="ux-semi-mono-eyebrow ux-modal-eyebrow"><AllCapsLabel>{eyebrow}</AllCapsLabel></p> : null}
      <h2
        id={titleId}
        className={cn(
          'ux-modal-title text-text-primary',
          isMinimal ? 'text-base font-semibold' : 'text-lg font-bold',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          id={subtitleId}
          className={cn(
            'ux-modal-subtitle text-text-secondary mt-0.5',
            isMinimal ? 'text-sm leading-relaxed' : 'text-sm',
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
