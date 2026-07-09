import { useCallback, useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { useI18n } from '../lib/i18n';
import type { ProductTourStep } from '../lib/productTour';
import { cn } from '../utils/cn';
import { BlueprintSurface } from './ui/BlueprintSurface';

interface ProductTourProps {
  step: ProductTourStep | null;
  stepIndex: number;
  totalSteps: number;
  ready: boolean;
  onNext: () => void;
  onSkip: () => void;
}

function tooltipStyle(rect: DOMRect | null, centered: boolean): CSSProperties {
  if (centered || !rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 'min(22rem, calc(100vw - 2rem))',
    };
  }

  const margin = 12;
  const cardHeight = 180;
  const below = rect.bottom + margin + cardHeight < window.innerHeight;
  const top = below ? rect.bottom + margin : rect.top - margin - cardHeight;
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - 176),
    window.innerWidth - 352 - margin,
  );

  return {
    top: Math.max(margin, top),
    left: Math.max(margin, left),
    maxWidth: 'min(22rem, calc(100vw - 2rem))',
  };
}

function findTourTarget(target?: string | string[]): Element | null {
  if (!target) return null;
  const keys = Array.isArray(target) ? target : [target];
  for (const key of keys) {
    const el = document.querySelector(`[data-tour="${key}"]`);
    if (el) return el;
  }
  return null;
}

export function ProductTour({ step, stepIndex, totalSteps, ready, onNext, onSkip }: ProductTourProps) {
  const { t } = useI18n();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = findTourTarget(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step?.target]);

  useLayoutEffect(() => {
    if (!step || !ready) return;
    updateRect();
    const frame = requestAnimationFrame(updateRect);
    return () => cancelAnimationFrame(frame);
  }, [step, ready, stepIndex, updateRect]);

  useLayoutEffect(() => {
    if (!step || !ready) return;
    const onChange = () => updateRect();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [step, ready, updateRect]);

  if (!step || !ready) return null;

  const centered = !step.target;
  const isLast = stepIndex >= totalSteps - 1;
  const style = tooltipStyle(rect, centered);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000]"
      data-testid="product-tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
    >
      {centered ? (
        <button
          type="button"
          className="absolute inset-0 bg-black/65"
          aria-label={t('close')}
          onClick={onSkip}
        />
      ) : rect ? (
        <>
          <div className="absolute inset-0 bg-black/65 pointer-events-none" aria-hidden />
          <div
            className="absolute rounded-xl pointer-events-none ring-2 ring-brand-500/90"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            }}
            data-testid="product-tour-spotlight"
          />
        </>
      ) : (
        <button
          type="button"
          className="absolute inset-0 bg-black/65"
          aria-label={t('close')}
          onClick={onSkip}
        />
      )}

      <BlueprintSurface
        className={cn(
          'fixed z-[10001] border border-border-subtle shadow-2xl p-4',
          centered && 'w-[min(22rem,calc(100vw-2rem))]',
        )}
        style={style}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="type-caption text-text-tertiary">
            {t('tourStepOf')
              .replace('{current}', String(stepIndex + 1))
              .replace('{total}', String(totalSteps))}
          </p>
          <button
            type="button"
            onClick={onSkip}
            className="p-1 rounded-lg hover:bg-surface-hover text-text-tertiary"
            aria-label={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h2 id="product-tour-title" className="type-title text-text-primary mb-2">
          {t(step.titleKey)}
        </h2>
        <p className="type-body-sm text-text-secondary mb-4">{t(step.bodyKey)}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="type-body-sm text-text-tertiary hover:text-text-secondary px-2 py-1.5"
          >
            {t('tourSkip')}
          </button>
          <button
            type="button"
            onClick={onNext}
            data-testid="product-tour-next"
            className="px-4 py-2 rounded-xl bg-brand-600 text-white type-body-sm font-semibold hover:bg-brand-500 transition-colors"
          >
            {isLast ? t('tourFinish') : t('next')}
          </button>
        </div>
      </BlueprintSurface>
    </div>,
    document.body,
  );
}
