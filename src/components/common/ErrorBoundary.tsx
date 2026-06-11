import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18n from '../../i18n/config';

/**
 * Heuristic for failed lazy-chunk fetches (stale deploy): Vite/Rollup and the
 * browsers phrase these differently, so match the common shapes by
 * name/message rather than instanceof.
 */
export const isChunkLoadError = (error: Error): boolean => {
  const text = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk [^ ]* failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
    text
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * App-level error boundary with a recovery UI. Without it, a single render
 * error or a failed lazy-chunk fetch (stale deploy) results in a white
 * screen. Class-based on purpose: React only supports error boundaries as
 * class components. Uses the i18n instance directly (no hooks in classes).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // All state is client-side; log for diagnosis, nothing to report upstream.
    console.error('ErrorBoundary caught a render error:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const chunkError = isChunkLoadError(error);

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-trading-dark-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-caution-50 dark:bg-caution-600/25">
            <AlertTriangle className="w-8 h-8 text-caution-600 dark:text-caution-500" />
          </div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white mb-2">
            {i18n.t('safetyRails.errorBoundaryTitle')}
          </h1>
          <p className="text-sm text-ink-600 dark:text-ink-400 mb-6">
            {chunkError
              ? i18n.t('safetyRails.errorBoundaryChunkMessage')
              : i18n.t('safetyRails.errorBoundaryMessage')}
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {i18n.t('safetyRails.errorBoundaryReload')}
          </button>
        </div>
      </div>
    );
  }
}
