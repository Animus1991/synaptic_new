/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { reactNodeToStatusText } from './workspaceStatusBus';

describe('reactNodeToStatusText', () => {
  it('flattens nested text', () => {
    expect(reactNodeToStatusText('hello')).toBe('hello');
    expect(reactNodeToStatusText(['a', ' ', 'b'])).toBe('a b');
  });

  it('reads element children', () => {
    const el = { props: { children: { props: { children: 'Nested warn' } } } };
    expect(reactNodeToStatusText(el as never)).toBe('Nested warn');
  });
});
