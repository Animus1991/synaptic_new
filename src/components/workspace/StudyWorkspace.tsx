import { useEffect, useState, type ComponentType } from 'react';
import type { StudyWorkspaceProps } from './studyWorkspace/types';
import { WorkspaceBootShell } from './WorkspaceBootShell';
import { markWorkspaceShellPaint } from '../../lib/workspacePerf';
import { loadStudyWorkspaceBodyModule } from '../../lib/studyWorkspaceBodyChunk';

export type { StudyWorkspaceProps } from './studyWorkspace/types';

/**
 * Thin shell — paints immediately; heavy body (useStudyWorkspace graph) loads in a second chunk.
 */
export function StudyWorkspace(props: StudyWorkspaceProps) {
  const [Body, setBody] = useState<ComponentType<StudyWorkspaceProps> | null>(null);
  const lang = props.userSettings?.language === 'el' ? 'el' : 'en';

  useEffect(() => {
    markWorkspaceShellPaint();
    let cancelled = false;
    loadStudyWorkspaceBodyModule()
      .then((mod) => {
        if (!cancelled) setBody(() => mod.StudyWorkspaceBody);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Body) {
    return (
      <WorkspaceBootShell
        compact={props.agentSplit}
        onClose={props.onClose}
        lang={lang}
      />
    );
  }

  return <Body {...props} />;
}
