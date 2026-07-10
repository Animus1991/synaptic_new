import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

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
      {eyebrow ? <p className="ux-semi-mono-eyebrow ux-modal-eyebrow">{eyebrow}</p> : null}
      <h2 id={titleId} className={cn('ux-modal-title text-lg font-bold text-text-primary', titleClassName)}>
        {title}
      </h2>
      {subtitle ? (
        <p id={subtitleId} className="ux-modal-subtitle text-sm text-text-secondary mt-0.5">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
