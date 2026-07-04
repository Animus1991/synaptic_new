export type ExamCalendarEntry = {
  id: string;
  date: string;
  titleKey: string;
  bodyKey: string;
  linkUrl?: string;
  linkLabelKey?: string;
  preset?: 'general' | 'panhellenic-informatics';
};

/** Static editorial feed — original Synapse copy, not scraped from third parties. */
export const EXAM_CALENDAR_FEED: ExamCalendarEntry[] = [
  {
    id: 'exam-registration-window',
    date: '2026-03-01',
    titleKey: 'examCalendarRegistrationTitle',
    bodyKey: 'examCalendarRegistrationBody',
    linkUrl: 'https://www.minedu.gov.gr/',
    linkLabelKey: 'examCalendarMineduLink',
    preset: 'general',
  },
  {
    id: 'exam-period-may',
    date: '2026-05-15',
    titleKey: 'examCalendarPeriodTitle',
    bodyKey: 'examCalendarPeriodBody',
    preset: 'general',
  },
  {
    id: 'informatics-panhellenic',
    date: '2026-06-12',
    titleKey: 'examCalendarInformaticsTitle',
    bodyKey: 'examCalendarInformaticsBody',
    linkUrl: 'https://www.minedu.gov.gr/',
    linkLabelKey: 'examCalendarMineduLink',
    preset: 'panhellenic-informatics',
  },
  {
    id: 'results-july',
    date: '2026-07-10',
    titleKey: 'examCalendarResultsTitle',
    bodyKey: 'examCalendarResultsBody',
    preset: 'general',
  },
];

export function filterExamCalendar(
  entries: ExamCalendarEntry[],
  preset: 'all' | 'general' | 'panhellenic-informatics' = 'all',
  now = Date.now(),
): ExamCalendarEntry[] {
  const filtered =
    preset === 'all' ? entries : entries.filter((e) => !e.preset || e.preset === preset || e.preset === 'general');
  return [...filtered]
    .filter((e) => {
      const t = new Date(e.date).getTime();
      return !Number.isNaN(t) && t >= now - 86_400_000 * 30;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function upcomingExamCalendarCount(entries: ExamCalendarEntry[], now = Date.now()): number {
  return filterExamCalendar(entries, 'all', now).filter((e) => new Date(e.date).getTime() >= now).length;
}
