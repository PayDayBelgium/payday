import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n/config';
import { ErrorBoundary, isChunkLoadError } from './ErrorBoundary';

const Bomb: React.FC<{ error?: Error }> = ({ error }) => {
  throw error ?? new Error('boom');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('renders the recovery fallback with a reload button when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('shows the stale-deploy hint for chunk-load errors', () => {
    const chunkError = new Error('Failed to fetch dynamically imported module: /assets/x.js');
    render(
      <ErrorBoundary>
        <Bomb error={chunkError} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/after an update/i)).toBeInTheDocument();
  });
});

describe('isChunkLoadError', () => {
  it('detects the common lazy-chunk failure shapes', () => {
    const named = new Error('Loading chunk 42 failed.');
    named.name = 'ChunkLoadError';
    expect(isChunkLoadError(named)).toBe(true);
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: x'))).toBe(
      true
    );
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('does not flag ordinary render errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
