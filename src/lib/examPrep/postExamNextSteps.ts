export type PostExamLink = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  url: string;
  category: 'university' | 'orientation' | 'career' | 'resources';
};

export const POST_EXAM_NEXT_STEPS: PostExamLink[] = [
  {
    id: 'schools-portal',
    titleKey: 'examPrepNextStepsSchoolsPortal',
    descriptionKey: 'examPrepNextStepsSchoolsPortalDesc',
    url: 'https://www.minedu.gov.gr/',
    category: 'university',
  },
  {
    id: 'career-orientation',
    titleKey: 'examPrepNextStepsOrientation',
    descriptionKey: 'examPrepNextStepsOrientationDesc',
    url: 'https://europass.europa.eu/',
    category: 'orientation',
  },
  {
    id: 'cs-pathways',
    titleKey: 'examPrepNextStepsCsPathways',
    descriptionKey: 'examPrepNextStepsCsPathwaysDesc',
    url: 'https://www.acm.org/',
    category: 'career',
  },
  {
    id: 'scholarships',
    titleKey: 'examPrepNextStepsScholarships',
    descriptionKey: 'examPrepNextStepsScholarshipsDesc',
    url: 'https://www.studyineurope.eu/',
    category: 'resources',
  },
];

export function filterPostExamLinks(category?: PostExamLink['category']): PostExamLink[] {
  if (!category) return POST_EXAM_NEXT_STEPS;
  return POST_EXAM_NEXT_STEPS.filter((l) => l.category === category);
}

export function isPostExamPhase(examDate?: string, now = Date.now()): boolean {
  if (!examDate?.trim()) return false;
  const t = new Date(examDate).getTime();
  if (Number.isNaN(t)) return false;
  return now > t;
}
