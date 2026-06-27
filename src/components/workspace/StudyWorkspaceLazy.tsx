import { useEffect, useState, type ComponentProps } from 'react';
import { WorkspaceBootShell } from './WorkspaceBootShell';
import { loadStudyWorkspaceModule } from '../../lib/studyWorkspaceChunk';

type StudyWorkspaceProps = ComponentProps<
  (typeof import('./StudyWorkspace'))['StudyWorkspace']
>;

export type StudyWorkspaceLazyProps = StudyWorkspaceProps & {
  bootCompact?: boolean;
  bootLang?: 'en' | 'el';
};

/**
 * Explicit chunk loader — avoids React.lazy + Suspense getting stuck on the ~470KB workspace graph.
 */
export function StudyWorkspaceLazy({
  bootCompact = false,
  bootLang = 'en',
  ...workspaceProps
}: StudyWorkspaceLazyProps) {
  const [StudyWorkspace, setStudyWorkspace] = useState<
    (typeof import('./StudyWorkspace'))['StudyWorkspace'] | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    loadStudyWorkspaceModule()
      .then((mod) => {
        if (!cancelled) setStudyWorkspace(() => mod.StudyWorkspace);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  if (loadError) {
    return (
      <WorkspaceBootShell
        compact={bootCompact}
        onClose={workspaceProps.onClose}
        lang={bootLang}
        error={loadError}
        onRetry={() => setRetryTick((n) => n + 1)}
      />
    );
  }

  if (!StudyWorkspace) {
    return (
      <WorkspaceBootShell
        compact={bootCompact}
        onClose={workspaceProps.onClose}
        lang={bootLang}
      />
    );
  }

  return <StudyWorkspace {...workspaceProps} />;
}
