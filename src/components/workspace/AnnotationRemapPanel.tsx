import { MapPin, Trash2, Check, Wand2 } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { AnnotationRemapEntry } from '../../lib/annotationAnchorRemap';
import type { AnnotationRemapEdgeReport } from '../../lib/annotationRemapEdgeCasesQA';
import {
  edgeKindForAnnotation,
  remapEdgeCaseHint,
  remapEdgeCaseLabel,
} from '../../lib/annotationRemapEdgeCasesQA';

type Props = {
  entries: AnnotationRemapEntry[];
  edgeReport: AnnotationRemapEdgeReport;
  lang: 'en' | 'el';
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemap: (id: string, lineIndex: number) => void;
  onConfirmLegacy: (id: string) => void;
  onDelete: (id: string) => void;
  onAutoRemap: () => void;
  onClose: () => void;
};

export function AnnotationRemapPanel({
  entries,
  edgeReport,
  lang,
  activeId,
  onSelect,
  onRemap,
  onConfirmLegacy,
  onDelete,
  onAutoRemap,
  onClose,
}: Props) {
  const isEl = lang === 'el';

  if (entries.length === 0) return null;

  return (
    <div
      className="shrink-0 border-b border-accent-amber/25 bg-surface-card/95 max-h-[42%] overflow-y-auto"
      data-testid="annotation-remap-panel"
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-surface-card px-4 py-2">
        <p className="text-[11px] font-semibold text-accent-amber">
          {isEl ? 'Επανασύνδεση anchors' : 'Anchor remap'}
          {' · '}
          {entries.length}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            data-testid="annotation-auto-remap"
            onClick={onAutoRemap}
            className="inline-flex items-center gap-1 rounded-lg border border-accent-emerald/30 bg-accent-emerald/10 px-2 py-1 text-[10px] font-medium text-accent-emerald hover:bg-accent-emerald/15"
          >
            <Wand2 className="w-3 h-3" />
            {isEl ? 'Αυτόματο remap' : 'Auto-remap'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
          >
            {isEl ? 'Κλείσιμο' : 'Close'}
          </button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {entries.map((entry) => {
          const { annotation: ann, anchorExcerpt, candidates } = entry;
          const isActive = activeId === ann.id;
          const isLegacy = ann.anchorStatus === 'legacy';
          const currentPreview = anchorExcerpt.slice(0, 100);
          const edgeKind = edgeKindForAnnotation(edgeReport, ann.id);
          const edgeHint = edgeKind ? remapEdgeCaseHint(edgeKind, lang) : null;

          return (
            <div
              key={ann.id}
              data-testid={`annotation-remap-entry-${ann.id}`}
              className={cn(
                'rounded-xl border p-2.5 transition-colors',
                isActive ? 'border-accent-amber/40 bg-accent-amber/8' : 'border-border-subtle bg-surface-primary/40',
              )}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onSelect(ann.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3 h-3 text-accent-amber shrink-0" />
                  <span className="text-[10px] font-medium text-text-secondary capitalize">{ann.type}</span>
                  <span className="text-[9px] rounded-full border border-accent-amber/30 px-1.5 py-0.5 text-accent-amber">
                    {isLegacy
                      ? (isEl ? 'παλιό' : 'legacy')
                      : (isEl ? 'επανέλεγχο' : 'needs review')}
                  </span>
                  {edgeKind && (
                    <span
                      className="text-[9px] rounded-full border border-accent-cyan/30 px-1.5 py-0.5 text-brand-800"
                      data-testid={`annotation-remap-edge-${ann.id}`}
                    >
                      {remapEdgeCaseLabel(edgeKind, lang)}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-muted italic line-clamp-2">
                  {currentPreview || (isEl ? '(χωρίς απόσπασμα)' : '(no excerpt)')}
                </p>
                {edgeHint && (
                  <p className="mt-1 text-[9px] text-text-secondary">{edgeHint}</p>
                )}
              </button>

              {isActive && (
                <div className="mt-2 space-y-1.5">
                  {isLegacy && ann.lineStart >= 0 && (
                    <button
                      type="button"
                      data-testid={`annotation-confirm-legacy-${ann.id}`}
                      onClick={() => onConfirmLegacy(ann.id)}
                      className="flex w-full items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-1.5 text-[10px] text-brand-800 hover:bg-brand-600/15"
                    >
                      <Check className="w-3 h-3" />
                      {isEl
                        ? `Επιβεβαίωση στη γραμμή ${ann.lineStart + 1}`
                        : `Confirm at line ${ann.lineStart + 1}`}
                    </button>
                  )}

                  {candidates.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold text-text-muted">
                        {isEl ? 'Προτεινόμενες γραμμές' : 'Suggested lines'}
                      </p>
                      {candidates.map((c) => (
                        <button
                          key={`${ann.id}-${c.lineIndex}`}
                          type="button"
                          data-testid={`annotation-remap-candidate-${ann.id}-${c.lineIndex}`}
                          onClick={() => onRemap(ann.id, c.lineIndex)}
                          className={cn(
                            'flex w-full items-start gap-2 rounded-lg border px-2 py-1.5 text-left text-[10px] hover:bg-surface-hover',
                            c.confidence === 'high'
                              ? 'border-accent-emerald/30 text-accent-emerald'
                              : c.confidence === 'medium'
                                ? 'border-accent-amber/30 text-accent-amber'
                                : 'border-border-subtle text-text-muted',
                          )}
                        >
                          <span className="font-mono shrink-0">L{c.lineIndex + 1}</span>
                          <span className="line-clamp-2 text-text-secondary">{c.preview}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-accent-rose">
                      {isEl
                        ? 'Δεν βρέθηκε αντιστοιχία — διάλεξε γραμμή στο κείμενο ή διέγραψε.'
                        : 'No match found — pick a line in the source or delete.'}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => onDelete(ann.id)}
                    className="inline-flex items-center gap-1 text-[10px] text-accent-rose hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    {isEl ? 'Διαγραφή σημείωσης' : 'Delete annotation'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
