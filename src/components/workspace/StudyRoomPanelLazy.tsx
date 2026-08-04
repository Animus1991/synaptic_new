import { lazy, Suspense, type ComponentProps } from 'react';

const StudyRoomPanel = lazy(() =>
  import('./StudyRoomPanel').then((m) => ({ default: m.StudyRoomPanel })),
);

export type { StudyRoomCoViewBridge } from './StudyRoomPanel';

type PanelProps = ComponentProps<(typeof import('./StudyRoomPanel'))['StudyRoomPanel']>;

type Props = PanelProps & {
  /** Keep the chunk mounted after first open so co-view can survive sheet close. */
  keepAlive?: boolean;
};

/**
 * Code-splits Study Room (Yjs / Hocuspocus / Jitsi UI) out of the workspace body chunk.
 * Mounts while the sheet is open, or while keepAlive (active co-view room) is set.
 */
export function StudyRoomPanelLazy({ open, keepAlive = false, ...props }: Props) {
  if (!open && !keepAlive) return null;

  return (
    <Suspense fallback={null}>
      <StudyRoomPanel open={open} {...props} />
    </Suspense>
  );
}
