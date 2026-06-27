import { cn } from '../../utils/cn';
import { getUiIcon, type UiIconId } from '../../lib/uiIconRegistry';

type Props = {
  id: UiIconId;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizeClass = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function UiIcon({ id, className, size = 'sm' }: Props) {
  const Icon = getUiIcon(id);
  return <Icon className={cn(sizeClass[size], className)} aria-hidden />;
}
