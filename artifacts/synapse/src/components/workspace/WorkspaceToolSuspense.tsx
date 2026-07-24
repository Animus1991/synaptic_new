import { Suspense, type ReactNode } from 'react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import type { Lang } from '../../lib/i18n';
import { WorkspaceToolSkeleton } from './WorkspaceToolSkeleton';

type Props = {
  tool: WorkspaceToolId | 'discover' | 'concept-bus' | 'weak-areas';
  lang: Lang;
  children: ReactNode;
};

export function WorkspaceToolSuspense({ tool, lang, children }: Props) {
  return (
    <Suspense
      fallback={<WorkspaceToolSkeleton tool={tool} lang={lang} />}
    >
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </Suspense>
  );
}
