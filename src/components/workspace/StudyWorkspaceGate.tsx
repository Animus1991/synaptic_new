import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Signals workspace boot completion once per session key.
 * Heavy lifting is deferred to React.lazy Suspense — no extra rAF gate.
 */
export function StudyWorkspaceGate({
  sessionKey,
  onBootComplete,
  children,
}: {
  sessionKey: string;
  onBootComplete?: () => void;
  children: ReactNode;
  compact?: boolean;
}) {
  const onBootCompleteRef = useRef(onBootComplete);
  onBootCompleteRef.current = onBootComplete;
  const completedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (completedKeyRef.current === sessionKey) return;
    completedKeyRef.current = sessionKey;
    onBootCompleteRef.current?.();
  }, [sessionKey]);

  return children;
}
