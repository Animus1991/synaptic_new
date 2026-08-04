import type { OrgAnalytics } from '../lib/orgClient';
import { cn } from '../utils/cn';

type Props = {
  analytics: OrgAnalytics;
  lang: 'en' | 'el';
};

function adoptionColor(level: number): string {
  if (level <= 0) return 'bg-surface-primary';
  if (level < 0.34) return 'bg-accent-violet/35';
  if (level < 0.67) return 'bg-accent-violet/55';
  return 'bg-accent-violet/80';
}

export function CohortNotebookLmHeatmap({ analytics, lang }: Props) {
  const heatmaps = analytics.notebooklmBridgeHeatmap ?? [];
  if (heatmaps.length === 0) return null;

  const el = lang === 'el';
  const title = el ? 'NotebookLM bridge β€” cohort' : 'NotebookLM bridge β€” cohort';

  return (
    <div className="space-y-3 pt-3 border-t border-border-subtle/50" data-testid="notebooklm-cohort-heatmap">
      <div>
        <p className="text-xs font-medium text-text-primary">{title}</p>
        <p className="type-micro text-text-muted mt-0.5">
          {el
            ? 'Ξ•ΞΉΟƒΞ±Ξ³Ο‰Ξ³Ξ­Ο‚ NLM Ξ±Ξ½Ξ¬ ΞΌΞ±ΞΈΞ·Ο„Ξ® (synced library).'
            : 'NLM imports per student (synced library).'}
        </p>
      </div>
      {heatmaps.map((hm) => (
        <div key={hm.classId} className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="type-micro text-text-muted truncate">{hm.className}</p>
            <p className="type-micro text-text-secondary">
              {hm.studentsWithImports}/{hm.students.length}
              {el ? ' ΞΌΞµ NLM' : ' with NLM'}
              {' Β· '}
              {hm.totalImports} {el ? 'Ξ±ΟΟ‡ΞµΞ―Ξ±' : 'files'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {hm.students.map((student) => {
              const tip = student.totalCount > 0
                ? `${student.studentLabel}: ${student.importCount} import Β· ${student.chatCount} chat Β· ${student.audioCount} audio`
                : `${student.studentLabel}: β€”`;
              return (
                <div
                  key={student.enrollmentId}
                  title={tip}
                  className={cn(
                    'min-w-[2.75rem] max-w-[5rem] rounded-sm border border-border-subtle/40 px-1 py-0.5',
                    adoptionColor(student.adoptionLevel),
                  )}
                  data-testid={`nlm-cohort-cell-${student.enrollmentId}`}
                >
                  <p className="text-[7px] text-text-primary truncate leading-tight">
                    {student.studentLabel}
                  </p>
                  <p className="type-micro font-bold text-text-primary text-center">
                    {student.totalCount > 0 ? student.totalCount : 'β€”'}
                  </p>
                </div>
              );
            })}
          </div>
          {(hm.artifactTotals.import + hm.artifactTotals.chat + hm.artifactTotals.audio) > 0 && (
            <p className="type-micro text-text-muted">
              {el ? 'Ξ£ΟΞ½ΞΏΞ»ΞΏ' : 'Totals'}:
              {' '}
              {hm.artifactTotals.import} {el ? 'ΞµΞΉΟƒΞ±Ξ³Ο‰Ξ³Ξ­Ο‚' : 'imports'}
              {' Β· '}
              {hm.artifactTotals.chat} chat
              {' Β· '}
              {hm.artifactTotals.audio} audio
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
