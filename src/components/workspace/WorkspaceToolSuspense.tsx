import { Suspense, type ReactNode } from 'react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { workspaceToolLabel } from '../../lib/workspaceToolRegistry';

type Props = {
  tool: WorkspaceToolId | 'discover' | 'concept-bus' | 'weak-areas';
  lang: 'en' | 'el';
  children: ReactNode;
};

export function WorkspaceToolSuspense({ tool, lang, children }: Props) {
  const label = tool === 'discover' || tool === 'concept-bus' || tool === 'weak-areas'
    ? tool
    : workspaceToolLabel(tool, lang);

  return (
    <Suspense
      fallback={(
        <div
          className="flex h-full min-h-[12rem] items-center justify-center px-6 text-center text-sm text-text-muted"
          data-testid={`workspace-tool-loading-${tool}`}
          role="status"
          aria-live="polite"
        >
          {lang === 'el' ? `Φόρτωση ${label}…` : `Loading ${label}…`}
        </div>
      )}
    >
      <div className="flex h-full min-h-0 flex-col">{children}</div>
    </Suspense>
  );
}
