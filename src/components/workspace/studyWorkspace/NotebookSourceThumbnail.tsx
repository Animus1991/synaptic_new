import { cn } from '../../../utils/cn';
import type { UploadedFile } from '../../../types';
import { resolveSourceThumbnail } from '../../../lib/sourceThumbnail';

type Props = {
  file?: Pick<UploadedFile, 'name' | 'type' | 'ingestMethod'>;
  label?: string;
  className?: string;
};

export function NotebookSourceThumbnail({ file, label, className }: Props) {
  const visual = resolveSourceThumbnail(
    file ?? { name: label ?? 'Source', type: 'txt' },
  );
  const Icon = visual.icon;

  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle/60',
        visual.bgClass,
        className,
      )}
      aria-hidden
      data-source-kind={visual.kind}
    >
      <Icon className={cn('h-4 w-4', visual.textClass)} />
    </span>
  );
}
