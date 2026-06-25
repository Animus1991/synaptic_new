/** When to show a low source-quality recovery banner in Workspace / CourseView. */
export const LOW_SOURCE_QUALITY_THRESHOLD = 50;

export function isLowSourceQuality(score: number | undefined | null): boolean {
  return typeof score === 'number' && score >= 0 && score < LOW_SOURCE_QUALITY_THRESHOLD;
}

export function lowSourceQualityMessage(lang: 'en' | 'el', score: number): string {
  if (lang === 'el') {
    return `Η ποιότητα πηγής είναι χαμηλή (${score}/100) — πιθανό πρόβλημα OCR ή παλαιό pipeline. Επανεπεξεργασία κειμένου ή νέο ανέβασμα βελτιώνει τον Reader και τις αναφορές Agent.`;
  }
  return `Source quality is low (${score}/100) — likely OCR noise or an older pipeline. Reprocess stored text or re-upload to improve Reader and Agent grounding.`;
}
