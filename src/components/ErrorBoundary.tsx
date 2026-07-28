import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** When set, show a dismiss action instead of only full-page reload. */
  onRecover?: () => void;
  /** Remount children without closing the overlay (e.g. retry Study Workspace). */
  onRetry?: () => void;
  /** Fixed full-screen overlay styling (Study Workspace). */
  overlay?: boolean;
  /** When this changes, clear error and remount children (session identity). */
  remountKey?: string | number;
};

type State = { error: Error | null; childGeneration: number };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, childGeneration: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Synapse UI error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.remountKey !== this.props.remountKey && this.state.error) {
      this.setState((s) => ({ error: null, childGeneration: s.childGeneration + 1 }));
    }
  }

  private handleRetry = (): void => {
    this.props.onRetry?.();
    this.setState((s) => ({ error: null, childGeneration: s.childGeneration + 1 }));
  };

  render() {
    if (this.state.error) {
      const { onRecover, overlay } = this.props;
      return (
        <div
          className={
            overlay
              ? 'fixed inset-0 z-[100] flex items-center justify-center p-6 bg-surface-primary/95 backdrop-blur-sm text-text-primary'
              : 'min-h-screen flex items-center justify-center p-6 bg-surface-primary text-text-primary'
          }
        >
          <div className="error-boundary-panel max-w-md w-full rounded-2xl border border-border-subtle bg-surface-card p-6 space-y-4">
            <h1 className="error-boundary-title font-semibold">Something went wrong</h1>
            <p className="error-boundary-body text-text-secondary">
              The app hit an unexpected error. Your progress is stored locally in the browser.
            </p>
            <p className="error-boundary-detail text-text-muted font-mono break-all">{this.state.error.message}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="error-boundary-try-again"
                onClick={this.handleRetry}
                className="error-boundary-btn error-boundary-btn-primary bg-brand-600 hover:bg-brand-500 text-white font-medium"
              >
                Try again
              </button>
              {onRecover && (
                <button
                  type="button"
                  onClick={onRecover}
                  className="error-boundary-btn border border-border-subtle font-medium hover:bg-surface-hover"
                >
                  Close
                </button>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="error-boundary-btn border border-border-subtle font-medium hover:bg-surface-hover"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <Fragment key={this.state.childGeneration}>{this.props.children}</Fragment>;
  }
}
