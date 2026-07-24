import { t, type Lang } from './i18n';

export type DeleteCourseCascadeInput = {
  lang: Lang;
  courseTitle: string;
  fileCount: number;
  generatedTaskCount: number;
  glossaryCount: number;
};

export type DeleteCourseCascadeCopy = {
  title: string;
  description: string;
};

export function buildDeleteCourseCascadeCopy(input: DeleteCourseCascadeInput): DeleteCourseCascadeCopy {
  const { lang, courseTitle, fileCount, generatedTaskCount, glossaryCount } = input;

  const title = t('deleteCourseTitle', lang).replace('{courseTitle}', courseTitle);

  const lines: string[] = [t('deleteCourseIntro', lang)];
  lines.push(
    t(fileCount === 1 ? 'deleteCourseFilesOne' : 'deleteCourseFilesMany', lang)
      .replace('{count}', String(fileCount)),
  );
  if (generatedTaskCount > 0) {
    lines.push(
      t(generatedTaskCount === 1 ? 'deleteCourseGeneratedTaskOne' : 'deleteCourseGeneratedTasks', lang)
        .replace('{count}', String(generatedTaskCount)),
    );
  }
  if (glossaryCount > 0) {
    lines.push(
      t(glossaryCount === 1 ? 'deleteCourseGlossaryTermOne' : 'deleteCourseGlossaryTerms', lang)
        .replace('{count}', String(glossaryCount)),
    );
  }
  lines.push(t('deleteCourseProgressNote', lang));
  lines.push('');
  lines.push(t('deleteCoursePreserved', lang));
  lines.push(t('deleteCourseCannotUndo', lang));

  return { title, description: lines.join('\n') };
}
