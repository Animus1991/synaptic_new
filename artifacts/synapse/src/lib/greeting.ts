import type { Lang } from './i18n';

export function greetingForTime(lang: Lang, now = new Date()): string {
  const hour = now.getHours();
  if (lang === 'el') {
    if (hour < 12) return 'Καλημέρα';
    if (hour < 18) return 'Καλό απόγευμα';
    return 'Καλό βράδυ';
  }
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function dashboardSubtitle(
  lang: Lang,
  criticalTaskCount: number,
  streak: number,
): string {
  if (lang === 'el') {
    if (criticalTaskCount > 0) {
      return `Έχεις ${criticalTaskCount} προτεραιότητας σήμερα — κράτα το streak ${streak} ημερών!`;
    }
    return 'Όλα εντάξει — συνέχισε με ορμή!';
  }
  if (criticalTaskCount > 0) {
    return `You have ${criticalTaskCount} priority tasks today. Let's keep that ${streak}-day streak going!`;
  }
  return 'All caught up — keep building momentum!';
}
