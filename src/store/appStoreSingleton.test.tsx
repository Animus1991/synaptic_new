/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppStoreProvider, useAppStore } from './useStore';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

/*
 * Regression: `useAppStore` was a plain hook, so every extra call site (Analytics alone had
 * two) built a *separate* store with its own `currentView` and its own window.location.hash
 * sync effects. Those extra copies initialised to the persisted view and immediately wrote
 * their own hash, which yanked the real store back — clicking Analytics landed on Dashboard.
 */
describe('app store is a singleton', () => {
  afterEach(() => {
    cleanup();
  });

  it('a nested consumer navigating is observed by every other consumer', () => {
    function Viewer({ id }: { id: string }) {
      const { currentView } = useAppStore();
      return <span data-testid={id}>{currentView}</span>;
    }
    function Navigator() {
      const { navigate } = useAppStore();
      return (
        <button type="button" onClick={() => navigate('analytics')}>
          go
        </button>
      );
    }

    render(
      <AppStoreProvider>
        <Viewer id="a" />
        <Navigator />
        <Viewer id="b" />
      </AppStoreProvider>,
    );

    expect(screen.getByTestId('a').textContent).toBe(screen.getByTestId('b').textContent);

    fireEvent.click(screen.getByRole('button', { name: 'go' }));

    expect(screen.getByTestId('a').textContent).toBe('analytics');
    expect(screen.getByTestId('b').textContent).toBe('analytics');
  });

  it('a consumer mounting later cannot drag the current view back', () => {
    function Viewer() {
      const { currentView } = useAppStore();
      return <span data-testid="view">{currentView}</span>;
    }
    function LateConsumer() {
      useAppStore();
      return <span data-testid="late" />;
    }
    function Harness() {
      const { navigate, currentView } = useAppStore();
      return (
        <>
          <Viewer />
          <button type="button" onClick={() => navigate('analytics')}>
            go
          </button>
          {currentView === 'analytics' && <LateConsumer />}
        </>
      );
    }

    render(
      <AppStoreProvider>
        <Harness />
      </AppStoreProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'go' }));

    expect(screen.getByTestId('late')).toBeTruthy();
    expect(screen.getByTestId('view').textContent).toBe('analytics');
  });

  it('refuses to run outside the provider instead of minting a second store', () => {
    function Orphan() {
      useAppStore();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/AppStoreProvider/);
  });

  it('the store builder stays private and App mounts the provider', () => {
    const store = read('src/store/useStore.ts');
    expect(store).toMatch(/export function AppStoreProvider/);
    expect(store).toMatch(/\nfunction useAppStoreState\(\)/);
    expect(store).not.toMatch(/export function useAppStoreState/);

    const app = read('src/App.tsx');
    expect(app).toMatch(/<AppStoreProvider>[\s\S]*<AppRoot \/>[\s\S]*<\/AppStoreProvider>/);
  });
});
