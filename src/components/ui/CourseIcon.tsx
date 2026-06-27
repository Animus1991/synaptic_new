import { cn } from '../../utils/cn';
import { resolveCourseIconGlyph, getUiIcon, type UiIconId } from '../../lib/uiIconRegistry';

type Props = {
  icon?: string | null;
  /** Explicit semantic id when icon field is absent. */
  iconId?: UiIconId;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  colorClassName?: string;
};

const sizeClass = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-9 w-9',
};

/** Renders course/task icons with Phosphor (via lucide-shim) — never raw emoji in UI. */
export function CourseIcon({ icon, iconId, className, size = 'md', colorClassName = 'text-brand-600' }: Props) {
  const Icon = iconId ? getUiIcon(iconId) : resolveCourseIconGlyph(icon);
  return (
    <Icon
      className={cn(sizeClass[size], colorClassName, className)}
      aria-hidden
    />
  );
}
