import { useState } from 'react';
import { Pencil, Check, X } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { OcrOverlayRegion } from '../../lib/readerOcrOverlay';
import { isLowConfidenceRegion } from '../../lib/readerOcrOverlay';
import { loadOcrCorrections, saveOcrCorrection } from '../../lib/readerOcrCorrectionStore';

type Props = {
  regions: OcrOverlayRegion[];
  scopeKey: string;
  lang?: 'en' | 'el';
  onApplied?: () => void;
};

export function OcrCorrectionPanel({ regions, scopeKey, lang = 'en', onApplied }: Props) {
  const lowConf = regions.filter((r) => isLowConfidenceRegion(r.confidence));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const saved = loadOcrCorrections(scopeKey);

  if (lowConf.length === 0) return null;

  const startEdit = (region: OcrOverlayRegion, blockIndex: number) => {
    const existing = saved.find((c) => c.blockIndex === blockIndex);
    setEditingId(region.id);
    setDraft(existing?.correctedText ?? region.text);
  };

  const commit = (region: OcrOverlayRegion, blockIndex: number) => {
    const corrected = draft.trim();
    if (!corrected) return;
    saveOcrCorrection({
      id: `ocr-fix-${scopeKey}-${blockIndex}`,
      scopeKey,
      blockIndex,
      originalText: region.text,
      correctedText: corrected,
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
    onApplied?.();
  };

  return (
    <div
      className="shrink-0 border-b border-accent-amber/20 bg-accent-amber/5 px-3 py-2"
      data-testid="reader-ocr-correction-panel"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-amber mb-1.5">
        {lang === 'el' ? 'Διόρθωση OCR (τοπικά)' : 'OCR line correction (local)'}
      </p>
      <ul className="space-y-1.5 max-h-28 overflow-y-auto">
        {lowConf.map((region, blockIndex) => {
          const isEditing = editingId === region.id;
          const fixed = saved.find((c) => c.blockIndex === blockIndex);
          return (
            <li
              key={region.id}
              className="rounded-lg border border-white/10 bg-surface-card/80 px-2 py-1.5 text-[10px]"
            >
              {!isEditing ? (
                <div className="flex items-start gap-2">
                  <span className="flex-1 text-text-secondary line-clamp-2">
                    {fixed?.correctedText ?? region.text}
                    {fixed && (
                      <span className="ml-1 text-accent-emerald">({lang === 'el' ? 'διορθ.' : 'fixed'})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    data-testid={`reader-ocr-edit-${blockIndex}`}
                    onClick={() => startEdit(region, blockIndex)}
                    className="shrink-0 rounded p-1 text-text-muted hover:text-accent-amber"
                    title={lang === 'el' ? 'Επεξεργασία γραμμής' : 'Edit line'}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    className={cn(
                      'w-full rounded border border-white/15 bg-surface-primary px-2 py-1 text-[10px] text-text-primary',
                    )}
                    data-testid={`reader-ocr-edit-input-${blockIndex}`}
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded p-1 text-text-muted hover:text-text-primary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => commit(region, blockIndex)}
                      className="rounded p-1 text-accent-emerald hover:text-accent-emerald/80"
                      data-testid={`reader-ocr-save-${blockIndex}`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
