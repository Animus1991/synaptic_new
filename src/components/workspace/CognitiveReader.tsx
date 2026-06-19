import { useState } from 'react';
import { Sparkles, Type } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';

export const READER_SAMPLE_TEXT = `In oligopoly theory, firms interact strategically because each firm's profit depends on rivals' choices. The Cournot model assumes firms compete on quantity: each chooses output simultaneously, and the market price clears total supply against demand.

The Bertrand model instead assumes price competition. With homogeneous products, any firm charging above marginal cost loses all customers to a slightly cheaper rival. This yields the famous Bertrand Paradox: two firms are enough to drive price down to marginal cost, mimicking perfect competition.

Real markets often deviate from these extremes. Product differentiation, capacity constraints, search frictions, and repeated interaction can restore market power even under Bertrand-style price setting. Understanding which assumption binds in a given industry is central to predicting equilibrium outcomes and welfare effects.`;

interface Props {
  text?: string;
  complexityThreshold?: number;
}

export function CognitiveReader({ text = READER_SAMPLE_TEXT, complexityThreshold = 25 }: Props) {
  const { t } = useI18n();
  const [bionic, setBionic] = useState(false);
  const [highlightComplexity, setHighlightComplexity] = useState(false);

  const renderBionic = (word: string) => {
    if (word.length <= 1) return <strong className="font-bold">{word}</strong>;
    const mid = Math.ceil(word.length / 2);
    return (
      <span>
        <strong className="font-bold">{word.slice(0, mid)}</strong>
        <span className="opacity-80">{word.slice(mid)}</span>
      </span>
    );
  };

  const paragraphs = text.split('\n\n').filter((p) => p.trim());

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold">
          <Type className="w-3.5 h-3.5 text-brand-400" />
          {t('cognitiveReader')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBionic(!bionic)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all',
              bionic ? 'border-brand-500/30 bg-brand-600/20 text-brand-300' : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
          >
            {t('bionic')}
          </button>
          <button
            onClick={() => setHighlightComplexity(!highlightComplexity)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-all',
              highlightComplexity ? 'border-accent-amber/30 bg-accent-amber/20 text-accent-amber' : 'border-transparent text-text-muted hover:text-text-secondary',
            )}
          >
            {t('heatmap')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-primary/40 p-6">
        <div className="mx-auto max-w-xl space-y-4">
          {paragraphs.map((p, i) => {
            const words = p.split(' ');
            const isComplex = words.length > complexityThreshold;
            return (
              <p
                key={i}
                className={cn(
                  'rounded-lg p-2 text-sm leading-relaxed transition-colors duration-500',
                  highlightComplexity
                    ? isComplex ? 'border-l-2 border-accent-rose bg-accent-rose/10 text-text-primary' : 'text-text-tertiary'
                    : 'text-text-secondary',
                )}
              >
                {words.map((w, j) => (
                  <span key={j}>
                    {bionic ? renderBionic(w) : w}
                    {j < words.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            );
          })}
        </div>
        {highlightComplexity && (
          <div className="mx-auto mt-6 flex max-w-xl items-start gap-2 rounded-lg border border-accent-rose/20 bg-accent-rose/5 p-3 text-xs text-accent-rose">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Highlighted paragraphs contain dense terminology — break them down or open the Concept Map.</span>
          </div>
        )}
      </div>
    </div>
  );
}
