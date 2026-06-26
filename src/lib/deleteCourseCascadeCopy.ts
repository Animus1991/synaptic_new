export type DeleteCourseCascadeInput = {
  lang: 'en' | 'el';
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
  const el = lang === 'el';

  const title = el ? `Διαγραφή μαθήματος «${courseTitle}»;` : `Delete course "${courseTitle}"?`;

  const lines: string[] = [];
  if (el) {
    lines.push('Θα αφαιρεθεί μόνιμα από αυτή τη συσκευή:');
    lines.push(`• Το μάθημα και ${fileCount} αρχεί${fileCount === 1 ? 'ο' : 'α'} πηγής`);
    if (generatedTaskCount > 0) lines.push(`• ${generatedTaskCount} αυτόματες εργασίες`);
    if (glossaryCount > 0) lines.push(`• ${glossaryCount} όροι γλωσσαρίου`);
    lines.push('• Η πρόοδος σε αυτές τις εργασίες (δεν αναιρείται)');
    lines.push('');
    lines.push('Διατηρούνται: scratchpad, whiteboard, χρονόμετρο — ενδέχεται να χρειάζονται επανέλεγχο.');
    lines.push('Η ενέργεια δεν αναιρείται.');
  } else {
    lines.push('This permanently removes from this device:');
    lines.push(`• The course and ${fileCount} source file${fileCount === 1 ? '' : 's'}`);
    if (generatedTaskCount > 0) lines.push(`• ${generatedTaskCount} auto-generated task${generatedTaskCount === 1 ? '' : 's'}`);
    if (glossaryCount > 0) lines.push(`• ${glossaryCount} glossary term${glossaryCount === 1 ? '' : 's'}`);
    lines.push('• Progress on those generated tasks (not restored)');
    lines.push('');
    lines.push('Preserved: scratchpad, whiteboard, and timer data — may need review after deletion.');
    lines.push('This cannot be undone.');
  }

  return { title, description: lines.join('\n') };
}
