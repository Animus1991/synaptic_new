import type { I18nKey } from '../i18n';

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

export function looksLikeComputingCourse(text: string): boolean {
  const hay = text.toLowerCase();
  return /\b(cs|computer|informatics|programming|algorithm|software|coding)\b/i.test(hay)
    || /πληροφορικ|προγραμματισμ|αλγόριθμ/i.test(hay);
}

export function filterPostExamLinks(opts?: {
  category?: PostExamLink['category'];
  courseTitles?: string[];
}): PostExamLink[] {
  const { category, courseTitles = [] } = opts ?? {};
  let links = POST_EXAM_NEXT_STEPS;
  if (category) links = links.filter((l) => l.category === category);
  if (courseTitles.length > 0 && !looksLikeComputingCourse(courseTitles.join(' '))) {
    links = links.filter((l) => l.id !== 'cs-pathways');
  }
  return links;
}

export function isPostExamPhase(examDate?: string, now = Date.now()): boolean {
  if (!examDate?.trim()) return false;
  const t = new Date(examDate).getTime();
  if (Number.isNaN(t)) return false;
  return now > t;
}

export type PostExamStudyActionKind = 'review' | 'weak-area' | 'misconception' | 'workspace';

export type PostExamStudyAction = {
  id: string;
  kind: PostExamStudyActionKind;
  titleKey: I18nKey;
  concept?: string;
};

export function buildPostExamStudyActions(opts: {
  weakAreas?: { concept: string; mastery: number }[];
  misconceptions?: { id: string; concept: string; corrected?: boolean }[];
  reviewDueCount?: number;
}): PostExamStudyAction[] {
  const weakAreas = opts.weakAreas ?? [];
  const misconceptions = opts.misconceptions ?? [];
  const reviewDueCount = opts.reviewDueCount ?? 0;
  const actions: PostExamStudyAction[] = [];

  if (reviewDueCount > 0) {
    actions.push({
      id: 'review-due',
      kind: 'review',
      titleKey: 'examPrepNextStepsReviewDue',
    });
  }

  for (const area of weakAreas.filter((a) => a.concept.trim()).slice(0, 2)) {
    actions.push({
      id: `weak-${area.concept}`,
      kind: 'weak-area',
      titleKey: 'examPrepNextStepsWeakArea',
      concept: area.concept,
    });
  }

  const openMisc = misconceptions.find((m) => !m.corrected && m.concept.trim());
  if (openMisc) {
    actions.push({
      id: `misc-${openMisc.id}`,
      kind: 'misconception',
      titleKey: 'examPrepNextStepsMisconception',
      concept: openMisc.concept,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'workspace',
      kind: 'workspace',
      titleKey: 'examPrepNextStepsOpenWorkspace',
    });
  }

  return actions.slice(0, 4);
}
