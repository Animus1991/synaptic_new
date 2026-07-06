import { cn } from '../../../utils/cn';
import type { UploadedFile } from '../../../types';
import { useSourceThumbnailUrl } from '../../../hooks/useSourceThumbnailUrl';
import { resolveSourceThumbnail } from '../../../lib/sourceThumbnail';

type SourceFileLike = Pick<UploadedFile, 'name' | 'type' | 'ingestMethod'> & Partial<
  Pick<UploadedFile, 'id' | 'thumbnailRef' | 'thumbnailStatus'>
>;

type Props = {
  file?: SourceFileLike;
  label?: string;
  className?: string;
};

export function NotebookSourceThumbnail({ file, label, className }: Props) {
  const previewUrl = useSourceThumbnailUrl(
    file?.id,
    file?.thumbnailRef,
    file?.thumbnailStatus,
  );

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt=""
        className={cn(
          'h-9 w-9 shrink-0 rounded-lg border border-border-subtle/60 object-cover object-top bg-surface-secondary',
          className,
        )}
        data-testid="source-thumbnail-preview"
        data-source-kind="preview"
      />
    );
  }

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
      data-testid="source-thumbnail-chip"
    >
      <Icon className={cn('h-4 w-4', visual.textClass)} />
    </span>
  );
}
