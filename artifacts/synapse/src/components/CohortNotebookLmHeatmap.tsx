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
  const title = el ? 'NotebookLM bridge — cohort' : 'NotebookLM bridge — cohort';

  return (
    <div className="space-y-3 pt-3 border-t border-border-subtle/50" data-testid="notebooklm-cohort-heatmap">
      <div>
        <p className="text-xs font-medium text-text-primary">{title}</p>
        <p className="text-[10px] text-text-muted mt-0.5">
          {el
            ? 'Εισαγωγές NLM ανά μαθητή (synced library).'
            : 'NLM imports per student (synced library).'}
        </p>
      </div>
      {heatmaps.map((hm) => (
        <div key={hm.classId} className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-text-muted truncate">{hm.className}</p>
            <p className="text-[10px] text-text-secondary">
              {hm.studentsWithImports}/{hm.students.length}
              {el ? ' με NLM' : ' with NLM'}
              {' · '}
              {hm.totalImports} {el ? 'αρχεία' : 'files'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {hm.students.map((student) => {
              const tip = student.totalCount > 0
                ? `${student.studentLabel}: ${student.importCount} import · ${student.chatCount} chat · ${student.audioCount} audio`
                : `${student.studentLabel}: —`;
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
                  <p className="text-[10px] font-bold text-text-primary text-center">
                    {student.totalCount > 0 ? student.totalCount : '—'}
                  </p>
                </div>
              );
            })}
          </div>
          {(hm.artifactTotals.import + hm.artifactTotals.chat + hm.artifactTotals.audio) > 0 && (
            <p className="text-[10px] text-text-muted">
              {el ? 'Σύνολο' : 'Totals'}:
              {' '}
              {hm.artifactTotals.import} {el ? 'εισαγωγές' : 'imports'}
              {' · '}
              {hm.artifactTotals.chat} chat
              {' · '}
              {hm.artifactTotals.audio} audio
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
