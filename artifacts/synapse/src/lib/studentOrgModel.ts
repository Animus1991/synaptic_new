export type StudentAssignmentStatus = 'graded' | 'submitted' | 'pending' | 'overdue';

export function assignmentStatusLabel(status: StudentAssignmentStatus, lang: 'en' | 'el'): string {
  const labels: Record<StudentAssignmentStatus, { en: string; el: string }> = {
    graded: { en: 'Graded', el: 'Βαθμολογήθηκε' },
    submitted: { en: 'Submitted', el: 'Υποβλήθηκε' },
    pending: { en: 'Pending', el: 'Εκκρεμεί' },
    overdue: { en: 'Overdue', el: 'Εκπρόθεσμο' },
  };
  return labels[status][lang];
}

export function assignmentStatusTone(
  status: StudentAssignmentStatus,
): 'positive' | 'warning' | 'neutral' | 'negative' {
  if (status === 'graded') return 'positive';
  if (status === 'overdue') return 'negative';
  if (status === 'submitted') return 'neutral';
  return 'warning';
}
