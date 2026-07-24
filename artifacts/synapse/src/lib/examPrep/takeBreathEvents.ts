export const TAKE_BREATH_EVENT = 'synapse:take-breath';

export function emitTakeBreathPrompt(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TAKE_BREATH_EVENT));
}

export function subscribeTakeBreathPrompt(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(TAKE_BREATH_EVENT, listener);
  return () => window.removeEventListener(TAKE_BREATH_EVENT, listener);
}
