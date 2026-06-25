/**
 * Copy for destructive file-delete confirmation — explains cascade impact (§11).
 */

export type DeleteFileCascadeInput = {
  lang: 'en' | 'el';
  fileName: string;
  courseTitle?: string;
  remainingFilesForCourse: number;
  generatedTaskCount: number;
  glossaryCount: number;
};

export type DeleteFileCascadeCopy = {
  title: string;
  description: string;
};

export function buildDeleteFileCascadeCopy(input: DeleteFileCascadeInput): DeleteFileCascadeCopy {
  const {
    lang,
    fileName,
    courseTitle,
    remainingFilesForCourse,
    generatedTaskCount,
    glossaryCount,
  } = input;
  const isLast = remainingFilesForCourse === 0;
  const el = lang === 'el';

  const title = el ? `Αφαίρεση «${fileName}»;` : `Remove "${fileName}"?`;

  const lines: string[] = [];

  if (el) {
    lines.push('Θα αφαιρεθεί μόνιμα από αυτή τη συσκευή:');
    lines.push('• Το αρχείο και το αποθηκευμένο εξαγόμενο κείμενο');
    lines.push('• Οι συνδέσεις έννοιας→πηγή που βασίζονται σε αυτό το αρχείο');
    if (isLast) {
      lines.push(`• ${generatedTaskCount} αυτόματες εργασίες του μαθήματος${courseTitle ? ` «${courseTitle}»` : ''}`);
      if (glossaryCount > 0) lines.push(`• ${glossaryCount} όροι γλωσσαρίου του μαθήματος`);
      lines.push('• Η πρόοδος σε αυτές τις εργασίες (δεν αναιρείται)');
    } else {
      lines.push(`• Το μάθημα θα επανεπεξεργαστεί από τα ${remainingFilesForCourse} υπόλοιπα αρχεία`);
      lines.push('• Κουίζ, κάρτες και προσομοιώσεις μπορεί να σημειωθούν ως παρωχημένα');
    }
    lines.push('');
    lines.push('Διατηρούνται: σημειώσεις scratchpad, whiteboard, χρονόμετρο — ενδέχεται να χρειάζονται επανέλεγχο.');
    lines.push('Η ενέργεια δεν αναιρείται.');
  } else {
    lines.push('This permanently removes from this device:');
    lines.push('• The file and its stored extracted text');
    lines.push('• Concept→source links tied to this file');
    if (isLast) {
      lines.push(`• ${generatedTaskCount} auto-generated task${generatedTaskCount === 1 ? '' : 's'} for${courseTitle ? ` "${courseTitle}"` : ' this course'}`);
      if (glossaryCount > 0) lines.push(`• ${glossaryCount} glossary term${glossaryCount === 1 ? '' : 's'} for this course`);
      lines.push('• Progress on those generated tasks (not restored)');
    } else {
      lines.push(`• The course will be reprocessed from the ${remainingFilesForCourse} remaining file${remainingFilesForCourse === 1 ? '' : 's'}`);
      lines.push('• Quizzes, flashcards, and simulators may be flagged as outdated');
    }
    lines.push('');
    lines.push('Preserved: scratchpad, whiteboard, and timer data — may need review after removal.');
    lines.push('This cannot be undone.');
  }

  return { title, description: lines.join('\n') };
}
