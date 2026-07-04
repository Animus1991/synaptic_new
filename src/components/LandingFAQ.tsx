import { useState } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { useI18n } from '../lib/i18n';

const FAQ_KEYS = [
  { q: 'landingFaqQ1', a: 'landingFaqA1' },
  { q: 'landingFaqQ2', a: 'landingFaqA2' },
  { q: 'landingFaqQ3', a: 'landingFaqA3' },
  { q: 'landingFaqQ4', a: 'landingFaqA4' },
  { q: 'landingFaqQ5', a: 'landingFaqA5' },
  { q: 'landingFaqQ6', a: 'landingFaqA6' },
] as const;

export function LandingFAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      className="w-full px-5 sm:px-8 md:px-10 lg:px-14 xl:px-[clamp(2rem,5vw,6rem)] 2xl:px-[clamp(2.5rem,6vw,7.5rem)] py-24 border-t border-border-subtle"
      data-testid="landing-faq"
    >
      <h2
        className="text-[1.28rem] sm:text-[1.615rem] font-bold text-text-primary mb-8"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t('landingFaqTitle')}
      </h2>
      <div className="max-w-3xl space-y-2">
        {FAQ_KEYS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="rounded-xl border border-border-subtle bg-surface-card/30 overflow-hidden"
              data-testid={`landing-faq-item-${i}`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
              >
                {t(item.q)}
                {isOpen ? <CaretUp className="w-4 h-4 shrink-0" /> : <CaretDown className="w-4 h-4 shrink-0" />}
              </button>
              {isOpen && (
                <p className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">{t(item.a)}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
