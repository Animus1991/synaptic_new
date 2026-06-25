import type { GeneratedOutline } from './courseGenerator';

/** Apply user-edited module titles onto a generated outline before course build. */
export function applyEditedTopicTitles(
  outline: GeneratedOutline,
  editedTitles: string[],
): GeneratedOutline {
  if (editedTitles.length === 0) return outline;
  const topics = outline.topics.map((topic, index) => {
    const nextTitle = editedTitles[index]?.trim();
    if (!nextTitle || nextTitle === topic.title) return topic;
    return { ...topic, title: nextTitle };
  });
  return { ...outline, topics };
}

/** True when any topic title differs from the preview outline. */
export function outlineTopicsWereEdited(
  outline: GeneratedOutline,
  editedTitles: string[],
): boolean {
  return editedTitles.some((title, i) => {
    const base = outline.topics[i]?.title ?? '';
    return title.trim() !== '' && title.trim() !== base;
  });
}
