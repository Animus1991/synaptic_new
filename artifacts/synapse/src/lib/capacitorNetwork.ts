import { Capacitor } from '@capacitor/core';

/**
 * Bind Capacitor @capacitor/network on native shells — dispatches window
 * online/offline so useOnlineStatus + offlineSyncQueue flush stay in sync.
 */
export function bindCapacitorNetworkStatus(setOnline: (online: boolean) => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let removed = false;
  let listenerRemove: (() => void) | undefined;

  void (async () => {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      if (removed) return;
      setOnline(status.connected);

      const handle = await Network.addListener('networkStatusChange', (next) => {
        setOnline(next.connected);
        window.dispatchEvent(new Event(next.connected ? 'online' : 'offline'));
      });
      listenerRemove = () => {
        void handle.remove();
      };
    } catch {
      // Plugin unavailable — browser events only.
    }
  })();

  return () => {
    removed = true;
    listenerRemove?.();
  };
}
