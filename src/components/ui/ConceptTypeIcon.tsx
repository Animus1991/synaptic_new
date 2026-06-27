import { cn } from '../../utils/cn';
import { conceptTypeIcon, type ConceptNodeType } from '../../lib/conceptTypeIcons';

type Props = {
  type: ConceptNodeType | string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizeClass = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function ConceptTypeIcon({ type, className, size = 'sm' }: Props) {
  const Icon = conceptTypeIcon(type);
  return <Icon className={cn(sizeClass[size], 'text-brand-600', className)} aria-hidden />;
}
