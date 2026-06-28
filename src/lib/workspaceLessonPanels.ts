import { t, type Lang } from './i18n';

export type WorkspacePanelBlock =
  | { kind: 'paragraph'; text: string; emphasis?: string }
  | { kind: 'cards'; items: { title: string; bullets: string[]; accent?: 'brand' | 'teal' | 'amber' }[] }
  | { kind: 'formula'; label: string; formula: string }
  | { kind: 'callout'; title: string; text: string; variant: 'warning' | 'tip' }
  | { kind: 'steps'; items: { label: string; content: string; success?: boolean }[] }
  | { kind: 'actions'; items: { label: string }[] }
  | { kind: 'source'; text: string };

export type WorkspacePanel = {
  badge: string;
  title: string;
  blocks: WorkspacePanelBlock[];
};

function genericPanels(concept: string, lang: Lang): WorkspacePanel[] {
    return [
    {
      badge: t('lessonBadgeCoreConcept', lang),
      title: concept,
      blocks: [
        {
          kind: 'paragraph',
          text: t('lessonTextCentralConcept', lang).replace('{concept}', concept),
        },
        { kind: 'callout', title: t('lessonTipTitle', lang), text: t('lessonTipFeynman', lang), variant: 'tip' },
      ],
    },
    {
      badge: t('lessonBadgeDeepDive', lang),
      title: t('lessonTitleMechanism', lang),
      blocks: [
        { kind: 'paragraph', text: t('lessonTextVariables', lang) },
      ],
    },
    {
      badge: t('lessonBadgePractice', lang),
      title: t('lessonTitleWorkedTask', lang),
      blocks: [
        { kind: 'paragraph', text: t('lessonTextApplyConcept', lang) },
      ],
    },
  ];
}

/** Production fallback panels — note-grounded LLM panels take priority when available. */
export function getWorkspaceLessonPanel(step: number, concept: string, lang: Lang): WorkspacePanel | null {
  const panels = genericPanels(concept, lang);
  return panels[step] ?? panels[0] ?? null;
}

export function feynmanOutlineForConcept(concept: string, lang: Lang): string[] {
  return [
    t('feynmanOutline1', lang).replace('{concept}', concept),
    t('feynmanOutline2', lang),
    t('feynmanOutline3', lang),
    t('feynmanOutline4', lang),
  ];
}

export function feynmanPlaceholderForConcept(concept: string, lang: Lang): string {
  return t('feynmanExplainPlaceholder', lang).replace('{concept}', concept);
}
