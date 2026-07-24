import type { LucideIcon } from '@/lib/lucide-shim';
import {
  BookOpen,
  Library,
  Brain,
  BarChart3,
  FileText,
  FlaskConical,
  GraduationCap,
  Lock,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  AlertTriangle,
  Play,
} from '@/lib/lucide-shim';

/** Semantic icon ids — use instead of emoji in UI. */
export type UiIconId =
  | 'books'
  | 'book'
  | 'target'
  | 'brain'
  | 'bolt'
  | 'strength'
  | 'chart'
  | 'search'
  | 'lock'
  | 'sparkle'
  | 'notes'
  | 'flask'
  | 'graduation'
  | 'warning'
  | 'play'
  | 'trend';

const ICONS: Record<UiIconId, LucideIcon> = {
  books: Library,
  book: BookOpen,
  target: Target,
  brain: Brain,
  bolt: Sparkles,
  strength: TrendingUp,
  chart: BarChart3,
  search: Search,
  lock: Lock,
  sparkle: Sparkles,
  notes: FileText,
  flask: FlaskConical,
  graduation: GraduationCap,
  warning: AlertTriangle,
  play: Play,
  trend: TrendingUp,
};

/** Legacy emoji stored on courses/tasks → modern icon. */
const EMOJI_FALLBACK: Record<string, UiIconId> = {
  '📚': 'books',
  '📘': 'book',
  '📖': 'book',
  '🎯': 'target',
  '🧠': 'brain',
  '⚡': 'bolt',
  '💪': 'strength',
  '📊': 'chart',
  '🔍': 'search',
  '🔒': 'lock',
  '✨': 'sparkle',
  '📝': 'notes',
  '🧪': 'flask',
  '🎓': 'graduation',
  '⚠': 'warning',
  '⚠️': 'warning',
  '▶': 'play',
  '📈': 'trend',
  '📉': 'trend',
};

export function getUiIcon(id: UiIconId): LucideIcon {
  return ICONS[id];
}

/** Resolve course/task icon field (emoji legacy or semantic id) to a Phosphor-backed component. */
export function resolveCourseIconGlyph(icon?: string | null): LucideIcon {
  if (!icon?.trim()) return Library;
  const trimmed = icon.trim();
  if (trimmed in ICONS) return ICONS[trimmed as UiIconId];
  const fromEmoji = EMOJI_FALLBACK[trimmed];
  if (fromEmoji) return ICONS[fromEmoji];
  // Heuristic: if it looks like emoji, default to books
  if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(trimmed)) return Library;
  return Library;
}

export function isEmojiIcon(icon?: string | null): boolean {
  if (!icon) return false;
  return /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(icon) || icon in EMOJI_FALLBACK;
}

/** Default icon for newly generated courses (semantic id, not emoji). */
export const DEFAULT_COURSE_ICON_ID: UiIconId = 'books';
